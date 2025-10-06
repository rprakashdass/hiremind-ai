import os
from typing import List, Optional
from functools import lru_cache
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    # Database
    database_url: str = os.getenv("DATABASE_URL", "postgresql://hiremind_user:root@localhost:5432/hiremind_db")
    
    # JWT
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # CORS
    backend_cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://hire-mate-ai-green.vercel.app"
    ]
    
    # AI Services
    gemini_api_key: Optional[str] = os.getenv("GEMINI_API_KEY")
    groq_api_key: Optional[str] = os.getenv("GROQ_API_KEY")
    
    # App
    app_name: str = "HireMind AI"
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
