# Changelog — Alterações Solicitadas

Registro de todas as modificações realizadas nesta sessão de desenvolvimento.

---

## 1. Retratos na Tela de Seleção de Personagens

**Arquivos modificados:** `game/sprites.js`, `game/game.js`

### Problema
A tela de seleção exibia o **primeiro frame da animação idle** de cada personagem nos slots, o que resultava em uma imagem pequena e pouco representativa.

### Solução
Cada pasta de personagem em `sprites/` já continha um arquivo PNG de retrato dedicado com o mesmo nome da pasta (ex: `sprites/espadachim/espadachim.png`). Passamos a usar esse retrato estático na seleção.

### O que foi alterado

**`game/sprites.js` — carregamento do retrato (`carregar()`)**
- Durante o carregamento dos sprites, o `SpriteManager` agora também carrega `sprites/{pasta}/{pasta}.png` como `p.retrato` para cada personagem, em paralelo com as demais animações.

**`game/sprites.js` — novo método `drawRetrato()`**
- Novo método que renderiza o retrato estático ajustado para preencher a área do slot, mantendo a proporção original da imagem (object-fit: cover).
- Fallback automático para `drawPreview()` (frame idle) caso o arquivo de retrato não exista.

**`game/game.js` — `_drawSelect()`**
- Substituída a chamada `spriteManager.drawPreview()` por `spriteManager.drawRetrato()`.
- A área de exibição foi ampliada para ocupar quase todo o slot (`slotW - 16` × `slotH - 56`), deixando espaço apenas para o nome e stats na parte inferior.

---

## 2. Ajustes Visuais nos Retratos da Seleção

**Arquivos modificados:** `game/sprites.js`, `game/game.js`

### O que foi alterado

**`game/sprites.js` — `drawRetrato()` — borda arredondada**
- O clip do canvas foi alterado de `ctx.rect()` (retângulo simples) para um caminho com `quadraticCurveTo`, criando um **border radius de 20px** em todos os cantos do retrato.

**`game/game.js` — `_drawSelect()` — altura e margem**
- A altura dos retratos foi reduzida em **5px** (de `slotH - 56` para `slotH - 64`).
- Adicionada uma **margem inferior de 3px** visual entre o retrato e a área de texto abaixo (o valor 8 total = 5px altura + 3px margem está embutido no cálculo `slotH - 64`).

---

## 3. Configuração de Teclado/Mouse para Botões Single e Multi Player

**Arquivos modificados:** `game/controls.js`, `game/index.html`

### Problema
No painel de configurações (aba Controles), ao selecionar o modo **Teclado/Mouse**, as linhas de **Singleplayer** e **Multiplayer** apareciam como desabilitadas (`—`), pois eram consideradas exclusivas do gamepad (botões L2/R2 físicos). Jogadores de teclado não tinham como configurar atalhos de menu.

### Solução
As ações `l2` (single player) e `r2` (multi player) foram integradas ao sistema de mapeamento de teclado, com teclas padrão e possibilidade de remapeamento pelo painel de configurações.

### O que foi alterado

**`game/controls.js` — teclas padrão para single/multi**

| Jogador | Ação          | Tecla padrão |
|---------|---------------|--------------|
| P1      | Single Player | `F1`         |
| P1      | Multi Player  | `F2`         |
| P2      | Single Player | `F3`         |
| P2      | Multi Player  | `F4`         |

Essas entradas foram adicionadas a `keymapP1` e `keymapP2` em `controls.js`.

**`game/index.html` — `criarLinha()` — remoção da restrição**
- Removida a condição `naoMapeavel` que desativava as linhas de `l2`/`r2` em modo teclado.

**`game/index.html` — `_renderizarConfig()` — novo layout em modo teclado**
- Em modo **Gamepad**: mantido o comportamento original (uma linha exibindo os botões L2/R2 do P2).
- Em modo **Teclado/Mouse**: exibidas **duas linhas** (Singleplayer e Multiplayer), cada uma com P1 na coluna esquerda e P2 na coluna direita — padrão consistente com o restante da grade.

**`game/index.html` — `tratarTeclaMenu()` — detecção dos atalhos**
- Ao pressionar uma tecla fora do painel de configurações, a função agora verifica se ela está mapeada como `l2` ou `r2` em qualquer um dos keymaps.
- Se sim, chama `_ativarModoViaBotao('single')` ou `_ativarModoViaBotao('multi')` — o mesmo caminho que os botões L2/R2 do gamepad usam.
- A verificação é ignorada quando `_telaAtual === 'config'` para evitar conflito com o processo de remapeamento.

**`game/index.html` — `_resetarSubMenuAtual()` — padrões do teclado**
- O botão "⟲ PADRÃO" agora também restaura `F1`/`F2` para P1 e `F3`/`F4` para P2 ao resetar os controles de teclado.

---

## Resumo dos Arquivos Modificados

| Arquivo              | Motivo da alteração                                              |
|----------------------|------------------------------------------------------------------|
| `game/sprites.js`    | Carregamento de retratos, método `drawRetrato()`, clip arredondado |
| `game/game.js`       | Uso de `drawRetrato()`, ajuste de altura e margem               |
| `game/controls.js`   | Adição de teclas padrão `l2`/`r2` nos keymaps de P1 e P2       |
| `game/index.html`    | Config de teclado para single/multi, layout do painel, detecção de atalhos |



a função de sair da partida apertando os botões de single e multiplayer não está funcionando, quando eu entrasse no modo offline (ou sem guardar informações dos jogadores) deveria aparecer uma confirmação do jogador se ele realmente quer voltar para o menu com as opções sim ou não e o fundo em volta da notificação mostrando o jogo pausado de forma meio embaçada.
e qunado estiver no modo online a mesma coisa porem a notificação deve abordar algo como "os dados nao seram salvos se retornar ao menu agora..." com as opçõse de sim ou nao

eu identifiquei o erro que você deixou, não é para no final da partida o player clicar no botao de single ou multi para voltar o menu, e sim durante as partidas, como foi especificado acima

outro porem, deixe o height das imagens do menu de seleção de personagens noraml novamente, nao ficou bom tirar os px
