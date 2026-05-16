# Contexto do Projeto — Arcade Fight

## Sobre o projeto

Sou estudante e estou desenvolvendo um **Projeto Integrador escolar**: um jogo de luta 2D estilo arcade chamado **Arcade Fight**. O projeto vai ser instalado num gabinete arcade físico da escola (com dois joysticks analógicos e botões), mas estou testando primeiro no PC com teclado. Já está funcional, preciso de ajustes pontuais.

## Stack técnica

- **Backend**: Python 3.12 + FastAPI + SQLite + uvicorn (porta 8000)
- **Jogo**: Electron + HTML5 Canvas 2D + JavaScript puro (sem framework)
- **Páginas mobile**: HTML/CSS/JS estático servido pelo backend
- **Resolução base**: 1280x720 (configurável para 800x600, 1280x720, 1360x768, 1600x900, 1920x1080)
- **Persistência**: SQLite (`backend/game.db`) + localStorage para preferências do cliente

## Estrutura de pastas

```
arcade-fight/
├── backend/
│   ├── main.py              # FastAPI (auth, salas, partidas, placar, QR)
│   ├── database.py          # SQLite (tabelas: jogadores, salas, partidas)
│   ├── requirements.txt     # fastapi, uvicorn, passlib, bcrypt, jose, qrcode, Pillow 10.4.0
│   └── game.db              # gerado automaticamente
├── game/
│   ├── main.js              # processo Electron (BrowserWindow + ipcMain resize)
│   ├── index.html           # tela do jogo: canvas + UI HTML sobreposta
│   ├── game.js              # lógica do jogo (Fighter, IA, game loop, estados)
│   ├── controls.js          # teclado + gamepad (futuro)
│   ├── sprites.js           # SpriteManager + PERSONAGENS_DEF
│   ├── api.js               # wrapper fetch para o backend
│   └── package.json         # Electron ^29.0.0
├── site/                    # servido pelo backend em /site/*
│   ├── login.html           # cadastro/login mobile (escaneado via QR)
│   ├── placar.html          # ranking público
│   └── qr_placar.html       # gera QR do placar para impressão
├── sprites/                 # 10 arquivos .png (2 por personagem)
│   ├── espadachim1 - sprites.png
│   ├── espadachim2 - sprites.png
│   ├── lutador1 - sprites.png
│   ├── lutador2 - sprites.png
│   ├── mago1 - sprites.png
│   ├── mago2 - sprites.png
│   ├── vampira1 - sprites.png
│   ├── vampira2 - sprites.png
│   ├── vampiro1 - sprites.png
│   └── vampiro2 - sprites.png
├── install.bat              # instalador automático Windows
└── start.bat                # inicia backend + Electron
```

## Fluxo do jogo

1. **TELA_INICIAL** — botões SINGLE / MULTI + botão configurações (engrenagem canto superior esquerdo).
2. **Dificuldade** (só single) — FÁCIL / MÉDIO / DIFÍCIL.
3. **Criar sala** no backend, mostra **QR code** com URL `http://<ip-local>:8000/site/login.html?sala=<ID>&modo=<modo>`. Botão "voltar" no canto superior esquerdo.
4. Jogadores escaneiam QR no celular, fazem login/cadastro, backend marca sala como `pronto`.
5. Frontend faz polling em `GET /sala/{id}` a cada 1.5s. Quando `status === "pronto"`, esconde QR e entra em **SELECT**.
6. **SELECT** — 5 personagens em cards horizontais; cada player navega com analógico (esq/dir) e confirma com **PULO** (W ou Espaço para P1; Seta Cima ou Numpad 0 para P2). Não pode escolher mesmo personagem. Em single, CPU sorteia personagem diferente do P1.
7. **COUNTDOWN** — contagem regressiva 5→1→LUTA.
8. **FIGHTING** — luta em melhor de 3 rounds. HP, especiais com cooldown 4s, projéteis, blocking (reduz dano 70%), counter (janela de 300ms).
9. **ROUND_END** — 2.5s mostrando "X vence o round".
10. **GAME_OVER** — mensagem "X VENCEU" por 2.5s → depois aparece QR do placar por 10s → volta automaticamente para TELA_INICIAL. Resultado registrado no banco antes.

## Personagens (5)

Definidos em `game/sprites.js` no `PERSONAGENS_DEF`:

