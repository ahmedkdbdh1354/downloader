from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, Field


class InspectRequest(BaseModel):
    url: AnyHttpUrl


class MediaFormat(BaseModel):
    id: str
    label: str
    extension: str | None = None
    kind: Literal["video", "audio", "combined"]
    quality: str | None = None
    filesize: int | None = None
    note: str | None = None


class MediaInfo(BaseModel):
    source_url: str
    platform: str
    platform_key: str
    title: str
    thumbnail: str | None = None
    # Some extractors (notably X) return fractional-second durations.
    duration: float | None = None
    uploader: str | None = None
    formats: list[MediaFormat]


class DownloadRequest(BaseModel):
    url: AnyHttpUrl
    format_id: str = Field(min_length=1, max_length=100)


class DownloadResponse(BaseModel):
    id: str
    filename: str
    download_url: str
