import asyncio

from backend.models import price, alert, advisory  # noqa: F401  (register tables with SQLModel.metadata)
from backend.database import create_db_and_tables


async def main() -> None:
    await create_db_and_tables()
    print("Tables created.")


if __name__ == "__main__":
    asyncio.run(main())
