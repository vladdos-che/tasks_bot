from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from db.database import get_db
from db.models import AdminUser
from api import schemas
from api.core.deps import get_current_admin_user
from api.core.security import get_password_hash

router = APIRouter()


def require_superadmin(current_admin: AdminUser):
    """Вызывает 403, если текущий пользователь не суперадмин."""
    if not current_admin.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только главный администратор может выполнять это действие"
        )


@router.get("", response_model=List[schemas.AdminUserOut])
async def get_admins(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(select(AdminUser))
    return result.scalars().all()


@router.post("", response_model=schemas.AdminUserOut)
async def create_admin(
    admin_in: schemas.AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    require_superadmin(current_admin)

    result = await db.execute(select(AdminUser).where(AdminUser.username == admin_in.username))
    existing_admin = result.scalars().first()
    if existing_admin:
        raise HTTPException(status_code=400, detail="Username already registered")

    new_admin = AdminUser(
        username=admin_in.username,
        hashed_password=get_password_hash(admin_in.password),
        is_superadmin=False  # новые всегда обычные
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)
    return new_admin


@router.put("/{admin_id}", response_model=schemas.AdminUserOut)
async def update_admin_password(
    admin_id: int,
    admin_in: schemas.AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    # Обычный админ может менять только свой пароль
    if not current_admin.is_superadmin and current_admin.id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы можете менять только свой пароль"
        )

    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin_user = result.scalars().first()
    if not admin_user:
        raise HTTPException(status_code=404, detail="Admin not found")

    admin_user.hashed_password = get_password_hash(admin_in.password)

    await db.commit()
    await db.refresh(admin_user)
    return admin_user


@router.delete("/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin(
    admin_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    require_superadmin(current_admin)

    if current_admin.id == admin_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin_user = result.scalars().first()
    if not admin_user:
        raise HTTPException(status_code=404, detail="Admin not found")

    await db.delete(admin_user)
    await db.commit()
