// game.js - Logica principal do Arcade Fight
// Canvas 1280x720, fisica, combate, IA, integracao com backend

// Constantes -------------------------------------------------------
const W = 1280, H = 720;
const CHAO = H - 130;
const GRAVIDADE = 0.55;
const PULO_FORCA = -14;

// Caminho dos sprites - usa __dirname para portabilidade
const SPRITES_PATH = (() => {
  try {
    const path = require('path');
    return path.join(__dirname, '..', 'sprites');
  } catch (e) {
    return './sprites';
  }
})();

const MULTI_DIFICULDADE = { facil: 1, medio: 1.5, dificil: 2.5 };

// Estado global ---------------------------------------------------
let canvas, ctx;
let spriteManager;
let gameState = 'LOADING';
// Estados: LOADING | TELA_INICIAL | SELECT | COUNTDOWN |
//          FIGHTING | ROUND_END | GAME_OVER

let salaId      = null;
let salaToken   = null;   // token JWT do P1 (usado para registrar resultado em single)
let salaTokenP2 = null;   // token JWT do P2 (multi)
let salaModo    = null;   // 'single' | 'multi'

let nickP1 = 'P1';
let nickP2 = 'P2';

// Rounds
let roundAtual = 1;
let maxRounds  = 3;
let vitorias   = [0, 0];

let dificuldadeIA = 'medio';

let fighters  = [];
let projeteis = [];

let countdownVal   = 5;
let countdownTimer = 0;
let roundEndTimer  = 0;

// Selecao de personagens -----------------------------------------
let selecao = {
  cursor: [0, 1],
  escolhido: [null, null]
};

// ────────────────────────────────────────────────────────────
// Classe Fighter
// ────────────────────────────────────────────────────────────
class Fighter {
  constructor(playerIndex, personagemId, x) {
    const def = PERSONAGENS_DEF[personagemId];
    this.player      = playerIndex;
    this.personagem  = personagemId;
    this.def         = def;
    this.nome        = 'Jogador';

    this.x = x;
    this.y = CHAO;
    this.vx = 0;
    this.vy = 0;
    this.w = 80;
    this.h = 120;

    this.hp    = def.hp;
    this.maxHp = def.hp;
    this.speed = def.velocidade;

    this.noChao    = true;
    this.virado    = playerIndex === 1;
    this.bloqueando = false;

    this.state    = 'IDLE';
    this.animState = { nome: 'IDLE', frame: 0, timer: 0 };

    this.atacando        = false;
    this.ataqueTick      = 0;
    this.hitboxAtiva     = false;
    this.invencivel      = false;
    this.invincivelTimer = 0;
    this.especialCd      = 0;
    this.counterWindow   = 0;
    this.stunTimer       = 0;

    this.pontos = 0;
    this.morreu = false;
  }

  get hitbox() {
    return { x: this.x, y: this.y - this.h, w: this.w, h: this.h };
  }

  get hitboxAtaque() {
    return {
      x: this.virado ? this.x - 70 : this.x + this.w,
      y: this.y - this.h * 0.8,
      w: 70,
      h: this.h * 0.6
    };
  }

