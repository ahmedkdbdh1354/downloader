from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .config import settings
from .providers import provider_registry
from .schemas import DownloadRequest, InspectRequest, MediaInfo
from .services import download_media, inspect_media

app = FastAPI(title=settings.app_name, version="1.0.0", description="Automatic multi-platform media inspection API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Length", "X-MediaFlow-Job"],
)


@app.get("/health")
@app.get(f"{settings.api_prefix}/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get(f"{settings.api_prefix}/platforms")
def list_platforms() -> list[dict[str, str]]:
    return [{"key": item.key, "name": item.name, "accent": item.accent} for item in provider_registry.all()]


@app.post(f"{settings.api_prefix}/media/inspect", response_model=MediaInfo)
def inspect(request: InspectRequest) -> MediaInfo:
    return inspect_media(str(request.url))


@app.post(f"{settings.api_prefix}/media/download")
def download(request: DownloadRequest) -> FileResponse:
    job_id, file_path = download_media(str(request.url), request.format_id)
    return FileResponse(
        path=file_path,
        filename=file_path.name,
        media_type="video/mp4",
        headers={"X-MediaFlow-Job": job_id},
    )


@app.get(f"{settings.api_prefix}/downloads/{{job_id}}")
def retrieve_download(job_id: str) -> FileResponse:
    if not job_id.isalnum() or len(job_id) != 32:
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    matches = list(settings.download_dir.resolve().glob(f"{job_id}-*"))
    media_file = next((path for path in matches if path.is_file() and path.suffix.lower() not in {".part", ".ytdl"}), None)
    if media_file is None:
        raise HTTPException(status_code=404, detail="الملف غير موجود أو انتهت صلاحيته")
    return FileResponse(path=media_file, filename=media_file.name, media_type="application/octet-stream")
