from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from db.database import get_db
from db.models import Role, AdminUser, RoleTaskMatrix
from api import schemas
from api.core.deps import get_current_admin_user

router = APIRouter()

@router.get("", response_model=list[schemas.RoleOut])
async def get_roles(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(select(Role))
    return result.scalars().all()

@router.post("", response_model=schemas.RoleOut)
async def create_role(
    role_in: schemas.RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    new_role = Role(name=role_in.name)
    db.add(new_role)
    try:
        await db.commit()
        await db.refresh(new_role)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Role may already exist")
    return new_role

class MatrixUpdate(BaseModel):
    role_id: int
    task_id: int
    enabled: bool

@router.post("/matrix")
async def update_matrix(
    update_in: MatrixUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    # This matrix links Role and Task. 
    # Notice: the TZ asked for RoleTaskMatrix. In models it has user_id, role_id, task_id.
    # If we link Role and Task, user_id is null.
    result = await db.execute(
        select(RoleTaskMatrix)
        .where(RoleTaskMatrix.role_id == update_in.role_id)
        .where(RoleTaskMatrix.task_id == update_in.task_id)
    )
    entry = result.scalars().first()
    
    if update_in.enabled and not entry:
        new_entry = RoleTaskMatrix(role_id=update_in.role_id, task_id=update_in.task_id)
        db.add(new_entry)
    elif not update_in.enabled and entry:
        await db.delete(entry)
        
    await db.commit()
    return {"status": "ok"}

@router.get("/matrix")
async def get_matrix(
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(select(RoleTaskMatrix))
    entries = result.scalars().all()
    return [{"role_id": e.role_id, "task_id": e.task_id} for e in entries]

@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    await db.delete(role)
    await db.commit()
