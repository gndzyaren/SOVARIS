from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    openai_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "mistral"
    complexity_threshold: float = 0.7
    openai_daily_token_limit: int = 40000
    chroma_persist_dir: str = "./data/vector_store"
    app_env: str = "development"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
