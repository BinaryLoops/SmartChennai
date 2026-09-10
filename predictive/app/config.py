import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Use environment variables, fallback to local defaults
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/smartchennai")
    PORT = int(os.getenv("PORT", "8000"))

settings = Settings()
