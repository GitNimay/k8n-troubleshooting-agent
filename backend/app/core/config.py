from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "AI Kubernetes Agent"
    openrouter_api_key: str = ""
    openrouter_model: str = ""
    kubeconfig_path: str = ""
    insforge_base_url: str = ""
    frontend_origin: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [self.frontend_origin]


settings = Settings()