  update(input, inimigo, deltaMs) {
    if (this.morreu) return;

    if (this.stunTimer > 0) {
      this.stunTimer -= deltaMs;
      spriteManager.tickAnim(this.animState, deltaMs);
      this.vy += GRAVIDADE;
      this.y += this.vy;
      if (this.y >= CHAO) { this.y = CHAO; this.vy = 0; this.noChao = true; }
      return;
    }

    if (this.especialCd > 0) this.especialCd -= deltaMs;
    if (this.invincivelTimer > 0) {
      this.invincivelTimer -= deltaMs;
      if (this.invincivelTimer <= 0) this.invencivel = false;
    }
    if (this.counterWindow > 0) this.counterWindow -= deltaMs;

    // Ataque em andamento ----------------------------------
    if (this.atacando) {
      this.ataqueTick -= deltaMs;
      if (this.ataqueTick <= 0) {
        this.atacando    = false;
        this.hitboxAtiva = false;
        this.state = 'IDLE';
      }
      this.vy += GRAVIDADE;
      this.y += this.vy;
      if (this.y >= CHAO) { this.y = CHAO; this.vy = 0; this.noChao = true; }
      spriteManager.tickAnim(this.animState, deltaMs);
      return;
    }

    // Movimento horizontal ---------------------------------
    let movendo = false;
    this.bloqueando = false;

    if (input.left) {
      this.vx = -this.speed;
      this.virado = true;
      movendo = true;
    } else if (input.right) {
      this.vx = this.speed;
      this.virado = false;
      movendo = true;
    } else {
      this.vx *= 0.7;
      if (Math.abs(this.vx) < 0.3) this.vx = 0;
    }

    // Defender (b2)
    if (input.btn[2] && this.noChao) {
      this.bloqueando = true;
      this.vx = 0;
      this.state = 'DEFEND';
    }

    // Pulo (up)
    if (input.up && this.noChao) {
      this.vy = PULO_FORCA;
      this.noChao = false;
    }

    // Ataques
    if (!this.bloqueando) {
      if (Controls.justPressed(this.player, 'b0')) {
        this._iniciarAtaque('ATTACK', this.def.dano.leve, 280);
      }
      else if (Controls.justPressed(this.player, 'b1')) {
        this._iniciarAtaque('ATTACK2', this.def.dano.forte, 420);
      }
      else if (Controls.justPressed(this.player, 'b3') && (this.especialCd || 0) <= 0) {
        this._ativarEspecial(inimigo);
      }
      else if (Controls.justPressed(this.player, 'b4')) {
        this.counterWindow = 300;
      }
    }

    // Fisica
    this.vy += GRAVIDADE;
    this.x += this.vx;
    this.y += this.vy;

    if (this.y >= CHAO) {
      this.y = CHAO;
      this.vy = 0;
      this.noChao = true;
    }

    this.x = Math.max(0, Math.min(W - this.w, this.x));

    // Estado de animacao
    if (!this.atacando && !this.bloqueando) {
      if (!this.noChao) {
        spriteManager.setAnim(this.animState, 'JUMP');
      } else if (Math.abs(this.vx) > this.speed * 0.8) {
        spriteManager.setAnim(this.animState, 'RUN');
      } else if (movendo) {
        spriteManager.setAnim(this.animState, 'WALK');
      } else {
        spriteManager.setAnim(this.animState, 'IDLE');
      }
    }

    const done = spriteManager.tickAnim(this.animState, deltaMs);
    if (done && (this.state === 'HIT')) {
      this.state = 'IDLE';
      spriteManager.setAnim(this.animState, 'IDLE');
    }
  }

  _iniciarAtaque(tipo, dano, durMs) {
    this.atacando    = true;
    this.ataqueTick  = durMs;
    this.hitboxAtiva = true;
    this.state       = tipo;
    this._danoAtual  = dano;
    spriteManager.setAnim(this.animState, tipo);
  }

  _ativarEspecial(inimigo) {
    this.especialCd = 4000;
    spriteManager.setAnim(this.animState, 'SPECIAL');

    switch (this.personagem) {
      case 0: // Espadachim - Lamina Veloz
        this._iniciarAtaque('SPECIAL', this.def.dano.especial, 400);
        break;

      case 1: // Lutador - Impacto Sismico
        if (this.noChao) {
          this.vy = PULO_FORCA * 0.6;
          this.noChao = false;
          this._especial_pendente = 'sismico';
        }
        break;

      case 2: // Mago - Tempestade Arcana
        for (let i = 0; i < 3; i++) {
          projeteis.push({
            x: this.x + this.w / 2,
            y: this.y - this.h * 0.7,
            vx: this.virado ? -(5 + i * 2) : (5 + i * 2),
            vy: -1 + i * 0.5,
            dano: 8,
            dono: this.player,
            vida: 120
          });
        }
        break;

      case 3: // Vampira - Veu de Sangue
        this.invencivel = true;
        this.invincivelTimer = 2000;
        break;

      case 4: // Vampiro - Sombra Veloz
        if (inimigo) {
          const offset = inimigo.virado ? 100 : -100;
          this.x = Math.max(0, Math.min(W - this.w, inimigo.x + offset));
          this._iniciarAtaque('SPECIAL', this.def.dano.especial, 350);
        }
        break;
    }
  }

  receberDano(dano, atacante) {
    if (this.morreu || this.invencivel) return 0;

    if (this.counterWindow > 0) {
      atacante && atacante._iniciarAtaque('ATTACK2', atacante.def.dano.forte * 1.5, 300);
      this.counterWindow = 0;
      return 0;
    }

    const dmgReal = this.bloqueando ? Math.ceil(dano * 0.3) : dano;

    this.hp = Math.max(0, this.hp - dmgReal);
    this.stunTimer = this.bloqueando ? 80 : 200;
    spriteManager.setAnim(this.animState, 'HIT');

    if (this.hp <= 0) {
      this.morreu = true;
      spriteManager.setAnim(this.animState, 'DEATH');
    }

    if (atacante) atacante.pontos += dmgReal;
    return dmgReal;
  }

