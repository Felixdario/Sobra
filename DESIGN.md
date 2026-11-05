---
name: Sobra
description: Controle financeiro pessoal — lançar no celular, entender no computador, saber quanto sobra.
colors:
  concreto-50: '#F1F1EE'
  concreto-0: '#FFFFFF'
  concreto-100: '#E9E9E5'
  concreto-150: '#E1E1DC'
  concreto-200: '#D4D4CE'
  concreto-500: '#7B7B74'
  concreto-600: '#5E5E58'
  concreto-700: '#474743'
  concreto-800: '#31312E'
  concreto-900: '#1C1C1A'
  concreto-950: '#141413'
  cobalto-600: '#1C50B5'
  cobalto-300: '#93B1FF'
  verde-600: '#075027'
  verde-300: '#7BD69A'
  vermelho-600: '#8A1B14'
  vermelho-300: '#FF9A8C'
  ocre-700: '#7A4A00'
  ocre-500: '#B17000'
  ocre-300: '#E8C547'
  data-1-cobalto: '#1C50B5'
  data-2-ocre: '#B17000'
  data-3-ceu: '#32A0C5'
  data-4-rosa: '#A43068'
  data-5-oliva: '#79821D'
typography:
  figure-xl:
    fontFamily: 'Archivo, system-ui, sans-serif'
    fontSize: '48px'
    fontWeight: 600
    lineHeight: '52px'
    letterSpacing: '-0.03em'
    fontFeature: '"tnum" 1, "lnum" 1'
  figure-lg:
    fontFamily: 'Archivo, system-ui, sans-serif'
    fontSize: '36px'
    fontWeight: 600
    lineHeight: '40px'
    letterSpacing: '-0.025em'
    fontFeature: '"tnum" 1, "lnum" 1'
  figure-md:
    fontFamily: 'Archivo, system-ui, sans-serif'
    fontSize: '28px'
    fontWeight: 600
    lineHeight: '34px'
    letterSpacing: '-0.02em'
    fontFeature: '"tnum" 1, "lnum" 1'
  headline:
    fontFamily: 'Archivo, system-ui, sans-serif'
    fontSize: '24px'
    fontWeight: 600
    lineHeight: '32px'
    letterSpacing: '-0.015em'
  title:
    fontFamily: 'Archivo, system-ui, sans-serif'
    fontSize: '20px'
    fontWeight: 600
    lineHeight: '28px'
    letterSpacing: '-0.01em'
  body:
    fontFamily: 'Archivo, system-ui, sans-serif'
    fontSize: '16px'
    fontWeight: 400
    lineHeight: '24px'
  body-sm:
    fontFamily: 'Archivo, system-ui, sans-serif'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: '20px'
  label:
    fontFamily: 'Archivo, system-ui, sans-serif'
    fontSize: '13px'
    fontWeight: 500
    lineHeight: '18px'
    letterSpacing: '0.005em'
  caption:
    fontFamily: 'Archivo, system-ui, sans-serif'
    fontSize: '12px'
    fontWeight: 400
    lineHeight: '16px'
    letterSpacing: '0.01em'
rounded:
  xs: '2px'
  sm: '4px'
  md: '6px'
  lg: '8px'
  sheet: '16px'
  full: '9999px'
spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '6': '24px'
  '8': '32px'
  '10': '40px'
  '12': '48px'
  '16': '64px'
components:
  button-primary:
    backgroundColor: '{colors.concreto-950}'
    textColor: '{colors.concreto-0}'
    rounded: '{rounded.md}'
    height: '44px'
    padding: '0 16px'
  button-primary-hover:
    backgroundColor: '{colors.concreto-800}'
  button-secondary:
    backgroundColor: '{colors.concreto-100}'
    textColor: '{colors.concreto-950}'
    rounded: '{rounded.md}'
    height: '44px'
  card:
    backgroundColor: '{colors.concreto-0}'
    rounded: '{rounded.lg}'
    padding: '16px'
  budget-track:
    backgroundColor: '{colors.concreto-150}'
    rounded: '{rounded.sm}'
    height: '10px'
---

# Design System: Sobra

