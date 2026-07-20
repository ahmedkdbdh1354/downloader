import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

from imageio_ffmpeg import get_ffmpeg_exe
from fastapi import HTTPException
from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError

from .config import settings
from .providers import provider_registry
from .schemas import MediaFormat, MediaInfo, RecentDownload


history_lock = Lock()
COMPATIBLE_VIDEO_CODECS = ("avc1", "h264")
COMPATIBLE_AUDIO_CODECS = ("mp4a", "aac")


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
        # Prefer an IPv4 connection. This avoids a recurring Windows socket
        # permission failure seen with some YouTube API requests.
        "source_address": "0.0.0.0",
    }
    try:
        with YoutubeDL(options) as downloader:
            info = downloader.extract_info(url, download=False)
        if info and info.get("entries"):
            info = next((entry for entry in info["entries"] if entry), info)
        if not info:
            raise ValueError("No media metadata was returned")
        return info
    except DownloadError as exc:
        raise HTTPException(
            status_code=422,
            detail="تعذر قراءة هذا الرابط. تأكد أنه رابط عام ومدعوم ثم حاول مجددًا.",
        ) from exc


def _normalise_formats(info: dict[str, Any]) -> list[MediaFormat]:
    """Return a short list of H.264/AAC MP4 choices that play broadly.

    Most YouTube resolutions are split into a video-only stream and an audio-only
    stream. The opaque IDs below mark that case so download_media can merge them
    into one MP4 rather than returning the silent video stream to the user.
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


def _read_history() -> list[dict[str, Any]]:
    settings.history_file.parent.mkdir(parents=True, exist_ok=True)
    if not settings.history_file.exists():
        return []
    try:
        return json.loads(settings.history_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []


def get_recent() -> list[RecentDownload]:
    return [RecentDownload.model_validate(item) for item in _read_history()[:10]]


def _save_recent(item: RecentDownload) -> None:
    with history_lock:
        history = _read_history()
        history.insert(0, item.model_dump(mode="json"))
        settings.history_file.write_text(json.dumps(history[:30], ensure_ascii=False, indent=2), encoding="utf-8")


def _safe_stem(title: str) -> str:
    cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", title).strip().rstrip(".")
    return cleaned[:100] or "media"


def download_media(url: str, format_id: str, title: str | None, platform: str | None, thumbnail: str | None) -> tuple[str, Path]:
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
    }
    try:
        with YoutubeDL(options) as downloader:
            info = downloader.extract_info(url, download=True)
            prepared = Path(downloader.prepare_filename(info))
        produced = sorted(target_directory.glob(f"{job_id}-*"), key=lambda path: path.stat().st_mtime, reverse=True)
        if not produced:
            raise RuntimeError("Download finished without a file")
        media_file = next((path for path in produced if path.suffix.lower() not in {".part", ".ytdl"}), produced[0])
    except DownloadError as exc:
        raise HTTPException(status_code=422, detail="لم يكتمل التنزيل. قد تكون الجودة غير متاحة أو الرابط مقيدًا.") from exc

    item = RecentDownload(
        id=job_id,
        title=title or info.get("title") or _safe_stem(prepared.stem),
        platform=platform or provider_registry.detect(url).name,
        thumbnail=thumbnail or info.get("thumbnail"),
        format_label=format_id,
        created_at=datetime.now(timezone.utc),
    )
    _save_recent(item)
    return job_id, media_file