  draw() {
    if (!spriteManager) return;
    const hb = this.hitbox;
    spriteManager.draw(ctx, this.personagem, this.animState,
      hb.x, hb.y, this.w, this.h, this.virado);

    if (this.invencivel && Math.floor(Date.now() / 100) % 2 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#fff';
      ctx.fillRect(hb.x, hb.y, this.w, this.h);
      ctx.restore();
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.nome, hb.x + this.w / 2, hb.y - 10);
  }
}

// ────────────────────────────────────────────────────────────
// IA
// ────────────────────────────────────────────────────────────
class IA {
  constructor(fighter, dificuldade) {
    this.f = fighter;
    this.nivel = dificuldade;
    this.timer = 0;
    this.acao  = null;
  }

  update(inimigo, deltaMs) {
    const f = this.f;
    if (f.morreu) return;

    this.timer -= deltaMs;

    const dist  = Math.abs(f.x - inimigo.x);
    const alcance = { facil: 200, medio: 140, dificil: 90 }[this.nivel];
    const react   = { facil: 600, medio: 350, dificil: 150 }[this.nivel];
    const agressividade = { facil: 0.3, medio: 0.55, dificil: 0.8 }[this.nivel];

    const inp = { left: false, right: false, up: false, down: false, btn: [false, false, false, false, false] };

    if (this.timer <= 0) {
      this.timer = react + Math.random() * react;
      this.acao = Math.random() < agressividade ? 'atacar' : 'aproximar';
    }

    if (dist > alcance) {
      inp[f.x < inimigo.x ? 'right' : 'left'] = true;
    } else if (dist < 60 && Math.random() < 0.3) {
      inp[f.x < inimigo.x ? 'left' : 'right'] = true;
    }

    if (dist <= alcance && this.acao === 'atacar') {
      const r = Math.random();
      if (r < 0.5)        inp.btn[0] = true;
      else if (r < 0.75)  inp.btn[1] = true;
      else if (r < 0.85)  inp.btn[3] = true;
      else                inp.btn[2] = true;
    }

    if (Math.random() < (0.002 * ({ facil: 1, medio: 2, dificil: 3 }[this.nivel]))) {
      inp.up = true;
    }

    // Salva o "prev" (estado anterior real) antes de sobrescrever
    Controls.prev[f.player] = {
      left:  Controls.state[f.player].left,
      right: Controls.state[f.player].right,
      up:    Controls.state[f.player].up,
      down:  Controls.state[f.player].down,
      btn:   [...Controls.state[f.player].btn]
    };
    Controls.state[f.player] = {
      left: inp.left, right: inp.right, up: inp.up, down: inp.down,
      btn: [...inp.btn]
    };
  }
}

// ────────────────────────────────────────────────────────────
// Inicializacao
// ────────────────────────────────────────────────────────────
async function init() {
  canvas = document.getElementById('gameCanvas');
  ctx    = canvas.getContext('2d');
  canvas.width  = W;
  canvas.height = H;

  Controls.init();

  spriteManager = new SpriteManager(SPRITES_PATH);
  await spriteManager.carregar();

  gameState = 'TELA_INICIAL';
  requestAnimationFrame(loop);
}

// ────────────────────────────────────────────────────────────
// Game Loop
// ────────────────────────────────────────────────────────────
let lastTime = 0;
function loop(ts) {
  const delta = Math.min(ts - lastTime, 50);
  lastTime = ts;

  Controls.update();

  update(delta);
  render();

  requestAnimationFrame(loop);
}

// ────────────────────────────────────────────────────────────
// Update
// ────────────────────────────────────────────────────────────
function update(delta) {
  switch (gameState) {
    case 'TELA_INICIAL':    /* index.html cuida */    break;
    case 'SELECT':          updateSelect(delta);      break;
    case 'COUNTDOWN':       updateCountdown(delta);   break;
    case 'FIGHTING':        updateFighting(delta);    break;
    case 'ROUND_END':       updateRoundEnd(delta);    break;
    case 'GAME_OVER':       updateGameOver(delta);    break;
  }
}

