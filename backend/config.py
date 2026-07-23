import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
GROQ_API_KEY: str = os.environ["GROQ_API_KEY"]

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/agrisentinel",
)
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

APP_ENV: str = os.getenv("APP_ENV", "development")
