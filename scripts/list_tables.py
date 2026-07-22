import asyncio

from sqlalchemy import text

from backend.database import engine


async def main() -> None:
    async with engine.begin() as conn:
        result = await conn.execute(
            text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
        )
        for row in result:
            print(row[0])
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
