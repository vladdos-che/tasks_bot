from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from pydantic import BaseModel
import os
import shutil
from datetime import datetime

from api.core.deps import get_current_admin_user
from db.models import AdminUser

router = APIRouter()

BACKUPS_DIR = "backups"
DB_FILE = "schedule.sqlite3"

class BackupItem(BaseModel):
    filename: str
    size: int
    created_at: str

@router.get("", response_model=List[BackupItem])
async def list_backups(current_admin: AdminUser = Depends(get_current_admin_user)):
    if not os.path.exists(BACKUPS_DIR):
        os.makedirs(BACKUPS_DIR)
        
    backups = []
    for filename in os.listdir(BACKUPS_DIR):
        if filename.endswith(".sqlite3"):
            filepath = os.path.join(BACKUPS_DIR, filename)
            stat = os.stat(filepath)
            backups.append(BackupItem(
                filename=filename,
                size=stat.st_size,
                created_at=datetime.fromtimestamp(stat.st_mtime).isoformat()
            ))
    # Sort by creation time descending
    backups.sort(key=lambda x: x.created_at, reverse=True)
    return backups

@router.post("", response_model=BackupItem)
async def create_backup(current_admin: AdminUser = Depends(get_current_admin_user)):
    if not os.path.exists(BACKUPS_DIR):
        os.makedirs(BACKUPS_DIR)
        
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"schedule_{timestamp}.sqlite3"
    filepath = os.path.join(BACKUPS_DIR, filename)
    
    if not os.path.exists(DB_FILE):
        raise HTTPException(status_code=404, detail="Main database file not found")
        
    try:
        shutil.copy2(DB_FILE, filepath)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create backup: {str(e)}")
        
    stat = os.stat(filepath)
    return BackupItem(
        filename=filename,
        size=stat.st_size,
        created_at=datetime.fromtimestamp(stat.st_mtime).isoformat()
    )

@router.post("/{filename}/restore")
async def restore_backup(filename: str, current_admin: AdminUser = Depends(get_current_admin_user)):
    filepath = os.path.join(BACKUPS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Backup file not found")
        
    try:
        shutil.copy2(filepath, DB_FILE)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restore backup: {str(e)}")
        
    return {"message": "Database restored successfully"}

@router.delete("/{filename}")
async def delete_backup(filename: str, current_admin: AdminUser = Depends(get_current_admin_user)):
    filepath = os.path.join(BACKUPS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Backup file not found")
        
    try:
        os.remove(filepath)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete backup: {str(e)}")
        
    return {"message": "Backup deleted successfully"}