> Fonte da verdade dos valores: `packages/tokens` (`@financas/tokens`). Este documento explica
> **como** usar; quando um número aqui divergir do pacote, o pacote vence e este arquivo está
> desatualizado. Referência visual gerada dos tokens: `docs/design/tokens.html`.
> Os valores acima são do tema claro; o escuro está em `packages/tokens/src/themes.ts`.

## Overview

**Creative North Star: "Concreto e azulejo"**

O mundo visual vem da tradição gráfica brasileira que a usuária já leu a vida inteira sem nomear:
o concretismo e os programas de identidade modernistas (Geraldo de Barros, Lygia Pape, Alexandre
Wollner, Aloísio Magalhães — que desenhou cédulas do cruzeiro), o concreto aparente da arquitetura
paulista e o azulejo cobalto de Athos Bulcão em Brasília. Desse mundo o produto toma só quatro
coisas, como manda uma tela de trabalho: **tipografia** (uma grotesca precisa), **paleta** (chão de
concreto, tinta, um único azul), **densidade** (grade de 4px, sem enfeite) e **um gesto
assinatura** — a _régua do mês_. Navegação, controles e layout são os padrões de cada plataforma.

O produto é de uso: no celular ela lança um gasto em segundos; no computador ela analisa. A
interface é calma e exata. A cor vai para o dado, não para o cromo: o cromo é tinta sobre concreto;
o cobalto marca o dado principal da tela (a sobra, o mês corrente, a série do saldo), links e foco;
verde aparece só em entrada de dinheiro, vermelho só em dívida e estouro.

**Key Characteristics:**

- Chão de concreto (`#F1F1EE` / `#141413`), cartões brancos ou um tom acima, sem sombra em repouso.
- Archivo em três pesos; algarismos tabulares e lineares em todo número.
- Um único matiz (cobalto) no cromo; paleta de dados de cinco matizes validada para daltonismo.
- Planos chapados, cantos curtos (6–8px), réguas em vez de anéis e velocímetros.
- Valores com sinal explícito (+ / −), nunca só cor.

### Por que esta direção (registro das skills)

- **impeccable** (`init` → `shape` → `new-work`, modo _Operate_): sorteio de direção
  `seed:ba8f5bcef7295068`, índice 5 da lista própria (ordem por ressonância: cédulas do Real,
  caderninho de contas, carnê de crediário, plaquinhas de preço de feira, **concretismo e
  identidade modernista brasileira**, sinalização do metrô de SP, calçadão de Burle Marx). Os
  desafiantes do catálogo foram fundidos e julgados; todos perderam nos dois eixos (identificação do
  público e clareza do produto) e doaram uma disciplina cada (ver `docs/decisoes.md`, ADR-021).
- **design-taste-frontend** (fluxo de _app screens_): estilo `achromatic-ledger` (semente 486094911) — cromo sem cor, dinheiro em tinta, um matiz no elemento de dado principal, sinal
  pequeno na variação. Fonte do sorteio (Geist) **substituída por Archivo** por motivo de marca
  (Geist/Inter lidos como "kit" pelos jurados do próprio estudo da skill e o dono pediu explicitamente
  evitar "Inter em tudo sem intenção"); a "cara" escolhida foi o chão de concreto + o cobalto no
  dado principal.
- **dataviz**: paleta categórica gerada por busca exaustiva de ordem e validada com
  `validate_palette.js` nos dois temas.

## Colors

Restrita: neutros de concreto + um azul; verde, ocre e vermelho são estados, não decoração.

### Primary

- **Cobalto** (`#1C50B5` claro / `#93B1FF` texto escuro / `#366BD3` dado escuro): o dado principal
  de cada tela (plano da sobra na régua, linha do saldo total, barra do mês corrente), links, anel de
  foco, seleção (`#DCE5FA` / `#14213F`). Nunca em botão primário nem em fundo de cartão.

### Neutral (concreto)

- **Chão** `#F1F1EE` (claro) / `#141413` (escuro): fundo do app. Neutro com um fio de calor
  (croma OKLCH < 0,01) — explicitamente não é creme.
