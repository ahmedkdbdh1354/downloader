import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = Path("/tmp/mediaflow") if os.getenv("VERCEL") else BACKEND_ROOT / "data"

class Settings(BaseSettings):
    app_name: str = "MediaFlow API"
    api_prefix: str = "/api/v1"
    # Accept both common local Vite origins. Production deployments should set
    # this explicitly through ALLOWED_ORIGINS rather than relying on this default.
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    download_dir: Path = DATA_ROOT / "downloads"
    history_file: Path = DATA_ROOT / "recent.json"
    # Optional server-side YouTube credentials. Keep these in deployment
    # environment variables; never commit cookie data to the repository.
    youtube_cookies_base64: str = ""
    ytdlp_proxy_url: str = ""
    pot_provider_url: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.allowed_origins.split(",") if item.strip()]


settings = Settings()
