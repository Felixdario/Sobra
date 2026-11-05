# Polimento do mobile (fase 6)

Executor P2, 2026-11-05. Decisões em `docs/decisoes.md` (ADR-033). Capturas em
`docs/screenshots/mobile/`, feitas no Expo web a 390×844 (sem simulador nesta máquina). Todo dado
das capturas de pior caso vem do cenário de desenvolvimento, não do demo.

## Como reproduzir

Em desenvolvimento, **Ajustes → Desenvolvimento · dados** troca o cenário (Demo, Pior caso, Vazio,
Uma, Erro 500, Sem rede) e o tamanho do texto simulado na web (1×, 1,5×, 2×). O cartão e os dados
só existem com `__DEV__`; o `expo export` de Android e web foi conferido sem nenhum texto dos
cenários. Os mesmos dados rodam nos testes `src/dev/worstCase.test.tsx`.

O pior caso usa os limites do contrato: nome de categoria com 40 caracteres (com e sem espaço),
conta com 59, usuário com 80 e e-mail de 104, descrição com 120 (normal e uma palavra só), 16
categorias de despesa, árabe, japonês, emoji, HTML literal, R$ 1.000.000.000,00 de receita,
−R$ 999.999.999,99 de saldo, gasto de R$ 0,01 e orçamento 1000% estourado.

## O que quebrou e como foi corrigido (break-ui)

| #   | Gravidade | Onde                                  | Caso                      | O que acontecia                                  | Correção                                                                                                    |
| --- | --------- | ------------------------------------- | ------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | Quebrado  | Resumo, número principal              | R$ 1 bilhão; texto 2×     | "−R$ 1.000.000.16…" e "−R$ 26…": valor cortado   | Escolhe o maior estilo que cabe pela largura medida; se nada cabe, encolhe por cálculo (`useFigureStyle`)   |
| 2   | Quebrado  | Barra de abas                         | texto 2×                  | Rótulos sobrepostos e cortados                   | Rótulos limitados a 1,3× e em uma linha                                                                     |
| 3   | Quebrado  | Lançar, chip da conta                 | conta com 59 caracteres   | Chip passava da borda da folha                   | Rótulo do chip encolhe com "…"; altura mínima em vez de fixa                                                |
| 4   | Quebrado  | Orçamentos                            | valores bilionários       | Nome espremido em "Su…"                          | Nome fica com metade da linha; os valores descem para a linha de baixo                                      |
| 5   | Quebrado  | Linhas da lista e grade de categorias | texto 2×                  | "iFood \*Burg…", "Tran…", "Mer…": irreconhecível | A partir de 1,5× a linha empilha; grade com 3/2 colunas e nome em 2 linhas                                  |
| 6   | Quebrado  | Valor no lançar                       | −R$ 99.999.999,99 a 1,5×+ | Cortado em uma linha                             | Mesmo ajuste do número principal                                                                            |
| 7   | Quebrado  | KPIs                                  | bilhões a 2×              | Valor passava da borda do cartão                 | Valor vai para a linha de baixo e encolhe só se não couber sozinho; limitado a 1,5×                         |
| 8   | Feio      | Legenda da régua e orçamentos         | nome em árabe             | Nome alinhado à direita, longe do quadradinho    | `textAlign: 'left'` nas colunas de nome                                                                     |
| 9   | Feio      | Régua                                 | bilhões                   | "Recebido"/valor quebrando em colunas estreitas  | Rótulos quebram como bloco (`flexWrap`)                                                                     |
| 10  | Feio      | Folhas                                | texto 2× ou tela pequena  | Conteúdo passava da tela e o Salvar sumia        | Corpo da folha rola; Salvar/Ver transações fixos no rodapé                                                  |
| 11  | Feio      | KPI Receitas                          | mês sem receita           | "R$ 0,00" em verde                               | Zero no tom neutro                                                                                          |
| 12  | Feio      | Seletor de mês                        | texto 2×                  | Título quebrado alinhado à esquerda              | Centralizado                                                                                                |
| 13  | Frágil    | Ajustes                               | texto 2×                  | Tela sem rolagem                                 | `ScrollView`                                                                                                |
| 14  | Frágil    | Lançar                                | usuário sem conta         | Salvar desabilitado sem dizer por quê            | "Crie uma conta no painel web para lançar." (e "Digite o valor."/"Escolha a categoria." como dica do botão) |
| 15  | Frágil    | Teclado (iOS)                         | descrição/observações     | Campo podia ficar atrás do teclado               | Folha sobe acima do teclado e o teclado numérico sai enquanto se digita texto (não verificado em aparelho)  |

Antes/depois: `pior-caso-resumo-antes.png` → `pior-caso-resumo-depois.png`,
`pior-caso-lancar-antes.png` → `pior-caso-lancar-depois.png`,
`pior-caso-fonte-transacoes-antes.png` → `pior-caso-fonte-transacoes-depois.png`; mais
`pior-caso-transacoes-depois.png` (lista no pior caso) e `fonte-ampliada.png` (resumo a 2×).

**O que já aguentava:** HTML na descrição aparece literal; e-mail de 104 caracteres quebra; 1000%
estourado mostra marca no limite, hachura e "R$ 900,00 acima" com 1.000,0%; usuário novo, mês
vazio, erro 500 e sem rede têm estado próprio com "Tentar de novo"; uma transação só não deixa a
régua nem a lista estranhas; a lista é paginada (30 por página), então 1.000+ itens não travam.

**Decisões:** descrição da linha em até 2 linhas (3 empilhada) com "…" — o texto inteiro está na
edição; nome de categoria na grade em 2 linhas com "…" e o nome inteiro no rótulo de
acessibilidade; valores nunca são cortados.