// ────────────────────────────────────────────────────────────
// SELECT - tela de selecao de personagens
// ────────────────────────────────────────────────────────────
function updateSelect(delta) {
  const totalPersonagens = PERSONAGENS_DEF.length;
  const numPlayers = (salaModo === 'single') ? 1 : 2;

  for (let p = 0; p < numPlayers; p++) {
    if (selecao.escolhido[p] !== null) continue;

    // Mover cursor
    if (Controls.justPressed(p, 'left')) {
      selecao.cursor[p] = (selecao.cursor[p] - 1 + totalPersonagens) % totalPersonagens;
    }
    if (Controls.justPressed(p, 'right')) {
      selecao.cursor[p] = (selecao.cursor[p] + 1) % totalPersonagens;
    }

    // CONFIRMAR com PULO (up): W/Espaco para P1, Seta Cima para P2
    if (Controls.justPressed(p, 'up')) {
      const escolha = selecao.cursor[p];
      const outroPlayer = (p === 0) ? 1 : 0;
      // Nao permite escolher mesmo personagem que o outro player ja confirmou
      if (numPlayers === 2 && selecao.escolhido[outroPlayer] === escolha) {
        continue;
      }
      selecao.escolhido[p] = escolha;
    }
  }

  // Single player: CPU escolhe um personagem diferente
  if (numPlayers === 1 && selecao.escolhido[0] !== null && selecao.escolhido[1] === null) {
    let escolhaCpu;
    do {
      escolhaCpu = Math.floor(Math.random() * totalPersonagens);
    } while (escolhaCpu === selecao.escolhido[0]);
    selecao.escolhido[1] = escolhaCpu;
    selecao.cursor[1]    = escolhaCpu;
  }

  const todosProntos = (selecao.escolhido[0] !== null && selecao.escolhido[1] !== null);
  if (todosProntos) iniciarPartidaComEscolhas();
}

function iniciarPartidaComEscolhas() {
  fighters  = [];
  projeteis = [];

  const f1 = new Fighter(0, selecao.escolhido[0], 200);
  const f2 = new Fighter(1, selecao.escolhido[1], W - 280);
  f1.nome = nickP1;
  f2.nome = nickP2;

  fighters = [f1, f2];
  ia = (salaModo === 'single') ? new IA(f2, dificuldadeIA) : null;

  roundAtual     = 1;
  vitorias       = [0, 0];
  countdownVal   = 5;
  countdownTimer = 1000;
  gameState      = 'COUNTDOWN';
}

// ────────────────────────────────────────────────────────────
// COUNTDOWN
// ────────────────────────────────────────────────────────────
function updateCountdown(delta) {
  countdownTimer -= delta;
  if (countdownTimer <= 0) {
    countdownVal--;
    countdownTimer = 1000;
    if (countdownVal <= 0) {
      gameState = 'FIGHTING';
      // Avisa o index.html que a luta comecou (mostra legendas)
      document.dispatchEvent(new CustomEvent('game:lutaIniciou'));
    }
  }
}

// ────────────────────────────────────────────────────────────
// FIGHTING
// ────────────────────────────────────────────────────────────
let ia = null;
function updateFighting(delta) {
  if (fighters.length < 2) return;

  const [f1, f2] = fighters;

  if (ia) ia.update(f1, delta);

  f1.update(Controls.getInput(0), f2, delta);
  f2.update(Controls.getInput(1), f1, delta);

  _checarHit(f1, f2);
  _checarHit(f2, f1);

  _atualizarProjeteis(delta, f1, f2);

  [f1, f2].forEach(f => {
    if (f._especial_pendente === 'sismico' && f.noChao) {
      const alvo = f === f1 ? f2 : f1;
      if (Math.abs(f.x - alvo.x) < 160) {
        alvo.receberDano(f.def.dano.especial, f);
      }
      f._especial_pendente = null;
    }
  });

  if (f1.morreu || f2.morreu) {
    const venceuIdx = f1.morreu ? 1 : 0;
    vitorias[venceuIdx]++;
    gameState = 'ROUND_END';
    roundEndTimer = 2500;
  }
}

function _checarHit(atacante, alvo) {
  if (!atacante.hitboxAtiva || atacante.morreu) return;

  const ha = atacante.hitboxAtaque;
  const hd = alvo.hitbox;

  if (ha.x < hd.x + hd.w && ha.x + ha.w > hd.x &&
      ha.y < hd.y + hd.h && ha.y + ha.h > hd.y) {
    alvo.receberDano(atacante._danoAtual || atacante.def.dano.leve, atacante);
    atacante.hitboxAtiva = false;
  }
}

