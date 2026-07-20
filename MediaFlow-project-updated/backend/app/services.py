import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit

from imageio_ffmpeg import get_ffmpeg_exe
from fastapi import HTTPException
from yt_dlp import YoutubeDL
from yt_dlp.networking.impersonate import ImpersonateTarget
from yt_dlp.utils import DownloadError

from .config import settings
from .providers import provider_registry
from .schemas import MediaFormat, MediaInfo


COMPATIBLE_VIDEO_CODECS = ("avc1", "h264")
COMPATIBLE_AUDIO_CODECS = ("mp4a", "aac")
TIKTOK_IMPERSONATION_TARGETS = ("chrome", "safari", "edge")
TIKTOK_RETRYABLE_ERRORS = (
    "universal data for rehydration",
    "unable to download webpage",
    "http error 403",
    "challenge",
)


def _runtime_options(url: str) -> dict[str, Any]:
    options: dict[str, Any] = {}
    if settings.ytdlp_proxy_url.strip():
        options["proxy"] = settings.ytdlp_proxy_url.strip()
    return options


def _download_error(exc: DownloadError, fallback: str) -> HTTPException:
    message = str(exc).lower()
    is_transient_challenge = "[tiktok]" in message and any(
        marker in message for marker in TIKTOK_RETRYABLE_ERRORS
    )
    return HTTPException(status_code=503 if is_transient_challenge else 422, detail=fallback)


def _canonical_media_url(url: str) -> str:
    """Remove tracking parameters that can change the TikTok challenge response."""
    if provider_registry.detect(url).key != "tiktok":
        return url
    parsed = urlsplit(url)
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path.rstrip("/"), "", ""))


def _is_retryable_tiktok_error(url: str, exc: DownloadError) -> bool:
    if provider_registry.detect(url).key != "tiktok":
        return False
    message = str(exc).lower()
    return any(marker in message for marker in TIKTOK_RETRYABLE_ERRORS)


def _extract_with_resilience(url: str, options: dict[str, Any], *, download: bool) -> dict[str, Any]:
    """Run yt-dlp and retry TikTok's intermittent browser challenge failures.

    Each retry gets a fresh YoutubeDL session and a different browser TLS
    fingerprint. Other providers keep their existing single-attempt behaviour.
    """
    canonical_url = _canonical_media_url(url)
    targets: tuple[str | None, ...] = (
        TIKTOK_IMPERSONATION_TARGETS
        if provider_registry.detect(canonical_url).key == "tiktok"
        else (None,)
    )
    last_error: DownloadError | None = None

    for index, target in enumerate(targets):
        attempt_options = {**options, **_runtime_options(canonical_url)}
        if target:
            attempt_options["impersonate"] = ImpersonateTarget.from_str(target)
        try:
            with YoutubeDL(attempt_options) as downloader:
                return downloader.extract_info(canonical_url, download=download)
        except DownloadError as exc:
            last_error = exc
            has_more_attempts = index < len(targets) - 1
            if not has_more_attempts or not _is_retryable_tiktok_error(canonical_url, exc):
                raise

    # The loop always returns or raises, but this keeps the return type explicit.
    assert last_error is not None
    raise last_error


def _ensure_supported(url: str) -> None:
    disabled_provider = provider_registry.disabled(url)
    if disabled_provider:
        raise HTTPException(
            status_code=422,
            detail=f"روابط {disabled_provider.name} غير مدعومة حاليًا. استخدم رابطًا من منصة أخرى.",
        )


def _extract_info(url: str) -> dict[str, Any]:
    options = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
        "extract_flat": False,
        "socket_timeout": 30,
        "retries": 3,
        "extractor_retries": 3,
        # Prefer IPv4 for consistent behaviour across local and hosted runtimes.
        "source_address": "0.0.0.0",
    }
    try:
        info = _extract_with_resilience(url, options, download=False)
        if info and info.get("entries"):
            info = next((entry for entry in info["entries"] if entry), info)
        if not info:
            raise ValueError("No media metadata was returned")
        return info
    except DownloadError as exc:
        raise _download_error(
            exc,
            "تعذر قراءة هذا الرابط. تأكد أنه رابط عام ومدعوم ثم حاول مجددًا.",
        ) from exc


