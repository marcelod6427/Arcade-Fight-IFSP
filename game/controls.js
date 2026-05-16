// controls.js - Gamepad API + Teclado (fallback)
// 1 analogico + 5 botoes por jogador
// 5 botoes de acao: [b0=ataqueRapido, b1=ataqueForte, b2=defender, b3=especial, b4=counter]
// b1 (ataque forte) tambem e usado como "PULAR/CONFIRMAR" em menus

const Controls = {
  // Estado atual dos dois jogadores
  state: [
    { left: false, right: false, up: false, down: false, btn: [false, false, false, false, false] },
    { left: false, right: false, up: false, down: false, btn: [false, false, false, false, false] }
  ],

  // Estado anterior (para detectar pressed/released)
  prev: [
    { left: false, right: false, up: false, down: false, btn: [false, false, false, false, false] },
    { left: false, right: false, up: false, down: false, btn: [false, false, false, false, false] }
  ],

  // Mapeamento gamepad
  mapping: {
    buttons: [0, 1, 2, 3, 4],   // [b0,b1,b2,b3,b4] -> indices fisicos do gamepad
    axes:    [0, 1],            // [horizontal, vertical]
    deadzone: 0.25
  },

  // ── Teclado ────────────────────────────────────────────────
  // PLAYER 1: WASD para mover, J/K/L (defender), I (especial), U (counter)
  // SPACE = pulo (atalho extra para "up")
  keymapP1: {
    'KeyA': 'left',
    'KeyD': 'right',
    'KeyW': 'up',
    'KeyS': 'down',
    'Space': 'up',           // atalho de pulo
    'KeyJ': 'b0',            // ataque rapido
    'KeyK': 'b1',            // ataque forte / pulo / confirmar
    'KeyL': 'b2',            // defender
    'KeyI': 'b3',            // especial
    'KeyU': 'b4'             // counter
  },

  // PLAYER 2: Setas para mover, Numpad para acoes
  keymapP2: {
    'ArrowLeft':  'left',
    'ArrowRight': 'right',
    'ArrowUp':    'up',
    'ArrowDown':  'down',
    'Numpad1':    'b0',      // ataque rapido
    'Numpad2':    'b1',      // ataque forte / pulo / confirmar
    'Numpad3':    'b2',      // defender
    'Numpad5':    'b3',      // especial
    'Numpad4':    'b4',      // counter
    'Numpad0':    'b1'       // alternativa de pulo/confirmar
  },

  // Texto descritivo do mapeamento (para HUD/legenda)
  legendaP1: {
    titulo: 'PLAYER 1 (Teclado)',
    linhas: [
      'Mover:   W A S D',
      'Pular:   W ou ESPACO',
      'Atq Rapido:  J',
      'Atq Forte:   K',
      'Defender:    L',
      'Especial:    I',
      'Counter:     U'
    ]
  },

  legendaP2: {
    titulo: 'PLAYER 2 (Teclado)',
    linhas: [
      'Mover:   Setas',
      'Pular:   Seta CIMA',
      'Atq Rapido:  Num1',
      'Atq Forte:   Num2',
      'Defender:    Num3',
      'Especial:    Num5',
      'Counter:     Num4'
    ]
  },

  _keysDown: new Set(),
  _ignoreInputFrames: 0,

  init() {
    window.addEventListener('keydown', e => {
      this._keysDown.add(e.code);
      // Previne scroll com setas/space
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => {
      this._keysDown.delete(e.code);
    });
    console.log('[Controls] Inicializado. Gamepads:', navigator.getGamepads ? 'suportado' : 'nao');
  },

  // Chama a cada frame no game loop
  update() {
    if (this._ignoreInputFrames > 0) this._ignoreInputFrames--;

    // Salva estado anterior
    for (let p = 0; p < 2; p++) {
      this.prev[p].left  = this.state[p].left;
      this.prev[p].right = this.state[p].right;
      this.prev[p].up    = this.state[p].up;
      this.prev[p].down  = this.state[p].down;
      for (let b = 0; b < 5; b++) this.prev[p].btn[b] = this.state[p].btn[b];
    }

    // Zera estado
    for (let p = 0; p < 2; p++) {
      this.state[p].left  = false;
      this.state[p].right = false;
      this.state[p].up    = false;
      this.state[p].down  = false;
      for (let b = 0; b < 5; b++) this.state[p].btn[b] = false;
    }

    // Teclado --------------------------------------------------
    for (const code of this._keysDown) {
      if (this.keymapP1[code]) this._applyKey(0, this.keymapP1[code]);
      if (this.keymapP2[code]) this._applyKey(1, this.keymapP2[code]);
    }

    // Gamepad --------------------------------------------------
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();

    for (let p = 0; p < 2; p++) {
      const pad = pads[p];
      if (!pad || !pad.connected) continue;

      const dz = this.mapping.deadzone;
      const ax = this.mapping.axes;

      // Analogico
      const h = pad.axes[ax[0]] || 0;
      const v = pad.axes[ax[1]] || 0;
      if (h < -dz) this.state[p].left  = true;
      if (h >  dz) this.state[p].right = true;
      if (v < -dz) this.state[p].up    = true;
      if (v >  dz) this.state[p].down  = true;

      // D-pad (botoes 12-15 em gamepads padrao)
      if (pad.buttons[12] && pad.buttons[12].pressed) this.state[p].up    = true;
      if (pad.buttons[13] && pad.buttons[13].pressed) this.state[p].down  = true;
      if (pad.buttons[14] && pad.buttons[14].pressed) this.state[p].left  = true;
      if (pad.buttons[15] && pad.buttons[15].pressed) this.state[p].right = true;

      // Botoes de acao
      for (let b = 0; b < 5; b++) {
        const btn = pad.buttons[this.mapping.buttons[b]];
        if (btn && btn.pressed) this.state[p].btn[b] = true;
      }
    }
  },

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

  // Retorna true apenas no frame em que o botao foi pressionado.
  // Retorna false durante o periodo de graca apos resetInput().
  justPressed(player, action) {
    if (this._ignoreInputFrames > 0) return false;
    const cur  = this._getVal(this.state[player], action);
    const prev = this._getVal(this.prev[player], action);
    return cur && !prev;
  },

  _getVal(s, action) {
    if (action === 'left')  return s.left;
    if (action === 'right') return s.right;
    if (action === 'up')    return s.up;
    if (action === 'down')  return s.down;
    if (action.startsWith('b')) return s.btn[parseInt(action[1])];
    return false;
  },

  getInput(player) {
    return this.state[player];
  },

  // Call when transitioning to SELECT to prevent held keys/buttons from auto-firing.
  // Clears keyboard tracking and snapshots live gamepad state into both state and prev,
  // so justPressed() returns false for any input that is currently held.
  resetInput() {
    this._ignoreInputFrames = 8; // ~133ms — bloqueia justPressed() ate o jogador soltar a tecla
    this._keysDown.clear();

    for (let p = 0; p < 2; p++) {
      this.state[p].left = this.state[p].right = this.state[p].up = this.state[p].down = false;
      for (let b = 0; b < 5; b++) this.state[p].btn[b] = false;

      if (navigator.getGamepads) {
        const pad = navigator.getGamepads()[p];
        if (pad && pad.connected) {
          const dz = this.mapping.deadzone;
          const h  = pad.axes[this.mapping.axes[0]] || 0;
          const v  = pad.axes[this.mapping.axes[1]] || 0;
          if (h < -dz) this.state[p].left  = true;
          if (h >  dz) this.state[p].right = true;
          if (v < -dz) this.state[p].up    = true;
          if (v >  dz) this.state[p].down  = true;
          if (pad.buttons[12] && pad.buttons[12].pressed) this.state[p].up    = true;
          if (pad.buttons[13] && pad.buttons[13].pressed) this.state[p].down  = true;
          if (pad.buttons[14] && pad.buttons[14].pressed) this.state[p].left  = true;
          if (pad.buttons[15] && pad.buttons[15].pressed) this.state[p].right = true;
          for (let b = 0; b < 5; b++) {
            const btn = pad.buttons[this.mapping.buttons[b]];
            if (btn && btn.pressed) this.state[p].btn[b] = true;
          }
        }
      }

      // Mirror to prev — justPressed() = (cur && !prev) = false for held inputs
      this.prev[p].left  = this.state[p].left;
      this.prev[p].right = this.state[p].right;
      this.prev[p].up    = this.state[p].up;
      this.prev[p].down  = this.state[p].down;
      for (let b = 0; b < 5; b++) this.prev[p].btn[b] = this.state[p].btn[b];
    }
  }
};

window.Controls = Controls;
