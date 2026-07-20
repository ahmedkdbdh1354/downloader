from dataclasses import dataclass
from urllib.parse import urlparse


@dataclass(frozen=True)
class PlatformProvider:
    """Describes a URL family; extraction remains delegated to yt-dlp."""

    key: str
    name: str
    domains: tuple[str, ...]
    accent: str

    def matches(self, url: str) -> bool:
        hostname = (urlparse(url).hostname or "").lower()
        return any(hostname == domain or hostname.endswith(f".{domain}") for domain in self.domains)

