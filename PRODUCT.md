# Product

<!-- impeccable:product-schema 1 -->

> Registro de verdade do produto, escrito pelo fluxo `init` da skill impeccable. Não houve rodada de
> entrevista com o dono nesta sessão (o Executor trabalha como subagente, sem canal de pergunta);
> os fatos abaixo vêm do brief explícito da fase 3, de `docs/decisoes.md`, do contrato em
> `packages/shared` e do seed em `apps/api/src/seed/demo.ts`. O que foi **inferido** está marcado
> com _(inferido)_ e deve ser confirmado pelo dono.

## Platform

adaptive

Dois clientes sobre a mesma API: app **mobile** (Expo / React Native, iOS e Android, uso diário) e
**dashboard web** (React + Vite, análise). O mobile segue as convenções de cada sistema (pilha de
navegação nativa, ações de deslizar, folhas, retorno por gesto); a marca entra pela camada que a
plataforma deixa aberta: cor, tipografia, movimento e conteúdo.

## Name

**Sobra.** Escolhido entre três propostas (ver ADR-020 em `docs/decisoes.md`):

- **Sobra** — a pergunta que o produto responde todo mês: quanto sobra. Funciona como substantivo
  e como verbo na interface ("sobraram R$ 412"). **Escolhido.**
- **Folga** — o estado desejado do orçamento ("orçamento folgado"); mais abstrato e soa como "dia de
  folga" fora de contexto.
- **Fôlego** — a sensação de ter margem; o acento circunflexo complica domínio, bundle id e busca.

Busca rápida (nov/2026) não achou banco ou app de finanças chamado "Sobra", "Folga" ou "Fôlego" no
Brasil; existe "Vai Sobrar" (Product Hunt, pequeno) — nome próximo, não idêntico. "Trocado" foi
descartado na triagem por colisão (Meu Trocado, Trocados Carteira, Trocadinho do Oinc). Não houve
busca no INPI.

## Users

- **Primário:** pessoa adulta no Brasil que organiza as próprias finanças sozinha, com conta
  corrente, poupança, cartão de crédito e dinheiro em espécie; salário mensal, aluguel, assinaturas,
  mercado e restaurantes (perfil do usuário demo "Ana Demo"). _(inferido do seed)_
- **No celular**, ela lança um gasto logo depois de pagar — na fila, no ônibus, saindo do mercado —
  com uma mão e pouca atenção. **No computador**, uma vez por semana ou no fechamento do mês, ela
  senta para entender para onde foi o dinheiro e ajustar orçamentos.
- **Secundário (portfólio):** recrutadores e pessoas técnicas avaliando o projeto pelo demo. Eles
  julgam em segundos se o produto parece real e cuidado. O produto é desenhado para a usuária
  primária; o avaliador é servido por ele estar pronto, não por enfeite.

## Product Purpose

Responder com honestidade três perguntas: **quanto eu tenho agora**, **para onde foi o dinheiro
este mês** e **quanto sobra**. Sucesso é a usuária lançar todo gasto (porque lançar é rápido o
bastante) e confiar nos números o bastante para mudar um hábito.

## Positioning

Controle manual e deliberado, sem integração bancária: a usuária registra o que gasta, e por isso
enxerga. O produto mede o mês pela **sobra** (receitas − despesas, e a taxa de poupança derivada),
trata transferências como neutras (não inflam receitas nem despesas — ADR-015) e mostra o mês
corrente parcial sem dramatizar uma taxa de poupança muito negativa no dia 4.

## Operating Context

- Mobile: lançar gasto em até **3 toques** (valor → categoria → salvar; conta e data têm padrão);
  lista de transações com **deslizar para editar/apagar**; resumo do mês com orçamento por
  categoria.
- Web: cards de saldo / receitas / despesas / taxa de poupança com variação sobre o mês anterior;
  receitas × despesas por mês; gastos por categoria; evolução do saldo; orçado × realizado; tabela
  de transações; gestão de contas, categorias, orçamentos, recorrências e importação de CSV (com
  prévia antes de gravar — ADR-018); tema claro e escuro.