function _atualizarProjeteis(delta, f1, f2) {
  projeteis = projeteis.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vida--;

    const alvo = p.dono === 0 ? f2 : f1;
    const hd = alvo.hitbox;

    if (p.x > hd.x && p.x < hd.x + hd.w && p.y > hd.y && p.y < hd.y + hd.h) {
      alvo.receberDano(p.dano, fighters[p.dono]);
      return false;
    }

    return p.vida > 0 && p.x > 0 && p.x < W;
  });
}

function updateRoundEnd(delta) {
  roundEndTimer -= delta;
  if (roundEndTimer <= 0) {
    if (vitorias[0] >= 2 || vitorias[1] >= 2 || roundAtual >= maxRounds) {
      _encerrarPartida();
    } else {
      roundAtual++;
      _reiniciarRound();
    }
  }
}

function updateGameOver(delta) {
  // Nao faz nada: o index.html mostra o QR do placar por 10s
  // e depois dispara 'game:telaInicial' para voltar ao menu.
}

// ────────────────────────────────────────────────────────────
// Render
// ────────────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, W, H);
  _drawBg();

  switch (gameState) {
    case 'LOADING':         _drawLoading();        break;
    case 'TELA_INICIAL':    _drawTelaInicial();    break;
    case 'SELECT':          _drawSelect();         break;
    case 'COUNTDOWN':
    case 'FIGHTING':        _drawGame();           break;
    case 'ROUND_END':       _drawGame(); _drawRoundEnd();  break;
    case 'GAME_OVER':       _drawGame(); _drawGameOver(); break;
  }
}

function _drawBg() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0f0f1a');
  grad.addColorStop(1, '#1a0a0a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (gameState === 'COUNTDOWN' || gameState === 'FIGHTING' ||
      gameState === 'ROUND_END' || gameState === 'GAME_OVER') {
    ctx.fillStyle = '#2a1a1a';
    ctx.fillRect(0, CHAO, W, H - CHAO);
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, CHAO);
    ctx.lineTo(W, CHAO);
    ctx.stroke();
  }
}

function _drawLoading() {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Carregando sprites...', W / 2, H / 2);
}

function _drawGame() {
  if (fighters.length < 2) return;

  _drawHUD();

  fighters.forEach(f => f.draw());

  ctx.fillStyle = '#ffeb3b';
  projeteis.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  if (gameState === 'COUNTDOWN') _drawCountdown();
}

