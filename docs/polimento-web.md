# Polimento do dashboard web (fase 6)

Passada de "quebrar, auditar, corrigir" no `apps/web`. Decisões registradas no ADR-032 de
`docs/decisoes.md`. Capturas em `docs/screenshots/web/` (`pior-caso-*-antes-*` e `-depois-*`).

## Como reproduzir o pior caso

Com `corepack pnpm --filter @sobra/web dev`, abra qualquer tela com `?dados=pior` (ou use o
seletor fixo no rodapé, que só existe em desenvolvimento). Cenários: **Dados demo** (API real),
**Pior caso**, **Usuário novo**, **Uma transação**, **Sem rede** e **Erro 500**. Os dados entram
pelo `fetch` do cliente (`src/dev/scenarios.ts`), o mesmo caminho dos testes. O pior caso tem
descrições de 120 caracteres (o limite da API), nomes de conta e categoria de 120 caracteres (o
contrato de resposta não limita), uma palavra de 120 letras sem espaço, emoji, japonês,
R$ 1.000.000.000,00, −R$ 999.999.999,99, R$ 0,01, 15 categorias de despesa, orçamento de 1000% e
de 0%, 1.284 transações e uma importação de conta que não existe mais.

## O que quebrou e como foi corrigido

| Tela       | Quebra                                                                                         | Correção                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Painel     | KPI "R$ 1.000.000.000,00" invadia a célula vizinha (1440) e saía da tela (390)                 | o número encolhe para caber, inteiro (`lib/fit.ts`, unidades `cqi`)                                                  |
| Painel     | Cartão "Orçado × realizado" com nome sem espaço empurrava a página 480 px para o lado          | `min-width: 0` e `overflow-wrap: anywhere` no nome; o painel mostra 6 orçamentos e um link para a lista              |
| Painel     | Rótulo "−R$ 999.999.999,65" no fim da linha do saldo saía do cartão; eixo "−999,9 mil" cortado | rótulo compacto a partir de R$ 100 mil ("−R$ 1 bi"), margens dos eixos pelo rótulo mais longo                        |
| Painel     | Legenda da régua e gráfico por categoria truncavam sem forma de ler o nome                     | `title` com o nome inteiro; no celular a barra vai para a linha de baixo                                             |
| Painel     | Resultado da régua espremido em três linhas entre as pontas (390)                              | linha própria quando a régua é estreita (`@container`)                                                               |
| Transações | Tabela 850 px mais larga que o cartão (conta e descrição longas)                               | `table-layout: fixed`, truncamento com `title`, coluna de valor para R$ 1 bi; cabeçalho "Valor" alinhado aos valores |
| Transações | No celular a descrição virava "Pagament…"                                                      | descrição em até 2 linhas                                                                                            |
| Transações | "1–20 de 1284"                                                                                 | contagens com separador ("1.284")                                                                                    |
| Categorias | Botão "Nova" de Receitas empurrado para fora (1440, 390)                                       | colunas `minmax(0, …)`, nomes em até 2 linhas com `title`                                                            |
| Contas     | Nome de 120 caracteres em uma palavra por linha ao lado do saldo (390)                         | nome em até 2 linhas com `title`                                                                                     |
| Orçamentos | Ações "Editar/Remover" pulavam para a esquerda quando o status quebrava                        | ações sempre à direita                                                                                               |
| Importar   | Prévia mais larga que o cartão; seletor de categoria esmagado para "Des"                       | colunas fixas, descrição e erro quebram na própria coluna                                                            |
| Importar   | "4998 importados", conta apagada aparecia como "conta"                                         | "4.998 importados", singular/plural, "conta removida"                                                                |
| Edição     | Observações (até 500 caracteres) num campo de uma linha                                        | campo de várias linhas                                                                                               |

Mantido sem mudança (já resistia): régua com 15 categorias (agrupa em "Outras"), gráfico por
categoria (agrupa em "Outras (9)"), estados vazio, sem rede e erro 500 com "Tentar de novo",
emoji e japonês, valores com sinal U+2212.

## Animações (improve-animations → animate)

O movimento já seguia o ADR-026. Corrigido: com "Reduzir movimento" o painel lateral e o menu
compacto faziam fade de 240/180 ms (agora 120 ms, sem deslocamento, como pede o DESIGN.md); o
fundo escurecido do painel aparecia de golpe sob o painel que deslizava (agora entra junto, só
opacidade). Toasts: o Sonner já corta animação com `prefers-reduced-motion`. Nenhuma propriedade
cara animada (só `transform`, `opacity` e cor), então `animation-performance` não teve o que
corrigir.

## impeccable (audit + polish)

Detector: 0 achados no código de produção (os de cor estão em fixtures de teste e no seletor de
desenvolvimento). Nas telas: hachura do estouro e travessões são falsos positivos (a hachura é
decisão do DESIGN.md; os travessões vêm dos dados). Corrigidos: placeholder com 3,7:1 no tema
escuro (agora `text.tertiary`), coluna do painel 177% mais alta que a vizinha (orçamentos
limitados a 6), barra de rolagem e cursor de texto nas cores da paleta, zero dos KPIs no tom de
zero.

## Acessibilidade

- **axe-core** no Vitest (`src/a11y.test.tsx`) em todas as telas com dados de pior caso, painel de
  edição aberto, vazio e erro 500: 0 violações sérias/críticas. No Chrome real
  (`@axe-core/playwright`, demo e pior caso, claro/escuro, 1440/390): 0 violações de qualquer
  impacto, contraste incluído.
- **Teclado:** foco visível em todos os 25 primeiros alvos de cada tela; Esc no menu compacto
  devolve o foco ao botão; fechar o painel de edição devolve o foco à linha que o abriu (antes ia
  para o `<body>`: as colunas da tabela eram recriadas a cada render e remontavam as células).
- **Leitor de tela:** região de toasts e botão de fechar em português; `h1` também nas telas de
  sessão (carregando / erro).
- **Alvos de toque ≥ 44 px** no layout de celular, mesmo com ponteiro fino: busca, "por página",
  setas da paginação, marca no topo e o link "Ver todos".
- **Zoom/reflow:** sem rolagem horizontal a 720 px (1440 a 200%) e a 320 px.

## Bundle

Antes: entrada de 593 KB (182 KB gzip), aviso de chunk > 500 KB. React DOM, React Router e Zod
são a maior parte (o cliente valida toda resposta com Zod, então ele fica). Depois: telas de
entrar/criar conta sob demanda (react-hook-form sai da entrada) e React + Router num chunk
próprio: 235 KB + 311 KB (69 + 98 KB gzip), 546 KB no total, sem aviso.

## O que ficou de fora

- **Linha nova entrando com 240 ms** (DESIGN.md, "Lançamento salvo"): o id otimista é trocado
  pelo id da API, o que remonta a linha e tocaria a entrada duas vezes; exige chave estável no
  cliente (pacote `@sobra/client`, fora do escopo desta rodada).
- **Sem rede repete o erro em cada cartão do painel.** Correto pela regra "o erro fica no lugar do
  bloco", mas uma faixa única seria mais calma; depende da decisão em aberto sobre modo offline.
- **Usuário sem nenhuma conta** vê "Lance o primeiro gasto", mas não consegue lançar sem conta. A
  API cria "Carteira" no cadastro, então só acontece se a pessoa apagar todas; vale um vazio
  próprio que leve a "Nova conta".
- **Spinner com "Reduzir movimento"** continua girando, mais devagar: indicador de progresso é
  movimento essencial.
- **Aviso do React Compiler** sobre `useReactTable` (biblioteca incompatível) segue como estava.
