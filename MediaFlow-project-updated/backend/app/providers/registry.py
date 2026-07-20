from .base import PlatformProvider


class ProviderRegistry:
    """Central registry: add a provider here without touching extraction code."""

    def __init__(self) -> None:
        self._providers = (
            PlatformProvider("tiktok", "TikTok", ("tiktok.com",), "#20d5ec"),
            PlatformProvider("instagram", "Instagram", ("instagram.com",), "#e1306c"),
            PlatformProvider("facebook", "Facebook", ("facebook.com", "fb.watch"), "#1877f2"),
            PlatformProvider("x", "X / Twitter", ("x.com", "twitter.com"), "#111827"),
            PlatformProvider("vimeo", "Vimeo", ("vimeo.com",), "#1ab7ea"),
            PlatformProvider("soundcloud", "SoundCloud", ("soundcloud.com",), "#ff5500"),
        )
        self._disabled_providers = (
            PlatformProvider(
                "youtube",
                "YouTube",
                ("youtube.com", "youtu.be", "youtube-nocookie.com", "googlevideo.com"),
                "#ff0033",
            ),
        )
        self._fallback = PlatformProvider("web", "رابط ويب", tuple(), "#64748b")

    def detect(self, url: str) -> PlatformProvider:
        return next((provider for provider in self._providers if provider.matches(url)), self._fallback)

    def all(self) -> tuple[PlatformProvider, ...]:
        return self._providers

    def disabled(self, url: str) -> PlatformProvider | None:
        return next((provider for provider in self._disabled_providers if provider.matches(url)), None)


provider_registry = ProviderRegistry()
