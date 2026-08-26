"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # App
    app_name: str = "MAHALO3 Backend"
    debug: bool = False

    # Database
    database_url: str = "sqlite:///./mahalo3.db"

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60

    # CORS
    cors_origins: str = "http://localhost:3000"

    # OpenAI
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"

    # Mock Services
    mock_jira_url: str = "http://localhost:5001"
    mock_confluence_url: str = "http://localhost:5002"
    mock_github_url: str = "http://localhost:5003"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