def _normalise_formats(info: dict[str, Any]) -> list[MediaFormat]:
    """Return a short list of H.264/AAC MP4 choices that play broadly.

    Some platforms expose video-only and audio-only streams. The opaque IDs below
    mark that case so download_media can merge them into a single compatible MP4.
    """
    best_by_height: dict[int, tuple[dict[str, Any], bool]] = {}
    for item in info.get("formats") or []:
        format_id = item.get("format_id")
        height = item.get("height")
        vcodec = (item.get("vcodec") or "").lower()
        acodec = (item.get("acodec") or "").lower()
        is_mp4_h264 = item.get("ext") == "mp4" and any(codec in vcodec for codec in COMPATIBLE_VIDEO_CODECS)
        if not format_id or not height or not is_mp4_h264:
            continue
        has_audio = acodec != "none" and any(codec in acodec for codec in COMPATIBLE_AUDIO_CODECS)
        existing = best_by_height.get(int(height))
        # A combined MP4 is preferred; otherwise keep the best H.264 video stream.
        if existing is None or (has_audio and not existing[1]) or item.get("tbr", 0) > existing[0].get("tbr", 0):
            best_by_height[int(height)] = (item, has_audio)

    result: list[MediaFormat] = []
    for height in sorted(best_by_height, reverse=True)[:5]:
        item, has_audio = best_by_height[height]
        download_id = f"mp4-combined:{item['format_id']}" if has_audio else f"mp4-video:{item['format_id']}"
        result.append(
            MediaFormat(
                id=download_id,
                label=f"{height}p · MP4",
                extension="mp4",
                kind="combined",
                quality=f"{height}p",
                filesize=item.get("filesize") or item.get("filesize_approx"),
                note="فيديو وصوت متوافقان",
            )
        )
    if not result:
        # Some sites expose a single, already-compatible MP4 without detailed streams.
        result.append(
            MediaFormat(
                id="mp4-auto",
                label="أفضل جودة · MP4",
                extension="mp4",
                kind="combined",
                note="سيتم اختيار ملف MP4 المتوافق تلقائيًا",
            )
        )
    return result


def _format_selector(format_id: str) -> str:
    if format_id == "mp4-auto":
        return "best[ext=mp4][vcodec^=avc1][acodec^=mp4a]/best[ext=mp4]"
    if format_id.startswith("mp4-combined:"):
        return format_id.removeprefix("mp4-combined:")
    if format_id.startswith("mp4-video:"):
        video_id = format_id.removeprefix("mp4-video:")
        return f"{video_id}+bestaudio[ext=m4a][acodec^=mp4a]/{video_id}"
    raise HTTPException(status_code=422, detail="صيغة التنزيل المختارة غير مدعومة.")


def _ffmpeg_location() -> str:
    """imageio-ffmpeg ships a private binary for merging video and audio."""
    # yt-dlp accepts an executable path as well as a directory. imageio-ffmpeg's
    # bundled binary has a versioned filename, so passing its parent directory
    # would make yt-dlp look for a non-existent `ffmpeg.exe`.
    return get_ffmpeg_exe()


def inspect_media(url: str) -> MediaInfo:
    _ensure_supported(url)
    info = _extract_info(url)
    provider = provider_registry.detect(url)
    return MediaInfo(
        source_url=url,
        platform=provider.name,
        platform_key=provider.key,
        title=info.get("title") or "وسائط بدون عنوان",
        thumbnail=info.get("thumbnail"),
        duration=info.get("duration"),
        uploader=info.get("uploader") or info.get("channel") or info.get("creator"),
        formats=_normalise_formats(info),
    )


def download_media(url: str, format_id: str) -> tuple[str, Path]:
    _ensure_supported(url)
    job_id = uuid.uuid4().hex
    target_directory = settings.download_dir.resolve()
    target_directory.mkdir(parents=True, exist_ok=True)
    template = str(target_directory / f"{job_id}-%(title).100B.%(ext)s")
    options = {
        "format": _format_selector(format_id),
        "outtmpl": template,
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "merge_output_format": "mp4",
        "ffmpeg_location": _ffmpeg_location(),
        "restrictfilenames": False,
        "socket_timeout": 30,
        "retries": 3,
        "extractor_retries": 3,
        "source_address": "0.0.0.0",
    }
    try:
        _extract_with_resilience(url, options, download=True)
        produced = sorted(target_directory.glob(f"{job_id}-*"), key=lambda path: path.stat().st_mtime, reverse=True)
        if not produced:
            raise RuntimeError("Download finished without a file")
        media_file = next((path for path in produced if path.suffix.lower() not in {".part", ".ytdl"}), produced[0])
    except DownloadError as exc:
        raise _download_error(
            exc,
            "لم يكتمل التنزيل. قد تكون الجودة غير متاحة أو الرابط مقيدًا.",
        ) from exc

    return job_id, media_file
