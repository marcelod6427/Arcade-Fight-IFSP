// sprites.js — Sistema de animação por frames individuais
// Cada animação está em uma pasta com arquivos 0.png, 1.png, 2.png...
//
// Estrutura esperada:
// sprites/
//   espadachim/
//     idle/    (0.png, 1.png, ...)
//     walk/    (0.png, 1.png, ...)
//     run/
//     jump/
//     attack1/
//     attack2/
//     hurt/
//     death/
//     shield/
//   lutador/
//   mago/
//   vampira/
//   vampiro/

const path = require('path');
const fs   = require('fs');

// ── Definição dos personagens ────────────────────────────────
const PERSONAGENS_DEF = [
  {
    id: 0,
    nome: 'Espadachim',
    pasta: 'espadachim',
    cor: '#4fc3f7',
    hp: 100,
    especial: 'Lâmina Veloz',
    descEspecial: 'Investida rápida com corte em área',
    velocidade: 4.5,
    dano: { leve: 8, forte: 15, especial: 22 }
  },
  {
    id: 1,
    nome: 'Lutador',
    pasta: 'lutador',
    cor: '#ef9a9a',
    hp: 130,
    especial: 'Impacto Sísmico',
    descEspecial: 'Salta e abala o chão causando dano em área',
    velocidade: 3.5,
    dano: { leve: 10, forte: 20, especial: 28 }
  },
  {
    id: 2,
    nome: 'Mago',
    pasta: 'mago',
    cor: '#ce93d8',
    hp: 90,
    especial: 'Tempestade Arcana',
    descEspecial: 'Conjura três projéteis mágicos',
    velocidade: 4.0,
    dano: { leve: 7, forte: 14, especial: 25 }
  },
  {
    id: 3,
    nome: 'Vampira',
    pasta: 'vampira',
    cor: '#f48fb1',
    hp: 110,
    especial: 'Véu de Sangue',
    descEspecial: 'Manto sombrio concede invencibilidade por 2s',
    velocidade: 4.2,
    dano: { leve: 9, forte: 16, especial: 0 }
  },
  {
    id: 4,
    nome: 'Vampiro',
    pasta: 'vampiro',
    cor: '#80cbc4',
    hp: 95,
    especial: 'Sombra Veloz',
    descEspecial: 'Desmaterializa e reaparece atrás do inimigo',
    velocidade: 5.0,
    dano: { leve: 8, forte: 14, especial: 18 }
  }
];

// ── Mapeamento: nome da animação no código → pasta de sprites
const ANIM_MAP = {
  //         pasta       fps  loop
  IDLE:    { pasta: 'idle',    fps: 8,  loop: true  },
  WALK:    { pasta: 'walk',    fps: 10, loop: true  },
  RUN:     { pasta: 'run',     fps: 12, loop: true  },
  JUMP:    { pasta: 'jump',    fps: 10, loop: false },
  ATTACK:  { pasta: 'attack1', fps: 14, loop: false },
  ATTACK2: { pasta: 'attack2', fps: 12, loop: false },
  HIT:     { pasta: 'hurt',    fps: 12, loop: false },
  DEATH:   { pasta: 'death',   fps: 8,  loop: false },
  SPECIAL: { pasta: 'attack3', fps: 12, loop: false }, // usa attack3
  DEFEND:  { pasta: 'shield',  fps: 8,  loop: false }
};

// ── Classe SpriteManager ────────────────────────────────────
class SpriteManager {
  constructor(spritesPath) {
    this.spritesPath = spritesPath;
    this.personagens = [];
    this.loaded = false;
  }

  async carregar() {
    const tarefas = [];

    for (const def of PERSONAGENS_DEF) {
      const p = {
        ...def,
        animacoes: {}  // { IDLE: [Image, Image, ...], WALK: [...], ... }
      };

      for (const [animKey, animInfo] of Object.entries(ANIM_MAP)) {
        const pastaAnim = path.join(this.spritesPath, def.pasta, animInfo.pasta);
        const frames = this._listarFrames(pastaAnim);

        if (frames.length === 0) {
          console.warn(`[Sprites] ${def.nome}/${animInfo.pasta}: nenhum frame encontrado`);
          p.animacoes[animKey] = [];
          continue;
        }

        const imagens = frames.map(arq => {
          const img = new Image();
          const caminho = path.join(pastaAnim, arq).replace(/\\/g, '/');
          img.src = `file:///${caminho}`;
          tarefas.push(new Promise(resolve => {
            img.onload = () => resolve();
            img.onerror = () => {
              console.warn('[Sprites] Falha ao carregar:', caminho);
              resolve();
            };
          }));
          return img;
        });

        p.animacoes[animKey] = imagens;
      }

      this.personagens.push(p);
    }

    await Promise.all(tarefas);
    this._logResumo();
    this.loaded = true;
  }

