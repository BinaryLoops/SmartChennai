import asyncpg
from app.config import settings

class Database:
    def __init__(self):
        self.pool = None

    async def connect(self):
        if not self.pool:
            try:
                self.pool = await asyncpg.create_pool(dsn=settings.DATABASE_URL, min_size=1, max_size=10)
                print("Connected to PostgreSQL")
            except Exception as e:
                print(f"Failed to connect to PostgreSQL: {e}")

    async def disconnect(self):
        if self.pool:
            await self.pool.close()
            print("Disconnected from PostgreSQL")

    async def fetch(self, query: str, *args):
        if not self.pool:
            await self.connect()
        if self.pool:
            async with self.pool.acquire() as conn:
                return await conn.fetch(query, *args)
        return []

db = Database()