| ID | Nome | HP | Vel | Especial | Mecânica |
|---|---|---|---|---|---|
| 0 | Espadachim | 100 | 4.5 | Lâmina Veloz | Investida rápida com dano em área |
| 1 | Lutador | 130 | 3.5 | Impacto Sísmico | Pula e ao cair, causa dano em raio de 160px |
| 2 | Mago | 90 | 4.0 | Tempestade Arcana | Cria 3 projéteis mágicos |
| 3 | Vampira | 110 | 4.2 | Véu de Sangue | Invencibilidade por 2s |
| 4 | Vampiro | 95 | 5.0 | Sombra Veloz | Teleporta atrás do inimigo + ataque |

## Mapeamento de controles (teclado)

Definido em `game/controls.js` em `keymapP1` e `keymapP2`. Cada player tem 4 direções + 5 botões (b0..b4):

**Player 1:**
- A/D = esquerda/direita, W = cima/pulo, S = baixo
- ESPAÇO = pulo (alternativa)
- J = b0 (ataque rápido)
- K = b1 (ataque forte / confirmar menu)
- L = b2 (defender / cancelar menu)
- I = b3 (especial)
- U = b4 (counter)

**Player 2:**
- Setas = direções, Seta Cima = pulo
- Numpad 0 = pulo alternativa
- Numpad 1 = b0, Numpad 2 = b1, Numpad 3 = b2, Numpad 5 = b3, Numpad 4 = b4

Vou remapear para os botões do gabinete arcade depois — o estrutura do `controls.js` foi feita pensando em substituição fácil.

## Navegação nos menus (importante: tudo precisa funcionar via analógico+botões do arcade)

- **Setas/WASD** navegam entre elementos focáveis (botões).
- **Espaço/K/Numpad2/Enter** confirmam.
- **L/Numpad3/ESC** fecham modal de configurações ("voltar").

A navegação é feita 100% via JavaScript no `index.html` (função `tratarTeclaMenu` + `obterElementosFocaveis`).

## Backend — endpoints principais

- `POST /auth/cadastro` — cria conta (nick, bv, senha → bcrypt)
- `POST /auth/login` — retorna JWT
- `POST /sala/criar` — cria sala com UUID curto, retorna QR code base64 + URL com IP local detectado via socket UDP para 8.8.8.8
- `GET /sala/{id}` — status atual da sala (polling)
- `POST /sala/{id}/entrar` — entra na sala usando JWT
- `DELETE /sala/{id}` — cancela sala (botão voltar)
- `POST /partida/resultado` — registra vencedor + pontos
- `GET /placar` — top 20 jogadores
- `GET /placar/qr` — gera QR code base64 para o placar usando IP local (usado tanto no fim de partida como na página `site/qr_placar.html`)

## Estado de tela (HTML)

Variável `_telaAtual` em `index.html` controla qual menu está ativo:
- `'inicial'` — botões SINGLE/MULTI/Config
- `'dificuldade'` — FÁCIL/MÉDIO/DIFÍCIL
- `'qr'` — tela QR code + botão voltar
- `'config-resolucao'` — modal config aba Resolução
- `'config-sobre'` — modal config aba Sobre

Durante FIGHTING/SELECT/COUNTDOWN/ROUND_END, a navegação por teclado é desativada (`tratarTeclaMenu` retorna early) para não interferir com inputs do jogo.

## Eventos customizados entre `game.js` e `index.html`

- `game.js` dispara: `game:lutaIniciou` (no fim do countdown), `game:gameOver` (em `_encerrarPartida`).
- `index.html` dispara: `game:telaInicial` (após o QR do placar de 10s acabar).
- `game.js` ouve `game:telaInicial` para resetar via `_voltarInicio()`.

## Resolução

- Persistida em `localStorage` chave `arcade_resolucao` (formato `"1280x720"`).
- Aplicada via `aplicarResolucao(w, h)` que muda CSS de body/canvas/overlay e usa `ipcRenderer.send('resize-window', {w, h})` para redimensionar a janela do Electron.
- O `main.js` do Electron tem `ipcMain.on('resize-window')` que chama `setResizable(true) → setSize(w,h) → center() → setResizable(false)`.

## Banco de dados (SQLite)

3 tabelas:
- **jogadores**: id, nick (unique), bv (unique), senha_hash, vitorias, pontos, criado_em
- **salas**: id (UUID), modo, jogador1_id, jogador2_id, token_j1, token_j2, status (aguardando/pronto/em_jogo/finalizado), criada_em
- **partidas**: id, sala_id, modo, jogador1_id, jogador2_id, vencedor_id, pontos_j1, pontos_j2, jogada_em

## Sprite sheets