- **Superfície** `#FFFFFF` / `#1C1C1A`: cartões, listas, folhas.
- **Rebaixado** `#E9E9E5` / `#0E0E0D`: campos, linha em hover, trilho de controle segmentado.
- **Elevado** `#FFFFFF` / `#262624`: menus e popovers (no escuro a profundidade vem do tom).
- **Tinta** `#141413` / `#F1F1EE`: texto principal, valores, botão primário.
- **Texto secundário** `#474743` / `#B9B9B2`; **terciário** `#5E5E58` / `#9A9A93`.
- **Bordas** sutil `#E1E1DC` / `#262624`, padrão `#D4D4CE` / `#31312E`, forte (campos) `#7B7B74`.

### Estados e dinheiro

- **Entrada** (`money.income`) `#075027` / `#7BD69A`: receitas, "sobrou", variação boa. Sempre com
  "+".
- **Gasto** (`money.expense`) = tinta. Despesa comum não é vermelha: é o uso normal do dinheiro.
  Sempre com "−" (U+2212).
- **Transferência** (`money.transfer`) `#5E5E58` / `#9A9A93`: neutra, ícone ⇄, sem sinal
  (ADR-015).
- **Dívida** (`money.debt`) `#8A1B14` / `#FF9A8C`: saldo negativo (cartão), estouro de orçamento.
- **Aviso** (`status.warning`) `#7A4A00` / `#E8C547`: "perto do limite".
- Fundos de estado (`*Surface`): verde `#E3F1E7`, ocre `#FBF0DA`, vermelho `#FBE6E3`, cobalto
  `#EEF2FC` (escuros em `themes.ts`).

### Dados (gráficos)

Ordem fixa, nunca reciclada: **1 Cobalto, 2 Ocre, 3 Céu, 4 Rosa, 5 Oliva**. Claro
`#1C50B5 #B17000 #32A0C5 #A43068 #79821D`; escuro `#366BD3 #C8800D #32A0C5 #B54076 #848E2D`.
A sexta série vira "Outras" (`chart.other`: `#31312E` / `#B9B9B2`). Comparação com período anterior
usa `chart.comparison` tracejado. Receitas × despesas usa `chart.income` (verde) e
`chart.expense` (tinta), não a paleta categórica.

Validação (dataviz `validate_palette.js`, OKLab ΔE×100, Machado 2009): pior par vizinho com
daltonismo 13,2 (claro) / 12,6 (escuro) — alvo ≥ 8; visão típica 24,2 / 24,5 — piso 15; todas as
cores ≥ 3:1 sobre a superfície; as três primeiras passam também todos-os-pares. Testes em
`packages/tokens/src/data.test.ts`.

### Cor escolhida pela usuária (categorias e contas)

Categoria e conta têm uma cor hex livre. Ela aparece **só como identidade**: um quadrado chapado de
8px ao lado do ícone (nunca um círculo colorido atrás do ícone, nunca fundo de cartão, nunca cor de
texto). Gráfico de gasto por categoria usa barras horizontais com rótulo direto em um só matiz; o
quadradinho da categoria acompanha o rótulo.

### Named Rules

**A regra do único azul.** No cromo só existe cobalto, e só em dado principal, link, foco e
seleção. Se uma tela tem cobalto em três lugares que não são isso, um deles está errado.

**A regra do sinal.** Nenhum valor depende só da cor: entrada leva "+", saída leva "−", transferência
leva ⇄, estouro leva o ícone de alerta e a palavra "acima".

## Typography

**Família única:** Archivo (Omnibus-Type, SIL OFL) — Google Fonts na web
(`family=Archivo:wght@400;500;600`) e `@expo-google-fonts/archivo` no mobile
(`Archivo_400Regular`, `Archivo_500Medium`, `Archivo_600SemiBold`).

**Caráter:** grotesca de raiz industrial, com algarismos firmes e largura generosa; lê como
documento, não como startup. Algarismos tabulares e lineares (`tnum`, `lnum`) sempre ligados em
valores. Medido em Chrome headless (600, 40px): "1111111111" e "8888888888" medem 231,61px com
`tnum` — e os algarismos padrão da Archivo já são de largura igual (230,41px ambos), então o
alinhamento se mantém mesmo onde o recurso OpenType não chega (fontes estáticas no Android).

### Hierarchy

