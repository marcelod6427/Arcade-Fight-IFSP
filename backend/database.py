import os
import psycopg2
import psycopg2.extras
import psycopg2.errors

DATABASE_URL = os.getenv("DATABASE_URL", "")


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS jogadores (
            id SERIAL PRIMARY KEY,
            nick TEXT UNIQUE NOT NULL,
            senha_hash TEXT NOT NULL,
            vitorias INTEGER DEFAULT 0,
            pontos INTEGER DEFAULT 0,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS salas (
            id TEXT PRIMARY KEY,
            modo TEXT NOT NULL,
            jogador1_id INTEGER,
            jogador2_id INTEGER,
            token_j1 TEXT,
            token_j2 TEXT,
            status TEXT DEFAULT 'aguardando',
            criada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (jogador1_id) REFERENCES jogadores(id),
            FOREIGN KEY (jogador2_id) REFERENCES jogadores(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS partidas (
            id SERIAL PRIMARY KEY,
            sala_id TEXT,
            modo TEXT NOT NULL,
            jogador1_id INTEGER NOT NULL,
            jogador2_id INTEGER,
            vencedor_id INTEGER NOT NULL,
            pontos_j1 INTEGER DEFAULT 0,
            pontos_j2 INTEGER DEFAULT 0,
            jogada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sala_id) REFERENCES salas(id),
            FOREIGN KEY (jogador1_id) REFERENCES jogadores(id),
            FOREIGN KEY (jogador2_id) REFERENCES jogadores(id),
            FOREIGN KEY (vencedor_id) REFERENCES jogadores(id)
        )
    """)

    conn.commit()
    conn.close()


# Jogadores --------------------------------------------------------

def criar_jogador(nick: str, senha_hash: str) -> bool:
    conn = get_conn()
    try:
        c = conn.cursor()
        c.execute(
            "INSERT INTO jogadores (nick, senha_hash) VALUES (%s, %s)",
            (nick.strip(), senha_hash)
        )
        conn.commit()
        return True
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return False
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def buscar_jogador_nick(nick: str):
    conn = get_conn()
    try:
        c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        c.execute("SELECT * FROM jogadores WHERE nick = %s", (nick,))
        row = c.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def buscar_jogador_id(jogador_id: int):
    conn = get_conn()
    try:
        c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        c.execute("SELECT * FROM jogadores WHERE id = %s", (jogador_id,))
        row = c.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def listar_placar(limit: int = 20):
    conn = get_conn()
    try:
        c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        c.execute(
            "SELECT nick, vitorias, pontos FROM jogadores "
            "ORDER BY pontos DESC, vitorias DESC LIMIT %s",
            (limit,)
        )
        return [dict(r) for r in c.fetchall()]
    finally:
        conn.close()


def atualizar_stats(jogador_id: int, pontos: int, vitoria: bool):
    conn = get_conn()
    try:
        c = conn.cursor()
        if vitoria:
            c.execute(
                "UPDATE jogadores SET pontos = pontos + %s, vitorias = vitorias + 1 WHERE id = %s",
                (pontos, jogador_id)
            )
        else:
            c.execute(
                "UPDATE jogadores SET pontos = pontos + %s WHERE id = %s",
                (pontos, jogador_id)
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# Salas ------------------------------------------------------------

def criar_sala(sala_id: str, modo: str):
    conn = get_conn()
    try:
        c = conn.cursor()
        c.execute(
            "INSERT INTO salas (id, modo) VALUES (%s, %s)",
            (sala_id, modo)
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def buscar_sala(sala_id: str):
    conn = get_conn()
    try:
        c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        c.execute("SELECT * FROM salas WHERE id = %s", (sala_id,))
        row = c.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def entrar_sala(sala_id: str, jogador_id: int, token: str):
    conn = get_conn()
    try:
        c = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        c.execute("SELECT * FROM salas WHERE id = %s", (sala_id,))
        sala = c.fetchone()

        if not sala:
            return None

        sala = dict(sala)

        # Evita duplicacao
        if sala["jogador1_id"] == jogador_id:
            return 1
        if sala["jogador2_id"] == jogador_id:
            return 2

        cu = conn.cursor()

        if sala["jogador1_id"] is None:
            cu.execute(
                "UPDATE salas SET jogador1_id = %s, token_j1 = %s WHERE id = %s",
                (jogador_id, token, sala_id)
            )
            slot = 1
            if sala["modo"] == "single":
                cu.execute(
                    "UPDATE salas SET status = 'pronto' WHERE id = %s",
                    (sala_id,)
                )

        elif sala["jogador2_id"] is None and sala["modo"] == "multi":
            cu.execute(
                "UPDATE salas SET jogador2_id = %s, token_j2 = %s, status = 'pronto' WHERE id = %s",
                (jogador_id, token, sala_id)
            )
            slot = 2

        else:
            return None

        conn.commit()
        return slot
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def atualizar_status_sala(sala_id: str, status: str):
    conn = get_conn()
    try:
        c = conn.cursor()
        c.execute("UPDATE salas SET status = %s WHERE id = %s", (status, sala_id))
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def cancelar_sala(sala_id: str):
    conn = get_conn()
    try:
        c = conn.cursor()
        c.execute("DELETE FROM salas WHERE id = %s", (sala_id,))
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# Partidas ---------------------------------------------------------

def registrar_partida(sala_id: str, modo: str, j1_id: int, j2_id,
                      vencedor_id: int, pts_j1: int, pts_j2: int):
    conn = get_conn()
    try:
        c = conn.cursor()
        c.execute(
            """INSERT INTO partidas
               (sala_id, modo, jogador1_id, jogador2_id, vencedor_id, pontos_j1, pontos_j2)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (sala_id, modo, j1_id, j2_id, vencedor_id, pts_j1, pts_j2)
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
