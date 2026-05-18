# ARCADE FIGHT

> Um jogo de luta 2D multiplayer desenvolvido como Projeto Integrador Escolar no IFSP.

---

## O QUE É

Arcade Fight é um jogo de luta inspirado nos clássicos dos fliperamas dos anos 90. Dois jogadores escolhem entre cinco personagens únicos e se enfrentam em combates no melhor de três rounds. O projeto foi desenvolvido para rodar em um gabinete arcade físico da instituição, mas também funciona normalmente em qualquer computador com Windows.

---

## COMO FUNCIONA

O jogo roda como um aplicativo de desktop. Ao iniciar, ele verifica automaticamente se há conexão com a internet. Se houver, conecta ao servidor online e permite que os jogadores façam login pelo celular escaneando um QR code. Se não houver conexão, o jogo abre normalmente no modo offline com os jogadores identificados como convidados, sem salvar resultados.

O fluxo de uma partida online é simples: o jogo gera um QR code único para aquela sessão, os jogadores escaneiam com o celular, fazem login ou se cadastram, escolhem seus personagens e a luta começa. Ao final, o resultado é registrado automaticamente no banco de dados e o ranking é atualizado.

---

## TECNOLOGIAS UTILIZADAS

O projeto é dividido em três partes que se comunicam entre si.

O **servidor** foi construído com Python e FastAPI, responsável por gerenciar contas de jogadores, criar as salas de jogo, gerar os QR codes e registrar os resultados. Os dados são armazenados num banco PostgreSQL hospedado no Render.

O **aplicativo** roda com Electron, que permite transformar páginas web em um programa de desktop. A lógica do jogo, as animações, a física e a inteligência artificial foram desenvolvidas em JavaScript puro, desenhando tudo em tempo real no Canvas do HTML5.

As **páginas mobile** são acessadas pelo celular através do QR code e permitem que os jogadores façam login ou cadastro diretamente pelo navegador do telefone, sem precisar instalar nada.

---

## INTELIGÊNCIA ARTIFICIAL

O modo single player conta com uma IA em três níveis de dificuldade. No nível fácil ela reage de forma lenta e pouco agressiva. No médio começa a pressionar com mais frequência. No difícil reage rapidamente e usa ataques especiais com muito mais eficiência.

---

## MODO OFFLINE

Quando o jogo detecta ausência de internet na inicialização, uma notificação aparece informando que as partidas não serão salvas. O jogador pode tentar reconectar reiniciando o aplicativo ou continuar jogando normalmente como convidado. Toda a mecânica de jogo funciona identicamente no modo offline.

---

## DEPLOY

O servidor está hospedado gratuitamente no Render e o banco de dados utiliza o plano gratuito do PostgreSQL oferecido pela mesma plataforma. O código é versionado no GitHub e o deploy é feito automaticamente a cada atualização enviada para o repositório.

---

## INICIALIZAÇÃO

Para fazer a inicialização do projeto, faça o download do mesmo, baixe o .zip deste repositóio e extraia, abra como administrador o arquivo install.bat, após a instalação de todas as necessidades do jogo, ele permitira abrir direto do install.bat ou abrir pelo start.bat.
-> Existe a possibilidade de o site que estou usando para hospedar as API's não inicializar tão rápido, caso isso ocorra, tente fechar os arquivos abertos e iniciar novamente depois de 10 segundos o start.bat.

## DESENVOLVIDO POR

Marcelo L. G. Filho — Projeto Integrador Técnico — IFSP

Repositório: https://github.com/marcelod6427/Arcade-Fight-IFSP