- **Figure XL** (600, 48/52, −0,03em): o número que responde à pergunta da tela — a sobra do mês,
  o saldo total. Um por tela.
- **Figure LG** (600, 36/40, −0,025em): totais de conta, título numérico de detalhe.
- **Figure MD** (600, 28/34, −0,02em): KPIs secundários (despesas, receitas).
- **Headline** (600, 24/32): título de tela no web. **Title** (600, 20/28): título de cartão.
  **Title SM** (600, 17/24): título de linha/seção no mobile.
- **Body** (400, 16/24): texto corrido; até 70ch. **Body SM** (400, 14/20): metadados de linha.
- **Label** (500, 13/18): rótulos de campo e de eixo agrupado. **Caption** (400, 12/16): notas,
  carimbo de atualização. Nada abaixo de 12px.

### Named Rules

**A regra do número maior.** O maior texto da tela é um número e responde à pergunta da tela. Título
nenhum passa dos 24px.

**Sem caixa-alta espaçada, sem monoespaçada.** Rótulos em caixa de frase; números tabulares na
própria Archivo.

**Mobile:** o tamanho segue a escala de fonte do sistema (`allowFontScaling` padrão); controles
nativos (barra de abas, alertas, menus de contexto, folhas do sistema) ficam na fonte do sistema.

## Layout

- **Grade de 4px.** Escala: 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80.
- **Web:** barra lateral rotulada de 240px sobre o próprio chão (sem cor, separada por nada ou um
  fio), sem barra superior; canvas fluido com **um** espaçamento (16px) na horizontal e na vertical;
  conteúdo até 1280px. Breakpoints: 768 (médio), 1024 (expandido), 1440 (largo). Abaixo de 768 a
  lateral vira barra superior de 48px com menu.
- **Mobile:** margem lateral de 16px; abas nativas (Início, Transações, Orçamentos, Mais); o botão
  de lançar é a ação primária única da tela inicial (FAB no Android, botão na barra no iOS).
- **Linhas:** 36 (densa, tabela web), 44 (padrão), 56 (transação no mobile, com duas linhas).
- **Valores alinhados à direita**, em coluna própria, dígito sob dígito. Texto à esquerda.
- **Alvos de toque:** 44pt (iOS e web com ponteiro grosso), 48dp (Android), 8px entre alvos;
  `hitSlopFor()` completa ícones menores.

## Elevation & Depth

Plano por padrão. Separação por um passo de tom (chão → superfície) ou um fio de 1px
(`border.subtle`). Sombra só no que flutua:

- **raised** (`0 4px 12px -2px` tinta a 12% / preto a 40% no escuro): menus, popovers, a linha que
  está sendo arrastada.
- **overlay** (`0 16px 40px -8px` tinta a 20% / preto a 56%): diálogos e folhas.

O formato do token é neutro (`offsetX/Y, blur, spread, color, opacity, androidElevation`):
`shadowToCss()` gera o `box-shadow`, `shadowToNative()` gera `shadow*` + `elevation`.

**A regra do repouso plano.** Nada em repouso tem sombra.

## Shapes

Cantos curtos e bimodais: 6px em controles, 8px em cartões, 4px na ponta de barras de dado, 16px
só em folhas inferiores (convenção da plataforma), redondo total só em avatar e pílula de filtro.
Barras de orçamento e a régua do mês são retângulos chapados com 2px de respiro na cor da superfície
entre planos — a forma é o concretismo, sem ornamento.

## Components

### Buttons

- **Primário:** fundo tinta, texto branco (invertido no escuro), raio 6px, altura 44px. Um por tela.
  Hover um passo mais claro, pressionado dois.
- **Secundário:** fundo rebaixado, texto tinta. **Destrutivo:** vermelho dívida, só em confirmação.
- **Foco:** anel de 2px cobalto, deslocado 2px. Desabilitado: texto `text.disabled`, sem mudar a
  forma.

### Linha de transação

Quadradinho 8px da categoria + ícone Lucide em tinta secundária (área 40px) · descrição (500) e
metadados "Categoria · Conta · 18 out" (body-sm, terciário) · valor à direita (600, tabular).
Receita: "+R$ 6.800,00" em verde entrada. Despesa: "−R$ 412,37" em tinta. Transferência: "R$
500,00" em cinza, ícone ⇄, título "Nubank → Poupança Caixa". No mobile, deslizar para a esquerda
revela Editar e Apagar (apagar pede desfazer, não confirmação).

