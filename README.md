# ARCADE FIGHT

> Jogo de luta 2D estilo arcade, desenvolvido como Projeto Integrador Escolar no IFSP.

---

## O QUE É

Arcade Fight é um jogo de luta 2D inspirado nos clássicos dos fliperamas dos anos 90. Dois jogadores escolhem entre cinco personagens únicos e se enfrentam em combates no melhor de dois rounds. O projeto foi desenvolvido para rodar em um gabinete arcade físico da instituição, mas funciona normalmente em qualquer computador com Windows.

---

## PERSONAGENS

| Personagem | Estilo | Especial |
|---|---|---|
| **Espadachim** | Veloz, cortes rápidos | Lâmina Veloz — investida com corte em área |
| **Lutador** | Resistente, golpes pesados | Impacto Sísmico — salta e causa dano em área ao pousar |
| **Mago** | Longa distância | Tempestade Arcana — dispara 3 projéteis simultâneos |
| **Vampira** | Defensiva, invencível | Véu de Sangue — 2 segundos de invencibilidade total |
| **Vampiro** | Mobilidade extrema | Sombra Veloz — teleporte atrás do inimigo seguido de ataque |

---

## MECÂNICAS DE JOGO

- **Sistema de rounds** — melhor de 2 rounds decide o vencedor
- **Barra de especial** — carregada causando dano; usa o especial quando cheia
- **Bloqueio** — reduz o dano recebido para 30%
- **Counter** — janela de 300ms que reverte o golpe com 1,5× de dano para o atacante
- **IA adaptativa** — três níveis: fácil, médio e difícil, com reações e agressividade diferentes
- **Projéteis** — Mago dispara orbes independentes que percorrem o cenário

---

## COMO FUNCIONA

O jogo verifica automaticamente a conexão com a internet ao iniciar. Se houver conexão, conecta ao servidor online e permite que os jogadores façam login pelo celular escaneando um QR code único gerado para aquela sessão. Após o login, os jogadores escolhem seus personagens e a luta começa. Ao final, o resultado é registrado no banco de dados e o ranking é atualizado.

Se não houver conexão, o jogo abre no modo offline com jogadores identificados como convidados, sem salvar resultados.

Também é possível iniciar a partida sem login clicando em **"Jogar sem Login"** na tela do QR code.

---

## MODOS DE JOGO

| Modo | Descrição |
|---|---|
| **Single Player** | Um jogador humano contra a Inteligência Artificial |
| **Multi Player** | Dois jogadores humanos no mesmo gabinete |
| **Offline** | Qualquer modo, sem conexão — nenhum resultado é salvo |

---

## CONTROLES

### Teclado

| Ação | Player 1 | Player 2 |
|---|---|---|
| Mover | A / D | ◄ / ► |
| Pular | W / Espaço | ▲ |
| Ataque rápido | J | Numpad 1 |
| Ataque forte | K | Numpad 2 |
| Bloquear | L | Numpad 3 |
| Especial | I | Numpad 5 |
| Counter | U | Numpad 4 |

### Controle Arcade (mapeamento padrão)

| Ação | P1 | P2 |
|---|---|---|
| Pular | 🟢 Verde | 🟢 Verde |
| Ataque rápido | 🟡 Amarelo | 🟡 Amarelo |
| Ataque forte | ⚫ Preto | ⚫ Preto |
| Bloquear | 🔴 Vermelho | 🔴 Vermelho |
| Especial | 🔵 Azul | 🔵 Azul |
| Singleplayer | — | L2 |
| Multiplayer | — | R2 |

> O mapeamento dos controles pode ser personalizado a qualquer momento no **Menu de Configurações** durante a tela inicial.

---

## MENU DE CONFIGURAÇÕES

Acessado pelo botão ⚙ no canto superior esquerdo da tela inicial. Possui três abas:

- **Controles** — remapeamento interativo de todos os botões para gamepad ou teclado/mouse. Clique em um botão, pressione o físico desejado, o mapeamento é aplicado imediatamente.
- **Som** — controle de volume das músicas (0–100%). O valor é salvo automaticamente entre sessões.
- **Créditos** — informações sobre o projeto, repositório e ferramentas utilizadas.

---

## SISTEMA DE ÁUDIO

