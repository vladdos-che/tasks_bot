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
    async with engine.begin() as conn:
        # This command will create tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    """Dependency function to get an async session for FastAPI."""
    async with AsyncSessionLocal() as session:
        yield session

def get_session():
    """Dependency function to get an async session manually."""
    return AsyncSessionLocal()