- Volume real: ~40 transações/mês, 13 categorias padrão, 4 contas (corrente, poupança, cartão com
  saldo negativo, carteira), 6 meses de histórico no demo; taxa de poupança típica de 5–25%.

## Capabilities and Constraints

- Interface **pt-BR**, moeda **BRL**, fuso **America/Sao_Paulo**; valores em centavos inteiros
  (ADR-008), datas `YYYY-MM-DD` (ADR-011).
- Categorias e contas têm **cor hex escolhida pela usuária** e um ícone de uma lista fechada
  (`ICON_NAMES` em `packages/shared/src/schemas/common.ts`). A interface precisa funcionar com
  qualquer cor que ela escolha — inclusive roxo Nubank (#820AD1) ou laranja Inter (#FF7A00).
- Tipos de transação: receita, despesa e transferência (união discriminada — ADR-009).
- Sem Open Finance, sem investimentos, sem multiusuário/compartilhamento. _(inferido do escopo
  atual)_

## Brand Commitments

- Nome: **Sobra**.
- Voz em pt-BR: direta, calma, concreta, em segunda pessoa informal ("você"). Fala de dinheiro sem
  moralizar e sem euforia. Números antes de adjetivos.
  - Sim: "Você gastou R$ 1.240 em Mercado — R$ 40 acima do orçado."
  - Não: "Ops! 😬 Parece que você exagerou no mercado!"
  - Erros dizem o problema e a saída: "Não deu para salvar sem internet. O lançamento fica guardado
    e sobe quando a conexão voltar." _(o comportamento offline é uma decisão em aberto)_
- O dono pediu explicitamente um visual que **não pareça feito por IA**: nada de gradiente roxo
  genérico, glassmorphism gratuito, cards idênticos com ícone em círculo colorido, emoji como ícone,
  ou Inter em tudo sem intenção.

## Evidence on Hand

- Dados de demonstração determinísticos em `apps/api/src/seed/demo.ts` (usuário `demo@financas.dev`).
  São sintéticos e devem ser rotulados como demo em qualquer captura pública.
- Não existem depoimentos, métricas de uso, logotipo ou ilustrações. Não inventar.

## Product Principles

1. **Lançar é mais importante que analisar.** Se registrar um gasto custar mais que 3 toques, o
   resto do produto não tem dados. O caminho de lançamento vence qualquer disputa de espaço no
   mobile.
2. **O número é a interface.** Valores são o conteúdo principal: grandes, alinhados, legíveis e
   formatados como a usuária fala ("R$ 1.240,50"). Decoração nunca compete com eles.
3. **Sinal sem alarme.** Negativo, estourado e atrasado são informados com clareza — sinal,
   palavra e forma, não só cor — e sem dramatizar. Um mês parcial é rotulado como parcial.
4. **Honestidade contábil.** Transferência não é gasto, cartão negativo é dívida e não saldo, e o
   produto mostra o que calcula (ADR-015, ADR-016).
5. **Feito com cuidado, não com enfeite.** A qualidade de portfólio aparece em alinhamento,
   estados vazios/erro, movimento com propósito e detalhes de plataforma — não em efeitos.

## Accessibility & Inclusion

- Contraste WCAG **AA** no mínimo para todo par texto/fundo; **AAA (7:1)** para os números
  principais (saldo, totais do mês, valores de transação).
- Áreas de toque de **44 pt** no mínimo (iOS) e **48 dp** no Android.
- Positivo/negativo/estourado nunca dependem só de vermelho/verde (daltonismo): sinal, rótulo e
  forma acompanham a cor. Paleta de gráficos validada para deuteranopia/protanopia.
- Respeitar Dynamic Type / escala de fonte do sistema e "Reduzir movimento".
- Leitores de tela leem valores por extenso coerente ("menos 85 reais e 90 centavos").