### Cartão de KPI (resumo do mês)

Título "Outubro de 2026" + estado ("mês fechado" / "parcial, dia 4 de 30"). Figure XL com a sobra,
uma linha com o que ela significa ("sobraram de R$ 7.212,40 recebidos · taxa de poupança 15,0%"),
e a variação com triângulo e sinal, nomeando a base ("+R$ 519,45 a mais que em setembro"). Sem
ícone em círculo, sem sparkline. Mês corrente parcial: enquanto o salário não entrou (só o
rendimento da poupança do dia 1º), a taxa de poupança não é mostrada como número — o cartão diz
"Até agora: R$ 55,00 recebidos, R$ 1.240,00 gastos · parcial, dia 4 de 30" em vez de "−2.154,5%".

### A régua do mês (assinatura)

Uma barra horizontal cuja largura é a receita do mês. As despesas entram como planos chapados em
degraus de tinta (a maior categoria mais escura), com 2px de respiro; o que sobra é o plano
**cobalto** nomeado "Sobra R$ 1.081,55". Se gastou mais que recebeu, a barra passa da marca da
receita com hachura vermelha e o rótulo vira "Faltaram R$ 230,00". Web: no cartão de resumo. Mobile:
no topo da tela inicial, logo abaixo do número.

### Barra de orçamento

Trilho `budget.track` de 10px, preenchimento até o gasto:

- **Folgado** (< 85%): cobalto; "Restam R$ 455,90" com ícone de check.
- **Perto do limite** (85–100%): ocre; ícone de alerta e "Perto do limite · restam R$ 38,70".
- **Estourado** (> 100%): parte até o orçamento em cobalto, excedente **hachurado** em vermelho
  após uma marca vertical no limite; "R$ 36,90 acima" em vermelho com alerta.
  `role="progressbar"` com `aria-valuetext` por extenso.

### Gráficos

Sem legenda para série única (o título nomeia); com 2+ séries, legenda sempre e rótulo direto nas
pontas até 4 séries. 3–4 linhas de grade claras, rótulos de eixo compactos ("2 mil", "1,2 mi"),
linha de 2px sem preenchimento, marcador ≥ 8px, ponta de barra com raio 4px. Tooltip e cruz no
hover; no mobile, toque longo. Nunca dois eixos y. Toda visualização tem uma tabela equivalente.

### Inputs

Fundo superfície, borda forte de 1px (3:1), raio 6px, altura 44px; foco com anel cobalto; erro com
borda e mensagem em vermelho dívida que diz o problema e a saída. Valor monetário: teclado numérico,
máscara "R$ 0,00" preenchendo da direita.

### Iconografia

Lucide (web `lucide-react`, mobile `lucide-react-native`), traço 1,75px, 20px em linha e 16px em
texto, sempre em tinta secundária. Mapa de `ICON_NAMES` → Lucide no cliente (`cart` →
`shopping-cart`, `paw` → `paw-print`, `circle-dollar` → `circle-dollar-sign`…). Sem emoji, sem
ícone em fundo colorido.

## Do's and Don'ts

### Do:

- **Do** mostrar o número que responde à pergunta da tela em Figure XL, e só ele.
- **Do** escrever todo valor com sinal explícito e U+2212 para o menos: "−R$ 412,37".
- **Do** alinhar valores à direita com algarismos tabulares, em coluna própria.
- **Do** nomear a base de toda variação: "vs setembro", "desde o dia 1º".
- **Do** rotular dados de demonstração como demonstração em capturas públicas.

### Don't:

- **Don't** usar gradiente roxo, glassmorphism, blur decorativo ou brilho.
- **Don't** colocar ícone em círculo colorido em KPI, categoria ou cartão; nem fileiras de cartões
  idênticos.
- **Don't** usar emoji como ícone nem em texto de interface.
- **Don't** pintar despesa comum de vermelho; vermelho é dívida e estouro.
- **Don't** usar rótulo em caixa-alta espaçada, sobrelinha acima de título, numeração 01/02/03 ou
  monoespaçada como enfeite.
