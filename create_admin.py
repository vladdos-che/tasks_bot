import asyncio
from db.database import engine, Base, AsyncSessionLocal
from db.models import AdminUser
from api.core.security import get_password_hash

async def create_superadmin():
    async with engine.begin() as conn:
        # Recreate tables to ensure schema is fresh
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as session:
        admin = AdminUser(
            username="admin",
            hashed_password=get_password_hash("admin"),
            is_superadmin=True  # главный администратор
        )
        session.add(admin)
        await session.commit()
        print("Главный администратор создан: логин 'admin', пароль 'admin'")
        print("ВНИМАНИЕ: Обязательно смените пароль после первого входа!")

if __name__ == "__main__":
    asyncio.run(create_superadmin())
