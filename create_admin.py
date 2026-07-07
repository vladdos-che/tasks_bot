import asyncio
from db.database import engine, Base, AsyncSessionLocal
from db.models import AdminUser
from api.core.security import get_password_hash

async def create_superadmin():
    confirm = input(
        "⚠️  ВНИМАНИЕ: Эта операция УДАЛИТ ВСЕ данные из базы!\n"
        "Введите 'ДА' для подтверждения: "
    )
    if confirm.strip() != "ДА":
        print("Отменено.")
        return

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as session:
        admin = AdminUser(
            username="admin",
            hashed_password=get_password_hash("admin"),
            is_superadmin=True
        )
        session.add(admin)
        await session.commit()
        print("База пересоздана. Администратор создан: логин 'admin', пароль 'admin'")
        print("ВНИМАНИЕ: Обязательно смените пароль после первого входа!")

if __name__ == "__main__":
    asyncio.run(create_superadmin())

