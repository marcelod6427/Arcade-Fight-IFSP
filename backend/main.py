import uuid
import os
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from passlib.context import CryptContext
from jose import JWTError, jwt

from dotenv import load_dotenv
load_dotenv()

import database as db
from qrcode_service import gerar_qr_base64

import warnings
warnings.filterwarnings("ignore")

# Config -----------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "arcade-fight-secret-key-trocar-em-producao")
APP_URL    = os.getenv("APP_URL", "http://localhost:8000").rstrip("/")
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(title="Arcade Fight API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SITE_DIR = os.path.join(os.path.dirname(__file__), "site")
if os.path.exists(SITE_DIR):
    app.mount("/site", StaticFiles(directory=SITE_DIR), name="site")

db.init_db()


# Helpers ----------------------------------------------------------

def hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)


def verificar_senha(senha: str, hashed: str) -> bool:
    return pwd_context.verify(senha, hashed)


def criar_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def obter_jogador_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        nick: str = payload.get("sub")
        if nick is None:
            return None
        return db.buscar_jogador_nick(nick)
    except JWTError:
        return None


# Schemas ----------------------------------------------------------

class CadastroSchema(BaseModel):
    nick: str
    senha: str


class LoginSchema(BaseModel):
    nick: str
    senha: str


class CriarSalaSchema(BaseModel):
    modo: str  # "single" ou "multi"


class EntrarSalaSchema(BaseModel):
    token: str


class ResultadoSchema(BaseModel):
    sala_id: str
    token: str
    pontos_j1: int
    pontos_j2: int = 0


# Auth -------------------------------------------------------------

@app.post("/auth/cadastro")
def cadastro(dados: CadastroSchema):
    if len(dados.nick.strip()) < 3:
        raise HTTPException(400, "Nick deve ter pelo menos 3 caracteres")
    if len(dados.senha) < 4:
        raise HTTPException(400, "Senha deve ter pelo menos 4 caracteres")

    hashed = hash_senha(dados.senha)
    ok = db.criar_jogador(dados.nick.strip(), hashed)
    if not ok:
        raise HTTPException(400, "Nick ja cadastrado")

    token = criar_token({"sub": dados.nick.strip()})
    return {"ok": True, "token": token, "nick": dados.nick.strip()}


@app.post("/auth/login")
def login(dados: LoginSchema):
    jogador = db.buscar_jogador_nick(dados.nick.strip())
    if not jogador or not verificar_senha(dados.senha, jogador["senha_hash"]):
        raise HTTPException(401, "Nick ou senha incorretos")

    token = criar_token({"sub": jogador["nick"]})
    return {
        "ok": True,
        "token": token,
        "nick": jogador["nick"],
        "vitorias": jogador["vitorias"],
        "pontos": jogador["pontos"]
    }


# Salas ------------------------------------------------------------

@app.post("/sala/criar")
def criar_sala(dados: CriarSalaSchema):
    if dados.modo not in ("single", "multi"):
        raise HTTPException(400, "Modo invalido. Use 'single' ou 'multi'")

    sala_id = str(uuid.uuid4())[:8].upper()
    db.criar_sala(sala_id, dados.modo)

    url_mobile = f"{APP_URL}/site/login.html?sala={sala_id}&modo={dados.modo}"
    qr_base64  = gerar_qr_base64(url_mobile)

    return {
        "ok": True,
        "sala_id": sala_id,
        "modo": dados.modo,
        "url_mobile": url_mobile,
        "qr_base64": qr_base64
    }


@app.get("/sala/{sala_id}")
def status_sala(sala_id: str):
    sala = db.buscar_sala(sala_id)
    if not sala:
        raise HTTPException(404, "Sala nao encontrada")

    j1 = db.buscar_jogador_id(sala["jogador1_id"]) if sala["jogador1_id"] else None
    j2 = db.buscar_jogador_id(sala["jogador2_id"]) if sala["jogador2_id"] else None

    return {
        "sala_id": sala_id,
        "modo": sala["modo"],
        "status": sala["status"],
        "jogador1": {"nick": j1["nick"], "id": j1["id"], "token": sala["token_j1"]} if j1 else None,
        "jogador2": {"nick": j2["nick"], "id": j2["id"], "token": sala["token_j2"]} if j2 else None,
    }


@app.post("/sala/{sala_id}/entrar")
def entrar_sala_endpoint(sala_id: str, dados: EntrarSalaSchema):
    jogador = obter_jogador_token(dados.token)
    if not jogador:
        raise HTTPException(401, "Token invalido")

    sala = db.buscar_sala(sala_id)
    if not sala:
        raise HTTPException(404, "Sala nao encontrada")
    if sala["status"] == "em_jogo":
        raise HTTPException(400, "Partida ja em andamento")
    if sala["status"] == "finalizado":
        raise HTTPException(400, "Sala ja encerrada")

    slot = db.entrar_sala(sala_id, jogador["id"], dados.token)
    if slot is None:
        raise HTTPException(400, "Sala cheia")

    sala_atualizada = db.buscar_sala(sala_id)
    return {
        "ok": True,
        "slot": slot,
        "nick": jogador["nick"],
        "status": sala_atualizada["status"],
        "token": dados.token
    }


@app.delete("/sala/{sala_id}")
def cancelar_sala_endpoint(sala_id: str):
    sala = db.buscar_sala(sala_id)
    if not sala:
        return {"ok": True, "msg": "Sala ja inexistente"}
    db.cancelar_sala(sala_id)
    return {"ok": True, "msg": "Sala cancelada"}


# Resultado --------------------------------------------------------

@app.post("/partida/resultado")
def registrar_resultado(dados: ResultadoSchema):
    vencedor = obter_jogador_token(dados.token)
    if not vencedor:
        raise HTTPException(401, "Token invalido")

    sala = db.buscar_sala(dados.sala_id)
    if not sala:
        raise HTTPException(404, "Sala nao encontrada")

    j1_id = sala["jogador1_id"]
    j2_id = sala["jogador2_id"]

    if vencedor["id"] == j1_id:
        perdedor_id   = j2_id
        pts_vencedor  = dados.pontos_j1
        pts_perdedor  = dados.pontos_j2
    else:
        perdedor_id   = j1_id
        pts_vencedor  = dados.pontos_j2
        pts_perdedor  = dados.pontos_j1

    db.atualizar_stats(vencedor["id"], pts_vencedor, vitoria=True)
    if perdedor_id:
        db.atualizar_stats(perdedor_id, pts_perdedor, vitoria=False)

    db.registrar_partida(
        dados.sala_id, sala["modo"],
        j1_id, j2_id,
        vencedor["id"],
        dados.pontos_j1, dados.pontos_j2
    )
    db.atualizar_status_sala(dados.sala_id, "finalizado")

    return {"ok": True, "vencedor": vencedor["nick"], "pontos_ganhos": pts_vencedor}


# Placar -----------------------------------------------------------

@app.get("/placar")
def buscar_placar():
    ranking = db.listar_placar(limit=20)
    return {"ok": True, "ranking": ranking}


@app.get("/placar/qr")
def placar_qr():
    url_placar = f"{APP_URL}/site/placar.html"
    qr_base64  = gerar_qr_base64(url_placar)
    return {"ok": True, "url": url_placar, "qr_base64": qr_base64}


# Index ------------------------------------------------------------

@app.get("/")
def root():
    return {
        "status": "Arcade Fight API rodando!",
        "docs":   f"{APP_URL}/docs",
        "placar": f"{APP_URL}/site/placar.html"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