  _listarFrames(pasta) {
    try {
      if (!fs.existsSync(pasta)) return [];
      const arquivos = fs.readdirSync(pasta)
        .filter(f => /^\d+\.png$/i.test(f))
        .sort((a, b) => parseInt(a) - parseInt(b));
      return arquivos;
    } catch (e) {
      console.warn('[Sprites] Erro lendo pasta', pasta, e.message);
      return [];
    }
  }

  _logResumo() {
    console.log('[Sprites] === Resumo de carregamento ===');
    for (const p of this.personagens) {
      const partes = [];
      for (const [k, frames] of Object.entries(p.animacoes)) {
        partes.push(`${k}:${frames.length}`);
      }
      console.log(`  ${p.nome}: ${partes.join(' ')}`);
    }
  }

  getPersonagem(id) {
    return this.personagens[id] || null;
  }

  getDefinicoes() {
    return PERSONAGENS_DEF;
  }

  getNumFrames(personagemId, animNome) {
    const p = this.personagens[personagemId];
    if (!p) return 1;
    const frames = p.animacoes[animNome] || p.animacoes['IDLE'] || [];
    return Math.max(frames.length, 1);
  }

  draw(ctx, personagemId, animState, x, y, largura, altura, viradoEsquerda = false) {
    const p = this.personagens[personagemId];
    if (!p) return;

    let frames = p.animacoes[animState.nome];
    if (!frames || frames.length === 0) {
      frames = p.animacoes['IDLE'];
    }

    if (!frames || frames.length === 0) {
      ctx.fillStyle = p.cor;
      ctx.fillRect(x, y, largura, altura);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.floor(altura * 0.25)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(p.nome[0], x + largura / 2, y + altura * 0.6);
      return;
    }

    const idx = animState.frame % frames.length;
    const img = frames[idx];

    if (!img || img.naturalWidth === 0) {
      ctx.fillStyle = p.cor;
      ctx.fillRect(x, y, largura, altura);
      return;
    }

    ctx.save();
    if (viradoEsquerda) {
      ctx.translate(x + largura, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, largura, altura);
    } else {
      ctx.drawImage(img, x, y, largura, altura);
    }
    ctx.restore();
  }

  drawPreview(ctx, personagemId, x, y, largura, altura) {
    const p = this.personagens[personagemId];
    if (!p) return;

    const frames = p.animacoes['IDLE'] || [];
    const img = frames[0];

    if (!img || img.naturalWidth === 0) {
      ctx.fillStyle = p.cor;
      ctx.fillRect(x, y, largura, altura);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.floor(altura * 0.4)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.nome[0], x + largura / 2, y + altura / 2);
      ctx.textBaseline = 'alphabetic';
      return;
    }

    ctx.drawImage(img, x, y, largura, altura);
  }

  // Avança o frame de uma animação. Retorna true se completou um ciclo (one-shot).
  tickAnim(animState, deltaMs, personagemId) {
    const anim = ANIM_MAP[animState.nome] || ANIM_MAP.IDLE;
    const totalFrames = (personagemId !== undefined)
      ? this.getNumFrames(personagemId, animState.nome)
      : 1;

    animState.timer = (animState.timer || 0) + deltaMs;
    const msPerFrame = 1000 / anim.fps;

    if (animState.timer >= msPerFrame) {
      animState.timer -= msPerFrame;
      animState.frame++;

      if (animState.frame >= totalFrames) {
        if (anim.loop) {
          animState.frame = 0;
        } else {
          animState.frame = totalFrames - 1;
          return true;
        }
      }
    }
    return false;
  }

  setAnim(animState, novaAnim) {
    if (animState.nome !== novaAnim) {
      animState.nome  = novaAnim;
      animState.frame = 0;
      animState.timer = 0;
    }
  }

  getAnimMap() { return ANIM_MAP; }
}

window.SpriteManager = SpriteManager;
window.PERSONAGENS_DEF = PERSONAGENS_DEF;
window.ANIM_MAP = ANIM_MAP;