- **Don't** usar velocímetro, anel de progresso ou donut para orçamento; use a barra.
- **Don't** usar Inter/Geist/system como "padrão"; a família é Archivo.

## Motion

Movimento comunica estado; nada faz entrada ao carregar.

- Durações: 120 (rápido: hover, pressionado), 180 (padrão: troca de estado), 240 (menus, linhas
  chegando), 320 (folhas). Curvas: `standard (0.2,0,0,1)`, `enter (0.16,1,0.3,1)`,
  `exit (0.4,0,1,1)`.
- Molas (Reanimated `withSpring`): `snappy` 30/420/1 (pressão, toggle), `swipe` 26/300/1 (soltar a
  linha deslizada, herda a velocidade do dedo), `sheet` 22/220/1 (assentar folha).
- Lançamento salvo: a linha nova entra no topo com 240ms `enter` e háptico leve no iOS/Android.
- **Reduzir movimento:** trocas por fade de 120ms ou corte seco; a régua e as barras aparecem já no
  valor final.

## States

- **Carregando:** esqueleto com a forma final do bloco (linhas de 44/56px, retângulo da régua), tom
  `bg.sunken`, sem pulsar se "reduzir movimento". Nunca spinner no meio do conteúdo; spinner só no
  botão que disparou a ação.
- **Vazio:** o bloco mantém o quadro e ensina o próximo passo, com a ação: "Nenhum lançamento em
  novembro. Lance o primeiro gasto." / "Sem orçamento para Lazer. Definir orçamento".
- **Zero:** zero é "R$ 0,00" em `money.zero` (cinza), não um traço; valor ausente é "—".
- **Erro:** no lugar do bloco, uma linha que diz o que falhou e a saída ("Não deu para carregar as
  transações. Tentar de novo"), em `status.danger` com ícone. Erro de campo junto do campo.
- **Sem rede (mobile):** faixa discreta no topo "Sem conexão — mostrando os dados de 14:32"; lançar
  continua permitido se a fila offline for implementada (decisão em aberto, ver PRODUCT.md).
- **Mês parcial:** "parcial · dia 4 de 30"; projeções nunca são apresentadas como fato.

## Financial Data

- **Formato:** `pt-BR`, "R$ 1.234,56" com espaço não separável; sinal antes do símbolo
  ("−R$ 85,90", "+R$ 6.800,00"). Percentual com uma casa ("15,0%"), variação de taxa em pontos
  percentuais ("+6,8 p.p.").
- **Positivo/negativo sem depender de cor:** sinal + cor + (quando é estado) ícone e palavra.
  Triângulo para cima/baixo nas variações; a cor diz bom/ruim, não subiu/desceu (gastar menos é
  verde).
- **Compacto em gráficos:** eixos e rótulos de barra em "2 mil", "12,5 mil", "1,2 mi"; o valor exato
  vai no tooltip e na tabela.
- **Valor longo:** nunca truncado nem com reticências. Na manchete e nos KPIs o número encolhe até
  caber na célula (R$ 1.000.000.000,00 inteiro); nos rótulos diretos de gráfico vira compacto a partir
  de R$ 100 mil ("−R$ 1 bi"). Nomes longos truncam com o nome inteiro no `title` (ADR-032).
- **Cartão de crédito:** saldo negativo em `money.debt` com "−"; a fatura é dívida, não "saldo
  disponível".

## Accessibility

- Contraste testado em `packages/tokens/src/contrast.test.ts` (fórmula WCAG 2.x implementada no
  pacote): texto secundário ≥ 4,5:1 (AA) em chão, superfície, rebaixado e elevado; **números
  principais ≥ 7:1 (AAA)** — tinta, entrada, gasto e dívida; elementos gráficos e bordas de campo
  ≥ 3:1; nos dois temas.
- Alvos de toque 44pt / 48dp; foco visível em tudo.
- Leitor de tela lê valores por extenso coerente ("menos 412 reais e 37 centavos"); gráficos têm
  `aria-label` com a conclusão e tabela equivalente.
- Dynamic Type / escala de fonte respeitadas; "reduzir movimento" respeitado.