## Movimento (improve-animations → animate-expo + apple-design)

A skill `review-animations` não existe nesta máquina; a auditoria foi a `improve-animations`,
registrada aqui em vez de uma pasta `plans/`, porque a própria tarefa pedia executar as correções.

| #   | Gravidade | Achado                                                                                                                 | Correção                                                                                                                                                  |
| --- | --------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Alta      | Valor animava (queda de 4 px + opacidade 55%) a cada dígito: a ação mais frequente do app, e piscava ao digitar rápido | Sem animação por dígito; tecla recusada mantém o empurrão (e escurece com "Reduzir movimento")                                                            |
| 2   | Média     | Folha com "Reduzir movimento" pulava para o topo antes de esmaecer quando arrastada para fechar; a volta usava mola    | Esmaece de onde está; volta em 120 ms sem mola                                                                                                            |
| 3   | Média     | Escala de pressionar (transição CSS do Reanimated) ignorava "Reduzir movimento"                                        | Sem escala com a preferência; o fundo pressionado continua                                                                                                |
| 4   | Média     | Deslizar o mês não dava retorno até soltar e o conteúdo trocava de uma vez                                             | O mês segue o dedo com resistência, decide pelo momento projetado e volta com a velocidade do dedo; conteúdo novo entra com fade de 180 ms (só opacidade) |
| 5   | Média     | Ao apagar, as linhas de baixo pulavam                                                                                  | `itemLayoutAnimation` de 180 ms (Reanimated pula com "Reduzir movimento")                                                                                 |
| 6   | Baixa     | Háptico a cada "volta para o lugar" da folha                                                                           | Removido (ruído)                                                                                                                                          |
| 7   | Baixa     | Toast novo sobre o anterior: dupla exposição                                                                           | O novo espera o anterior sair                                                                                                                             |
| 8   | Baixa     | `project`/`rubberband` duplicados                                                                                      | `src/lib/gesture.ts`                                                                                                                                      |

Confirmado: todo gesto roda na UI thread (shared values em `onUpdate`, `scheduleOnRN` só no fim ou
ao cruzar o limiar do deslize); nenhum `setState` por quadro; abas sem animação; navegação com
`fade` quando "Reduzir movimento". Fica como está: a curva `exit` dos tokens é acelerada (estilo
Material) e só o P1 mexe no pacote de tokens.

## Auditoria e polish (impeccable)

A skill pede uma rodada de perguntas ao dono; como subagente sem canal de pergunta, segui o brief,
o PRODUCT.md e o DESIGN.md. Notas da auditoria nativa (0–4): acessibilidade 2 → 3, performance 3,
tema 4, conformidade de plataforma 3, adaptação 3 (só retrato em celular, de propósito).

Corrigido (alta/média): leitor de tela (abaixo); alvo do segmentado de 40 para 44 pt; "Filtros, 1
ativos" → "1 ativo"; título "Entrar" como cabeçalho; dicas do Salvar em pt-BR dizendo o que falta;
folha acima do teclado no iOS.

Fica de fora (baixa), com o motivo:

- Placeholder "Buscar na descrição" corta a 2× (o rótulo de acessibilidade é o completo).
- Ícones Lucide não crescem com a fonte (no iOS o SF Symbols cresceria); o DESIGN.md escolhe
  Lucide.
- O botão "Lançar" na barra de abas foge da regra do iOS de "abas são seções, não ações"; é decisão
  registrada (ADR-030, 3 toques).
- `renderItem` sem `memo` nas linhas; com 30 por página não pesa.

## Acessibilidade

- Toasts e abertura de folha anunciados com `AccessibilityInfo.announceForAccessibility` (iOS não
  tem live region); toast com "Desfazer" fica 12 s com leitor de tela ligado.
- Teclado próprio: cada tecla tem nome ("Dois zeros", "Apagar último dígito" com dica de segurar
  para zerar), o valor novo é anunciado por extenso a cada tecla e o limite é anunciado.
- Linha da lista é um elemento só, lida como frase ("Feira livre, Mercado, Carteira, menos 25 reais
  e 23 centavos"), com ações Editar/Apagar/Mais ações; KPIs agrupados ("Despesas: menos …");
  régua é uma imagem com tudo e a legenda fica escondida do leitor; orçamentos como `progressbar`
  com valor por extenso.
- Grupos de opção única (tipo, categoria, conta, data, filtros, tema) como `radio` com `checked`.
- Gesto de escape do VoiceOver fecha as folhas.
- Contraste de todos os pares usados, nos dois temas, em `src/theme/contrast.test.ts` (texto 4,5:1,
  números principais 7:1, hachura, trilhos, bordas e teclas 3:1 ou mais): todos passam.
- Testes de nomes, papéis e anúncios em `src/a11y.test.tsx`.

## Só dá para validar em aparelho real

- **Sensação dos gestos:** velocidade passada à mola, encaixe por momento, resistência nas bordas,
  deslizar mês × rolar a tela, e o tempo do háptico junto do quadro (o Expo web não vibra).
- **Dynamic Type e fonte do Android de verdade:** a web só simula pelo tema; no aparelho o sistema
  escala o texto depois do layout, e `maxFontSizeMultiplier`/`allowFontScaling` só valem lá.
- **VoiceOver e TalkBack:** ordem de leitura, ações personalizadas, escape, anúncios e se o
  anúncio do valor por tecla incomoda na prática.
- **Teclado do iOS** sobre a folha (campo de descrição) e o `adjustResize` do Android.
- **"Reduzir movimento" do sistema** e desempenho a 120 Hz num Android antigo, em build de release.
