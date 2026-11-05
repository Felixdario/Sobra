# @sobra/i18n

Catálogos de tradução e `t()` tipado do Sobra, em TypeScript puro (sem DOM nem React Native):
o mesmo pacote roda no web (Vite) e no mobile (Metro/Hermes). Decisões no ADR-035.

## Uso

```ts
import { categoryName, createTranslator, translateError } from '@sobra/i18n';

const t = createTranslator(user.locale); // 'pt-BR' | 'en-US', um tradutor por locale (em cache)

t('common.actions.save'); // "Salvar" / "Save"
t('counts.transactions', { count: 2 }); // "2 transações" / "2 transactions"
t('counts.transactions', { count: 0 }); // "Nenhuma transação" / "No transactions"
t('common.states.failedOffline', { what: 'Não deu para carregar o resumo' });

categoryName(t, category); // nome traduzido enquanto a categoria padrão não foi renomeada
translateError(t, error); // ApiError → errors.<code>, ou a message do servidor como reserva
```

O compilador recusa chave inexistente, parâmetro faltando e plural sem `count`. Para uma chave
montada em runtime (código de erro vindo do servidor), use `t.has(chave)` antes.

Números em parâmetros saem no formato do locale (`1.284` / `1,284`). Dinheiro e datas **não**
passam por aqui: use `formatMoney`, `formatDate`, `formatMonth` e `formatRelativeDay` do
`@sobra/shared` com `{ locale }` (e `currency`) da preferência do usuário.

## Validação de formulários

Os schemas do `@sobra/shared` escrevem suas mensagens pelo registro `VALIDATION_MESSAGES`
(chave → texto pt-BR). O cliente reconhece o texto e mostra `validation.<chave>` no idioma da
pessoa, com os parâmetros (`{max}`, `{min}`):

```tsx
// react-hook-form + zodResolver, igual no web e no React Native: o resolver não muda.
const {
  formState: { errors },
} = useForm({ resolver: zodResolver(registerSchema) });
<Field error={translateFieldError(t, errors.password)} />; // "The password must be at least 8 characters"

// Um issue do Zod direto (safeParse, lista de erros):
result.error.issues.map((issue) => translateIssue(t, issue));
```

- Em pt-BR o texto sai idêntico ao de hoje. Em en-US, issues do próprio Zod (schema sem mensagem
  própria) viram `validation.generic.*`; qualquer outro texto volta como veio.
- Os `details` de um `VALIDATION_ERROR` da API têm o mesmo texto: `translateIssue(t, detail)`
  também funciona com eles.
- Mensagem nova num schema: acrescente a chave em `VALIDATION_MESSAGES` (shared) e em
  `validation.*` nos dois catálogos. Escrever `error: 'texto'` direto num schema quebra um teste.

## Convenção de chaves

- `dominio.area.item`, segmentos em camelCase: `transactions.empty.title`,
  `budgets.form.amountLabel`, `auth.login.invalidCredentials`.
- Compartilhado entre as telas fica em `common.*` (`common.actions.save`, `common.states.loading`).
  Nomes de enums do contrato usam o valor do enum como chave (`accountTypes.credit_card`,
  `transactionTypes.expense`, `errors.NETWORK_ERROR`).
- Uma tela por domínio na raiz (`dashboard`, `transactions`, `accounts`, `categories`, `budgets`,
  `imports`, `settings`, `auth`). Chave específica de plataforma só quando o texto realmente difere
  (`settings.mobile.haptics`); o resto é igual nos dois apps.
- Sufixos usuais: `title`, `description`, `label`, `placeholder`, `hint`, `action`, `error`,
  `a11y` (texto só para leitor de tela).
- Placeholders `{nome}` (letras, números e `_`). As mensagens são frases inteiras: nada de juntar
  pedaços traduzidos, a ordem das palavras muda entre idiomas.
- Plural é um objeto com as categorias do `Intl.PluralRules` e `{count}`:
  `{ zero?, one, other }` (pt-BR também pode ter `many`, usada pelo CLDR para milhões). `zero` é
  "zero exato" e vale nos dois idiomas. Um objeto só é plural se **todas** as chaves forem
  categorias de plural, então um namespace com uma entrada `other` (como `categories.default`)
  continua sendo namespace.

## Acrescentar texto

1. Escreva a chave em `src/locales/pt-BR.ts` (fonte das chaves e dos tipos dos parâmetros).
2. Escreva a mesma chave em `src/locales/en-US.ts`; o tipo `Catalog` acusa o que faltar ou sobrar.
3. `corepack pnpm --filter @sobra/i18n test` confere a paridade de chaves e de placeholders.

Web e mobile acrescentam chaves em paralelo: mantenha cada domínio num bloco próprio do arquivo
(`transactions: { ... }`) para os conflitos de merge ficarem pequenos.
