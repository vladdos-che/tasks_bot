import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

# Database configuration
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///schedule.sqlite3"

# Create the asynchronous engine
engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=False)

# Create the async session maker
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Create the declarative base class
Base = declarative_base()

async def init_db():
    """Initializes the database tables."""
    # Import all models so Base.metadata knows about every table.
    # This guarantees create_all will create ALL tables even on a fresh DB.
    import db.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    """Dependency function to get an async session for FastAPI."""
    async with AsyncSessionLocal() as session:
        yield session

def get_session():
    """Dependency function to get an async session manually."""
    return AsyncSessionLocal()
