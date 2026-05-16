// api.js - Comunicacao com o backend FastAPI

// Em Electron com nodeIntegration=true, process.env esta disponivel.
// Defina RENDER_URL no ambiente antes de iniciar o Electron para apontar
// ao backend do Render em producao. Em dev, usa localhost.
const API_BASE = (typeof process !== 'undefined' && process.env.RENDER_URL)
  ? process.env.RENDER_URL.replace(/\/$/, '')
  : 'http://localhost:8000';

const Api = {

  get baseUrl() { return API_BASE; },

  // Auth -----------------------------------------------------

  async cadastro(nick, senha) {
    return _post('/auth/cadastro', { nick, senha });
  },

  async login(nick, senha) {
    return _post('/auth/login', { nick, senha });
  },

  // Salas ----------------------------------------------------

  async criarSala(modo) {
    return _post('/sala/criar', { modo });
  },

  async statusSala(salaId) {
    return _get(`/sala/${salaId}`);
  },

  async entrarSala(salaId, token) {
    return _post(`/sala/${salaId}/entrar`, { token });
  },

  async cancelarSala(salaId) {
    return _delete(`/sala/${salaId}`);
  },

  // Resultado ------------------------------------------------

  async registrarResultado(salaId, tokenVencedor, pontosJ1, pontosJ2 = 0) {
    return _post('/partida/resultado', {
      sala_id: salaId,
      token:   tokenVencedor,
      pontos_j1: pontosJ1,
      pontos_j2: pontosJ2
    });
  },

  // Placar ---------------------------------------------------

  async placar() {
    return _get('/placar');
  },

  async placarQR() {
    return _get('/placar/qr');
  },

  // Verifica conectividade com o backend (timeout 3s)
  async verificarConexao() {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(API_BASE + '/', { signal: controller.signal });
      clearTimeout(tid);
      return res.ok;
    } catch {
      return false;
    }
  }
};

// Helpers internos ---------------------------------------------

async function _get(rota) {
  try {
    const res  = await fetch(API_BASE + rota);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    return { ok: true, ...data };
  } catch (e) {
    console.error('[API GET]', rota, e.message);
    return { ok: false, erro: e.message };
  }
}

async function _post(rota, body) {
  try {
    const res = await fetch(API_BASE + rota, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    return { ok: true, ...data };
  } catch (e) {
    console.error('[API POST]', rota, e.message);
    return { ok: false, erro: e.message };
  }
}

async function _delete(rota) {
  try {
    const res  = await fetch(API_BASE + rota, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    return { ok: true, ...data };
  } catch (e) {
    console.error('[API DELETE]', rota, e.message);
    return { ok: false, erro: e.message };
  }
}

window.Api = Api;
