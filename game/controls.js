// =============================================================================
// controls.js — Sistema unificado de input: teclado + gamepad (Web Gamepad API)
//
// Suporta 2 jogadores simultâneos.
// Cada jogador tem 4 direções e 5 botões de ação (b0–b4).
//
// Mapeamento de ações:
//   b0 = ataque rápido   b1 = ataque forte   b2 = defender
//   b3 = especial        b4 = counter
//
// Mapeamento teclado:
//   P1: A/D mover | W/Espaço pular | J=b0 K=b1 L=b2 I=b3 U=b4
//   P2: ◄/► mover | ▲ pular       | Num1=b0 Num2=b1 Num3=b2 Num5=b3 Num4=b4
//
// Mapeamento gamepad (padrão PlayStation/Xbox):
//   Analógico esquerdo eixo 0 → esquerda/direita
//   D-pad (btns 12–15)        → cima/baixo/esquerda/direita
//   Cruz/A (btn 0)            → pular (up)
//   Bolinha/B (btn 1)         → b0 (ataque rápido)
//   Quadrado/X (btn 2)        → b1 (ataque forte)
//   L1/LB (btn 4)             → b2 (defender)
//   Triângulo/Y (btn 3)       → b3 (especial)
//   R1/RB (btn 5)             → b4 (counter)
//   L2 (btn 6) / R2 (btn 7)  → atalhos de modo SINGLE/MULTI — tratados em index.html
//
// Exporta para window:
//   window.Controls — objeto singleton com state, prev e todos os métodos
// =============================================================================

const DEBUG_GAMEPAD = true;