Cada personagem tem 2 sheets PNG (sprite1 e sprite2) com 5 linhas de animação cada (10 animações no total por personagem):
- **Sheet 1**: IDLE, WALK, RUN, JUMP, ATTACK (8 frames cada, mas JUMP e ATTACK só 6)
- **Sheet 2**: ATTACK2, HIT, DEATH, SPECIAL, DEFEND

Carregados em `sprites.js` na classe `SpriteManager`. Tem fallback colorido caso a imagem não carregue.

## Pontos importantes / pegadinhas que aprendi durante o desenvolvimento

1. **A IA sobrescreve `Controls.state[1]` durante FIGHTING em modo single**, mas precisa preservar `Controls.prev[1]` antes para que `justPressed` continue funcionando corretamente.
2. **`api.js` retorna `{ok: true, ...data}`** (spread direto, sem encapsular em `data`). Então `res.sala_id` em vez de `res.data.sala_id`.
3. **Pillow 10.4.0 é obrigatório** para compatibilidade com Python 3.12 + qrcode 7.4.2. Versões mais novas dão erro de build em Windows.
4. **bcrypt 4.0.1 fixado** porque versões 4.1+ têm bug com passlib.
5. **Caminho dos sprites usa `__dirname`** (não hardcoded `C:\...`) para portabilidade.
6. **SPRITES_PATH** é gerado dinamicamente no início do `game.js` com fallback para `./sprites`.
7. **Gravidade é aplicada durante stun e ataque** para personagem não ficar flutuando.
8. **Botão "voltar" no menu de config funciona com tecla L (P1) ou Numpad3 (P2)** — equivalente ao botão "defender" do gabinete.
9. **`gerar_qr_base64()` usa `qrcode.image.pure.PyPNGImage`** porque o factory padrão (Pillow) tinha problemas; o PyPNG não tem dependências nativas.
10. **O endpoint `/placar/qr` foi criado** para gerar o QR do placar com o IP local correto em tempo de execução, em vez de hardcoded `localhost:8000` (que não funcionava no celular).

## Problemas conhecidos / coisas que NÃO funcionaram durante o dev

- **Celular não acessava o backend mesmo na mesma rede Wi-Fi**: era porque o PC estava em sub-rede diferente do celular (ex: PC `192.168.0.x` e celular `192.168.1.x`). Solução foi reconectar o PC e/ou configurar IP fixo no Windows.
- **Firewall do Windows** bloqueia conexões externas na porta 8000 por padrão. Precisa criar regra de entrada (TCP 8000, permitir).
- **localStorage não funciona** se Electron for aberto com `file://` direto em modo restrito — mas a config padrão do `main.js` permite.

## O que está funcionando agora

✅ Instalador automático (Python + Node + venv + pip + npm)
✅ Backend FastAPI com auth JWT, salas, partidas, placar
✅ QR code para login mobile
✅ Polling de status de sala
✅ Tela de seleção de personagens com cursor por player, bloqueio de personagem repetido, preview de sprite, info dos players
✅ Combate funcional (5 personagens, especiais, projéteis, blocking, counter)
✅ IA com 3 dificuldades
✅ Best of 3 rounds + game over com QR do placar
✅ Modal de configurações com abas Resolução e Sobre
✅ Resolução salva em localStorage
✅ Navegação 100% por teclado/analógico (preparado para mapear ao arcade)
✅ Legendas de comando aparecendo só durante a luta
✅ Botão voltar em telas intermediárias

## O que eu preciso de ajuda agora (preencher antes de mandar)

[DESCREVA AQUI O QUE VOCÊ QUER QUE A IA FAÇA — alguns exemplos:]

- "Quero adicionar 3 cenários diferentes que mudam o fundo a cada round."
- "Quero adicionar efeitos sonoros para ataques, especiais, hit e game over."
- "Quero adicionar 2 novos personagens com mecânicas únicas."
- "Quero remapear os controles para os botões do gabinete arcade (vou listar os índices do gamepad)."
- "Quero criar um modo torneio com chaveamento."
- "Tem um bug em X — descreva..."

## Como me ajudar

- Se a alteração mexer em **menos de 5 arquivos**, me dê apenas os **trechos** alterados (não o arquivo inteiro) e onde colar.
- Se mexer em **mais de 5 arquivos** ou for reestruturação grande, me avise e me dê o pacote completo.
- Antes de mudanças grandes, me pergunte sobre decisões que afetam o design (ex: "som vai ser MP3 ou WAV?", "cenários vão ser fixos ou aleatórios?").
- Sempre que possível me explique **por que** está mudando algo, não só o que.