O jogo possui duas camadas de áudio independentes:

**Trilhas sonoras (SoundManager)**
- Menu inicial, configurações e seleção de personagem: `menuInicial.mp3`
- Durante a partida: `luta.mp3`
- Game Over e tela de resultados: `fimDoJogo.mp3`
- Transição suave com crossfade de 1,5 segundos entre as faixas

**Efeitos sonoros dos personagens (SFXManager)**
- Cada personagem possui 5 efeitos: ataque 1, ataque 2, especial, dano recebido e morte
- Tocam somente durante a partida, em canais independentes da trilha sonora

---

## TECNOLOGIAS UTILIZADAS

**Desktop / Frontend**
- Electron.js — empacotamento do aplicativo desktop
- HTML5 Canvas — renderização do jogo em tempo real
- JavaScript puro — lógica do jogo, física, IA, controles
- Web Gamepad API — suporte a controles arcade físicos

**Backend**
- Python 3.12 + FastAPI — servidor de API REST
- PostgreSQL — banco de dados de jogadores e resultados
- Render.com — hospedagem do servidor e banco de dados

**Mobile (páginas de login)**
- HTML / CSS / JavaScript — acessadas via QR code pelo navegador do celular

---

## FERRAMENTAS DE IA UTILIZADAS

| Ferramenta | Uso |
|---|---|
| **Claude AI (Anthropic)** | Geração, revisão e refatoração de código |
| **Suno AI** | Composição das trilhas sonoras do jogo |
| **ChatGPT (OpenAI)** | Geração de imagens e pesquisa de conteúdo |

---

## RECURSOS DE ÁUDIO E APRENDIZADO

- **Pixabay** — sons dos sprites e efeitos sonoros
- **CursoemVideo** — lógica de programação e JavaScript
- **Alura** — desenvolvimento web e boas práticas
- **MDN Web Docs** — Canvas API, Web Gamepad API, documentação das APIs

---

## INSTALAÇÃO

1. Baixe o repositório e extraia o `.zip`
2. Execute o `install.bat` **como Administrador**
3. O instalador verifica e instala automaticamente Python 3.12 e Node.js caso necessário
4. Cria o ambiente virtual Python, instala dependências e cria atalho na Área de Trabalho
5. Ao final, oferece a opção de abrir o jogo diretamente

Após instalado, use o atalho **"Arcade Fight"** na Área de Trabalho ou execute `start.bat`.

> O servidor online pode demorar alguns segundos para inicializar. O `start.bat` tenta conexão por até 4 tentativas antes de entrar automaticamente em modo offline.

---

## ESTRUTURA DO PROJETO

```
arcade-fight/
├── game/              # Aplicativo Electron (frontend + lógica do jogo)
│   ├── main.js        # Processo principal do Electron
│   ├── index.html     # UI, menus e orquestração
│   ├── game.js        # Lógica do jogo, física, IA
│   ├── controls.js    # Sistema de input (teclado + gamepad)
│   ├── sprites.js     # Gerenciador de sprites e definições dos personagens
│   └── api.js         # Comunicação com o backend
├── backend/           # Servidor FastAPI (Python)
│   ├── main.py        # Aplicação FastAPI
│   └── requirements.txt
├── sprites/           # Sprites dos personagens e imagem de fundo
├── sound/             # Trilhas sonoras e efeitos sonoros
│   ├── menuInicial.mp3
│   ├── luta.mp3
│   ├── fimDoJogo.mp3
│   ├── Espadachim/    # 5 efeitos sonoros por personagem
│   ├── Lutador/
│   ├── Mago/
│   ├── Vampira/
│   └── Vampiro/
├── install.bat        # Instalador completo
└── start.bat          # Inicializador do jogo
```

---

## DEPLOY DO SERVIDOR

O servidor está hospedado no **Render.com** com deploy automático a cada push na branch `main`. O banco de dados PostgreSQL utiliza o plano gratuito da mesma plataforma.

URL do servidor: `https://arcade-fight-ifsp.onrender.com`

---

## DESENVOLVIDO POR

**Marcelo L. G. Filho** — Projeto Integrador Técnico — IFSP

Repositório: [github.com/marcelod6427/Arcade-Fight-IFSP](https://github.com/marcelod6427/Arcade-Fight-IFSP)
