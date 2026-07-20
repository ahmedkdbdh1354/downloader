from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]

class Settings(BaseSettings):
    app_name: str = "MediaFlow API"
    api_prefix: str = "/api/v1"
    # Accept both common local Vite origins. Production deployments should set
    # this explicitly through ALLOWED_ORIGINS rather than relying on this default.
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    download_dir: Path = BACKEND_ROOT / "data/downloads"
    history_file: Path = BACKEND_ROOT / "data/recent.json"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.allowed_origins.split(",") if item.strip()]


settings = Settings()