function _drawHUD() {
  const [f1, f2] = fighters;
  const barW = 480, barH = 28;
  const barY = 20;

  // Barra HP P1 (esquerda)
  const pct1 = f1.hp / f1.maxHp;
  ctx.fillStyle = '#333';
  ctx.fillRect(20, barY, barW, barH);
  const col1 = pct1 > 0.5 ? '#4caf50' : pct1 > 0.25 ? '#ff9800' : '#e94560';
  ctx.fillStyle = col1;
  ctx.fillRect(20, barY, barW * pct1, barH);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(20, barY, barW, barH);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${f1.nome}  ${f1.hp}/${f1.maxHp}`, 24, barY + 20);

  // Barra HP P2 (direita)
  const pct2 = f2.hp / f2.maxHp;
  ctx.fillStyle = '#333';
  ctx.fillRect(W - 20 - barW, barY, barW, barH);
  const col2 = pct2 > 0.5 ? '#4caf50' : pct2 > 0.25 ? '#ff9800' : '#e94560';
  ctx.fillStyle = col2;
  ctx.fillRect(W - 20 - barW + barW * (1 - pct2), barY, barW * pct2, barH);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(W - 20 - barW, barY, barW, barH);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'right';
  ctx.fillText(`${f2.hp}/${f2.maxHp}  ${f2.nome}`, W - 24, barY + 20);

  // Rounds
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#e94560';
  ctx.fillText(`ROUND ${roundAtual}`, W / 2, 30);

  for (let i = 0; i < maxRounds; i++) {
    const cx1 = W / 2 - 60 + i * 20;
    const cx2 = W / 2 + 60 - i * 20;
    ctx.beginPath();
    ctx.arc(cx1, 46, 7, 0, Math.PI * 2);
    ctx.fillStyle = vitorias[0] > i ? '#e94560' : '#333';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx2, 46, 7, 0, Math.PI * 2);
    ctx.fillStyle = vitorias[1] > i ? '#1565c0' : '#333';
    ctx.fill();
  }

  // Cooldown especial P1
  if (fighters[0]) {
    const cd = fighters[0].especialCd || 0;
    const cdPct = 1 - Math.min(cd / 4000, 1);
    ctx.fillStyle = '#333';
    ctx.fillRect(20, barY + barH + 8, 120, 8);
    ctx.fillStyle = '#ce93d8';
    ctx.fillRect(20, barY + barH + 8, 120 * cdPct, 8);
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ESPECIAL', 24, barY + barH + 22);
  }

  // Cooldown especial P2
  if (fighters[1]) {
    const cd = fighters[1].especialCd || 0;
    const cdPct = 1 - Math.min(cd / 4000, 1);
    ctx.fillStyle = '#333';
    ctx.fillRect(W - 140, barY + barH + 8, 120, 8);
    ctx.fillStyle = '#ce93d8';
    ctx.fillRect(W - 140, barY + barH + 8, 120 * cdPct, 8);
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('ESPECIAL', W - 24, barY + barH + 22);
  }
}

function _drawCountdown() {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e94560';
  ctx.font = 'bold 120px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(countdownVal > 0 ? countdownVal : 'LUTA!', W / 2, H / 2 + 40);
}

function _drawRoundEnd() {
  const venceuIdx = fighters[0] && fighters[0].morreu ? 1 : 0;
  const venceu = fighters[venceuIdx];

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 60px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('KO!', W / 2, H / 2 - 20);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(`${venceu ? venceu.nome : 'Jogador'} vence o round!`, W / 2, H / 2 + 30);
}

function _drawGameOver() {
  const venceuIdx = vitorias[0] >= 2 ? 0 : 1;
  const venceu = fighters[venceuIdx];

  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e94560';
  ctx.font = 'bold 80px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', W / 2, H / 2 - 60);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 36px monospace';
  ctx.fillText(`${venceu ? venceu.nome : 'Jogador'} VENCEU!`, W / 2, H / 2);
}

function _drawTelaInicial() {
  ctx.fillStyle = '#e94560';
  ctx.font = 'bold 90px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ARCADE', W / 2, H / 2 - 60);
  ctx.fillText('FIGHT', W / 2, H / 2 + 20);

  ctx.fillStyle = '#aaa';
  ctx.font = '18px monospace';
  ctx.fillText('Selecione um modo de jogo abaixo', W / 2, H / 2 + 90);
}

// ────────────────────────────────────────────────────────────
// Tela de selecao - DESENHO
// ────────────────────────────────────────────────────────────
function _drawSelect() {
  const defs = PERSONAGENS_DEF;
  const numPlayers = (salaModo === 'single') ? 1 : 2;

  // Titulo
  ctx.fillStyle = '#e94560';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ESCOLHA SEU PERSONAGEM', W / 2, 60);

  ctx.fillStyle = '#888';
  ctx.font = '14px monospace';
  const subt = numPlayers === 2
    ? 'P1: A/D mover | W/Espaço confirmar      P2: ◄/► mover | Seta Cima confirmar'
    : 'Use A/D para mover  |  W ou Espaço para confirmar';
  ctx.fillText(subt, W / 2, 88);

  // Slots dos personagens
  const slotW = 180, slotH = 240, gap = 20;
  const totalW = defs.length * slotW + (defs.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const startY = 130;

  defs.forEach((def, i) => {
    const x = startX + i * (slotW + gap);
    const y = startY;

    const isCursorP1 = selecao.cursor[0] === i && selecao.escolhido[0] === null;
    const isCursorP2 = numPlayers === 2 && selecao.cursor[1] === i && selecao.escolhido[1] === null;
    const escolhidoP1 = selecao.escolhido[0] === i;
    const escolhidoP2 = selecao.escolhido[1] === i;
    const bloqueado = (escolhidoP1 || escolhidoP2);

    if (escolhidoP1 || escolhidoP2) {
      ctx.fillStyle = '#0a2530';
    } else if (isCursorP1 && isCursorP2) {
      ctx.fillStyle = '#3a1a3a';
    } else if (isCursorP1) {
      ctx.fillStyle = '#2a1020';
    } else if (isCursorP2) {
      ctx.fillStyle = '#10202a';
    } else {
      ctx.fillStyle = '#15151f';
    }
    _roundRect(ctx, x, y, slotW, slotH, 14);
    ctx.fill();

    if (escolhidoP1) {
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 4;
      _roundRect(ctx, x, y, slotW, slotH, 14);
      ctx.stroke();
    } else if (escolhidoP2) {
      ctx.strokeStyle = '#1565c0';
      ctx.lineWidth = 4;
      _roundRect(ctx, x, y, slotW, slotH, 14);
      ctx.stroke();
    }
    if (isCursorP1 && !escolhidoP1) {
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 3;
      const dash = (Math.floor(Date.now() / 200) % 2) ? [6, 4] : [4, 6];
      ctx.setLineDash(dash);
      _roundRect(ctx, x - 2, y - 2, slotW + 4, slotH + 4, 16);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (isCursorP2 && !escolhidoP2) {
      ctx.strokeStyle = '#1565c0';
      ctx.lineWidth = 3;
      const dash = (Math.floor(Date.now() / 200) % 2) ? [6, 4] : [4, 6];
      ctx.setLineDash(dash);
      _roundRect(ctx, x - 6, y - 6, slotW + 12, slotH + 12, 18);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Preview do sprite
    const previewSize = slotH - 80;
    if (spriteManager && spriteManager.loaded && spriteManager.drawPreview) {
      spriteManager.drawPreview(ctx, def.id,
        x + (slotW - previewSize * 0.7) / 2,
        y + 20,
        previewSize * 0.7,
        previewSize);
    } else {
      ctx.fillStyle = def.cor;
      ctx.fillRect(x + 30, y + 30, slotW - 60, previewSize - 30);
    }

    if (bloqueado) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      _roundRect(ctx, x, y, slotW, slotH, 14);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(escolhidoP1 ? 'P1 ESCOLHEU' : 'P2 ESCOLHEU',
        x + slotW / 2, y + slotH / 2);
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(def.nome, x + slotW / 2, y + slotH - 36);

    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText(`HP ${def.hp}  VEL ${def.velocidade}`, x + slotW / 2, y + slotH - 18);
  });

  _drawSelectInfoBox(0, 30, 420);
  if (numPlayers === 2) {
    _drawSelectInfoBox(1, W - 280 - 30, 420);
  } else {
    _drawCPUInfoBox(W - 280 - 30, 420);
  }

  _drawSelectEspecialFocus();
}

function _drawSelectInfoBox(player, x, y) {
  const w = 280, h = 130;
  const cor = player === 0 ? '#e94560' : '#1565c0';
  const nick = player === 0 ? nickP1 : nickP2;
  const cursorIdx = selecao.cursor[player];
  const escolhido = selecao.escolhido[player];
  const personagemFoco = (escolhido !== null) ? escolhido : cursorIdx;
  const def = PERSONAGENS_DEF[personagemFoco];

  ctx.fillStyle = 'rgba(20,20,30,0.85)';
  _roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = cor;
  ctx.lineWidth = 2;
  _roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();

  ctx.fillStyle = cor;
  ctx.fillRect(x, y, w, 28);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`PLAYER ${player + 1}`, x + 12, y + 19);
  ctx.textAlign = 'right';
  ctx.fillText(escolhido !== null ? '✓ PRONTO' : 'ESCOLHENDO...', x + w - 12, y + 19);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(nick, x + w / 2, y + 60);

  ctx.fillStyle = def.cor;
  ctx.font = 'bold 18px monospace';
  ctx.fillText(def.nome, x + w / 2, y + 88);

  ctx.fillStyle = '#aaa';
  ctx.font = '11px monospace';
  ctx.fillText(`HP ${def.hp}  |  Velocidade ${def.velocidade}`, x + w / 2, y + 108);
  ctx.fillText(`Dano  ${def.dano.leve} / ${def.dano.forte} / ${def.dano.especial}`, x + w / 2, y + 122);
}

function _drawCPUInfoBox(x, y) {
  const w = 280, h = 130;
  const cor = '#1565c0';
  const def = (selecao.escolhido[1] !== null)
    ? PERSONAGENS_DEF[selecao.escolhido[1]]
    : null;

  ctx.fillStyle = 'rgba(20,20,30,0.85)';
  _roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = cor;
  ctx.lineWidth = 2;
  _roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();

  ctx.fillStyle = cor;
  ctx.fillRect(x, y, w, 28);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('CPU', x + 12, y + 19);
  ctx.textAlign = 'right';
  ctx.fillText(`DIF: ${dificuldadeIA.toUpperCase()}`, x + w - 12, y + 19);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Computador', x + w / 2, y + 62);

  if (def) {
    ctx.fillStyle = def.cor;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`Vai usar: ${def.nome}`, x + w / 2, y + 92);
  } else {
    ctx.fillStyle = '#666';
    ctx.font = '13px monospace';
    ctx.fillText('Aguardando P1 escolher...', x + w / 2, y + 92);
  }
}

function _drawSelectEspecialFocus() {
  const idx = (selecao.escolhido[0] !== null) ? selecao.escolhido[0] : selecao.cursor[0];
  const def = PERSONAGENS_DEF[idx];

  const x = W / 2 - 200;
  const y = 575;
  const w = 400, h = 60;

  ctx.fillStyle = 'rgba(206,147,216,0.12)';
  _roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = '#ce93d8';
  ctx.lineWidth = 1;
  _roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();

  ctx.fillStyle = '#ce93d8';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`ESPECIAL: ${def.especial}`, W / 2, y + 22);
  ctx.fillStyle = '#aaa';
  ctx.font = '12px monospace';
  ctx.fillText(def.descEspecial, W / 2, y + 42);
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ────────────────────────────────────────────────────────────
// Funcoes de fluxo (chamadas pelo index.html)
// ────────────────────────────────────────────────────────────
function iniciarFluxo(modo, id, tokenP1) {
  salaId    = id;
  salaToken = tokenP1;
  salaModo  = modo;

  // Reset selecao
  selecao = {
    cursor: [0, 1],
    escolhido: [null, null]
  };

  // Limpa teclado e espelha estado real do gamepad em prev para que
  // justPressed() retorne false para qualquer input mantido pressionado agora
  Controls.resetInput();

  // Avisa index.html para ocultar todos os elementos de menu
  document.dispatchEvent(new CustomEvent('game:selectIniciado'));

  gameState = 'SELECT';
}

function jogadoresEntraramprontos(nicks) {
  // Recebe nicks do index.html. A partida real comeca no SELECT,
  // entao so guardamos os nicks para usar quando criar os Fighters.
  nickP1 = nicks[0] || 'P1';
  nickP2 = nicks[1] || (salaModo === 'single' ? 'CPU' : 'P2');
}

function _reiniciarRound() {
  projeteis = [];
  const f1 = new Fighter(0, selecao.escolhido[0], 200);
  const f2 = new Fighter(1, selecao.escolhido[1], W - 280);
  f1.nome  = nickP1;
  f2.nome  = nickP2;
  fighters = [f1, f2];
  if (salaModo === 'single') ia = new IA(f2, dificuldadeIA);

  countdownVal   = 3;
  countdownTimer = 1000;
  gameState      = 'COUNTDOWN';
}

async function _encerrarPartida() {
  gameState = 'GAME_OVER';

  // Avisa o index.html (vai mostrar QR do placar apos 2.5s)
  document.dispatchEvent(new CustomEvent('game:gameOver'));

  if (!salaId || !salaToken) return;

  const venceuIdx  = vitorias[0] >= vitorias[1] ? 0 : 1;
  const pontos_j1  = fighters[0] ? fighters[0].pontos : 0;
  const pontos_j2  = fighters[1] ? fighters[1].pontos : 0;

  // Em single: sempre usa salaToken (P1)
  // Em multi: idealmente teria 2 tokens, mas o index passa so o de P1.
  // Por simplicidade, usa salaToken. Pode ser melhorado depois.
  const tokenVencedor = salaToken;

  if (!tokenVencedor) {
    console.warn('[Game] Sem token de vencedor para registrar resultado');
    return;
  }

  const resultado = await Api.registrarResultado(
    salaId, tokenVencedor, pontos_j1, pontos_j2
  );

  if (!resultado.ok) {
    console.warn('[Game] Erro ao registrar resultado:', resultado.erro);
  } else {
    console.log('[Game] Resultado registrado:', resultado);
  }
}

function _voltarInicio() {
  salaId = null;
  salaToken = null;
  salaTokenP2 = null;
  fighters = [];
  projeteis = [];
  vitorias = [0, 0];
  roundAtual = 1;
  gameState = 'TELA_INICIAL';
}

function setDificuldade(d) { dificuldadeIA = d; }

// Listener: o index.html avisa quando deve voltar ao menu (apos QR do placar)
document.addEventListener('game:telaInicial', () => {
  if (gameState === 'GAME_OVER') {
    _voltarInicio();
  }
});

// Expoe para o index.html
window.Game = {
  init,
  iniciarFluxo,
  jogadoresEntraramprontos,
  setDificuldade,
  getState: () => gameState
};