const Controls = {

  // ── Estado atual de input dos dois jogadores ──────────────────────────────
  // Zerado e reconstruído a cada frame em update().
  // Lido por Fighter.update() e pela IA (game.js) via getInput() / justPressed().
  state: [
    { left: false, right: false, up: false, down: false, btn: [false, false, false, false, false] },
    { left: false, right: false, up: false, down: false, btn: [false, false, false, false, false] }
  ],

  // ── Estado do frame anterior ──────────────────────────────────────────────
  // Copiado de state no início de update(), antes de zerar.
  // Permite que justPressed() detecte a borda de subida (false → true).
  // Também usado diretamente pela IA (game.js) para simular input sem disparar justPressed falso.
  prev: [
    { left: false, right: false, up: false, down: false, btn: [false, false, false, false, false] },
    { left: false, right: false, up: false, down: false, btn: [false, false, false, false, false] }
  ],

  // ── Configuração do gamepad ───────────────────────────────────────────────
  // buttons: índices físicos dos botões do gamepad para cada ação b0–b4
  // axes:    [eixo horizontal, eixo vertical] do analógico esquerdo
  // deadzone: valor mínimo de deflexão do analógico para ser considerado input
  mapping: {
    buttons: [1, 2, 4, 3, 5], // b0=Bolinha(1) b1=Quadrado(2) b2=L1(4) b3=Triângulo(3) b4=R1(5)
    axes:    [0, 1],
    deadzone: 0.3
  },

  // ── Mapeamento de teclado — P1 ────────────────────────────────────────────
  // Chave: e.code da KeyboardEvent | Valor: ação no estado do player
  keymapP1: {
    'KeyA':  'left',
    'KeyD':  'right',
    'KeyW':  'up',
    'KeyS':  'down',
    'Space': 'up',   // atalho extra de pulo
    'KeyJ':  'b0',   // ataque rápido
    'KeyK':  'b1',   // ataque forte
    'KeyL':  'b2',   // defender
    'KeyI':  'b3',   // especial
    'KeyU':  'b4'    // counter
  },

  // ── Mapeamento de teclado — P2 ────────────────────────────────────────────
  keymapP2: {
    'ArrowLeft':  'left',
    'ArrowRight': 'right',
    'ArrowUp':    'up',
    'ArrowDown':  'down',
    'Numpad1':    'b0',   // ataque rápido
    'Numpad2':    'b1',   // ataque forte
    'Numpad3':    'b2',   // defender
    'Numpad5':    'b3',   // especial
    'Numpad4':    'b4',   // counter
    'Numpad0':    'b1'    // alternativa de ataque forte / pulo
  },

  // Conjunto de teclas atualmente pressionadas (e.code).
  // Mantido via keydown/keyup — não depende do game loop.
  _keysDown: new Set(),

  // Contador de frames de "graça" após resetInput().
  // Enquanto > 0, justPressed() retorna false para tudo,
  // evitando que inputs mantidos antes da transição de tela disparem ações.
  _ignoreInputFrames: 0,

  // Registra os listeners de teclado no window.
  // Chamado uma única vez por Game.init() (game.js).
  init() {
    window.addEventListener('keydown', e => {
      this._keysDown.add(e.code);
      // Impede scroll da página com teclas de navegação
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => {
      this._keysDown.delete(e.code);
    });
    console.log('[Controls] Inicializado. Gamepads:', navigator.getGamepads ? 'suportado' : 'não');
  },

  // Executado a cada frame pelo game loop (game.js → loop()).
  // Fluxo: copia state → prev | zera state | aplica teclado | aplica gamepad.
  update() {
    if (this._ignoreInputFrames > 0) this._ignoreInputFrames--;

    // ── 1. Salva estado anterior (necessário para justPressed) ──
    for (let p = 0; p < 2; p++) {
      this.prev[p].left  = this.state[p].left;
      this.prev[p].right = this.state[p].right;
      this.prev[p].up    = this.state[p].up;
      this.prev[p].down  = this.state[p].down;
      for (let b = 0; b < 5; b++) this.prev[p].btn[b] = this.state[p].btn[b];
    }

    // ── 2. Zera estado do frame atual ──
    for (let p = 0; p < 2; p++) {
      this.state[p].left  = false;
      this.state[p].right = false;
      this.state[p].up    = false;
      this.state[p].down  = false;
      for (let b = 0; b < 5; b++) this.state[p].btn[b] = false;
    }

    // ── 3. Aplica teclas pressionadas ──
    // _keysDown mantém todas as teclas atualmente seguradas;
    // _applyKey traduz cada código para a ação correspondente no state.
    for (const code of this._keysDown) {
      if (this.keymapP1[code]) this._applyKey(0, this.keymapP1[code]);
      if (this.keymapP2[code]) this._applyKey(1, this.keymapP2[code]);
    }

    // ── 4. Aplica gamepad (Web Gamepad API) ──
    // navigator.getGamepads() é sondado a cada frame (polling, não eventos).
    // Índice do pad = índice do player (pad[0] = P1, pad[1] = P2).
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();

    for (let p = 0; p < 2; p++) {
      const pad = pads[p];
      if (!pad || !pad.connected) continue;

      const dz = this.mapping.deadzone;
      const ax = this.mapping.axes;

      // Analógico esquerdo — apenas eixo horizontal (eixo vertical não pula)
      const h = pad.axes[ax[0]] || 0;
      if (h < -dz) this.state[p].left  = true;
      if (h >  dz) this.state[p].right = true;

      // D-pad digital (botões 12–15 no layout padrão do navegador)
      if (pad.buttons[12] && pad.buttons[12].pressed) this.state[p].up    = true;
      if (pad.buttons[13] && pad.buttons[13].pressed) this.state[p].down  = true;
      if (pad.buttons[14] && pad.buttons[14].pressed) this.state[p].left  = true;
      if (pad.buttons[15] && pad.buttons[15].pressed) this.state[p].right = true;

      // Cruz/A (btn 0) — pulo (equivalente ao W/Espaço no teclado)
      if (pad.buttons[0] && pad.buttons[0].pressed) this.state[p].up = true;

      // Botões de ação b0–b4 — lidos via mapping.buttons para respeitar o layout PS
      for (let b = 0; b < 5; b++) {
        const btn = pad.buttons[this.mapping.buttons[b]];
        if (btn && btn.pressed) this.state[p].btn[b] = true;
      }

      // Debug: imprime índice e estado de todos os botões pressionados a cada frame
      if (DEBUG_GAMEPAD) {
        for (let i = 0; i < pad.buttons.length; i++) {
          if (pad.buttons[i] && pad.buttons[i].pressed) {
            console.log(`[Gamepad ${p}] Botão ${i}: pressionado`);
          }
        }
      }
    }
  },

  // Aplica uma ação textual ('left', 'right', 'up', 'down', 'b0'–'b4') ao state do player.
  // Usado internamente por update() para processar entradas de teclado.
  _applyKey(player, action) {
    if (action === 'left')  this.state[player].left  = true;
    if (action === 'right') this.state[player].right = true;
    if (action === 'up')    this.state[player].up    = true;
    if (action === 'down')  this.state[player].down  = true;
    if (action.startsWith('b')) {
      const idx = parseInt(action[1]);
      if (idx >= 0 && idx < 5) this.state[player].btn[idx] = true;
    }
  },

  // Retorna true somente no primeiro frame em que o input foi ativado (borda de subida).
  // Retorna false durante o período de graça pós-resetInput() para evitar auto-disparo.
  // Usado por Fighter.update() e updateSelect() em game.js para detectar pressionamentos únicos.
  justPressed(player, action) {
    if (this._ignoreInputFrames > 0) return false;
    const cur  = this._getVal(this.state[player], action);
    const prev = this._getVal(this.prev[player],  action);
    return cur && !prev;
  },

  // Lê o valor booleano de um campo de estado (state ou prev) para uma ação textual.
  // Usado internamente por justPressed().
  _getVal(s, action) {
    if (action === 'left')  return s.left;
    if (action === 'right') return s.right;
    if (action === 'up')    return s.up;
    if (action === 'down')  return s.down;
    if (action.startsWith('b')) return s.btn[parseInt(action[1])];
    return false;
  },

  // Retorna o estado bruto (atual) do player — { left, right, up, down, btn[] }.
  // Usado por Fighter.update() e pela classe IA em game.js.
  getInput(player) {
    return this.state[player];
  },

  // Limpa o estado de input e cria um período de graça de ~133ms (8 frames a 60fps).
  // Deve ser chamado ao transitar para a tela SELECT para impedir que inputs mantidos
  // (ex: confirmar no menu) sejam lidos como ações de combate no primeiro frame.
  //
  // Ações:
  //   1. Ativa _ignoreInputFrames = 8 → justPressed() retorna false por 8 frames
  //   2. Limpa _keysDown (teclas seguradas não persistem na nova tela)
  //   3. Lê o estado atual do gamepad e espelha em state E prev, para que
  //      justPressed() = (cur && !prev) = false para qualquer botão já pressionado
  resetInput() {
    this._ignoreInputFrames = 8;
    this._keysDown.clear();

    for (let p = 0; p < 2; p++) {
      // Zera estado base
      this.state[p].left = this.state[p].right = this.state[p].up = this.state[p].down = false;
      for (let b = 0; b < 5; b++) this.state[p].btn[b] = false;

      // Lê snapshot atual do gamepad e aplica ao state
      if (navigator.getGamepads) {
        const pad = navigator.getGamepads()[p];
        if (pad && pad.connected) {
          const dz = this.mapping.deadzone;
          const h  = pad.axes[this.mapping.axes[0]] || 0;
          if (h < -dz) this.state[p].left  = true;
          if (h >  dz) this.state[p].right = true;
          if (pad.buttons[12] && pad.buttons[12].pressed) this.state[p].up    = true;
          if (pad.buttons[13] && pad.buttons[13].pressed) this.state[p].down  = true;
          if (pad.buttons[14] && pad.buttons[14].pressed) this.state[p].left  = true;
          if (pad.buttons[15] && pad.buttons[15].pressed) this.state[p].right = true;
          if (pad.buttons[0]  && pad.buttons[0].pressed)  this.state[p].up    = true;
          for (let b = 0; b < 5; b++) {
            const btn = pad.buttons[this.mapping.buttons[b]];
            if (btn && btn.pressed) this.state[p].btn[b] = true;
          }
        }
      }

      // Espelha state em prev: justPressed() = (cur && !prev) = false para tudo que já está pressionado
      this.prev[p].left  = this.state[p].left;
      this.prev[p].right = this.state[p].right;
      this.prev[p].up    = this.state[p].up;
      this.prev[p].down  = this.state[p].down;
      for (let b = 0; b < 5; b++) this.prev[p].btn[b] = this.state[p].btn[b];
    }
  }
};

// Exporta o singleton para uso por game.js (carregado após este arquivo via index.html)
window.Controls = Controls;
