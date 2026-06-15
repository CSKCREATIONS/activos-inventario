from fastapi import APIRouter, Depends
from models.solicitante import get_all_solicitantes
from dependencies import get_current_user

router = APIRouter()

@router.get("")
async def listar_solicitantes(current_user: dict = Depends(get_current_user)):
    items = await get_all_solicitantes()
    return {"data": items}