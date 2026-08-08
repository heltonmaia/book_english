# Fase 1 — Fatia Vertical do Motor: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o motor completo do app de gramática funcionando de ponta a ponta — ler unidade → praticar → agendar → revisar → persistir → exportar — com 6 unidades reais da Parte 1, publicado no GitHub Pages e instalável no celular.

**Architecture:** PWA estática sem backend. Conteúdo é dado TypeScript tipado compilado no bundle; um motor de funções puras (correção de resposta, agendamento FSRS, montagem de fila) fica isolado da UI; estado de estudo vive num store Zustand persistido em IndexedDB com fallback para memória. Toda a lógica testável é pura e fica fora dos componentes.

**Tech Stack (versões realmente instaladas na Task 1):** Vite 8.2 · React 19.2 · TypeScript 7.0 · Tailwind 4.3 (`@tailwindcss/vite`) · react-router-dom 7.18 · Zustand 5.0 · `ts-fsrs` 5.4 · `idb` 8.0 · `vite-plugin-pwa` 1.3 · `@fontsource-variable/inter` 5.3 · Vitest 3.2 + @testing-library/react 16 + jsdom 27

> **Nota de versão.** Este plano foi escrito assumindo Vite 7 e TypeScript 5.9. A instalação sem pin resolveu **TypeScript 7.0.2 e Vite 8.2.1** — majors mais novas. A Task 1 rodou verde de ponta a ponta com elas (typecheck, build, testes e deploy verificado no navegador real), então o projeto segue nelas e este documento foi corrigido para refletir a realidade. A consequência prática para as tasks seguintes é o formato do `tsconfig.json`: **TypeScript 7 não aceita mais `baseUrl`**, então `paths` é relativo ao próprio `tsconfig.json` (`"@/*": ["./src/*"]`), e `vite/client` entra em `types`. Use o `tsconfig.json` que está no repositório, não o texto literal de nenhum brief anterior a esta nota.

**Spec:** `docs/superpowers/specs/2026-08-08-english-grammar-app-design.md`

## Global Constraints

- **Node ≥ 20** (exigência do `ts-fsrs`). Ambiente atual: v23.8.0, npm 11.6.2.
- **`base: '/book_english/'`** no `vite.config.ts` — o site é servido em `heltonmaia.github.io/book_english/`. `scope` e `start_url` do manifesto PWA acompanham o mesmo prefixo. Errar isso é a causa clássica de "a PWA não oferece instalação".
- **Todo texto visível ao usuário é em inglês**, incluindo rótulos de botão e mensagens de erro. Sem i18n, sem português na UI. Comentários de código também em inglês.
- **Zero requisição de rede em runtime.** Fontes self-hosted via `@fontsource-variable/inter`; nunca CDN. O app precisa funcionar 100% offline no primeiro carregamento após instalado.
- **Sem backend, sem autenticação, sem analytics.**
- **Nenhum hex hardcoded em componente** — cores só via CSS custom properties definidas em `src/theme/tokens.css`, com par claro/escuro.
- **Affordance de toque por capacidade, nunca por largura** — usar a variante `can-hover:`; nunca `opacity-0` puro nem `md:` para esconder controle interativo.
- **Lógica pura em `src/engine/` e `src/store/`; componentes são wiring fino.** Nenhuma regra de negócio dentro de componente React.
- **`ItemId` é escrito à mão no conteúdo**, nunca derivado de índice de array. Formato: `u<NNN>.<slug-curto>.<NN>` (ex.: `u001.generic-plural.03`).
- Datas persistidas sempre como **epoch em milissegundos** (`number`), nunca `Date`. `Date` só existe na fronteira com o `ts-fsrs`.

---

## File Structure

```
book_english/
├── .github/workflows/deploy.yml       # build + publish no GitHub Pages
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts                     # base, plugins, PWA, config do Vitest
├── src/
│   ├── main.tsx                       # bootstrap React + router
│   ├── App.tsx                        # rotas + layout
│   ├── index.css                      # @import tailwindcss + tokens
│   ├── theme/tokens.css               # custom properties claro/escuro
│   ├── content/
│   │   ├── types.ts                   # Unit, Block, Rich, Item, ItemId
│   │   ├── taxonomy.ts                # PartId, Phenomenon, PARTS (listas fechadas)
│   │   ├── index.ts                   # UNITS, unitById, allItems, itemById
│   │   ├── content.lint.test.ts       # invariantes sobre o corpus inteiro
│   │   └── units/u001..u006.ts        # uma unidade por arquivo
│   ├── engine/
│   │   ├── answer.ts                  # normalizeAnswer, checkAnswer
│   │   ├── scheduler.ts               # StoredCard, newCard, gradeCard
│   │   ├── queue.ts                   # buildReviewQueue, newItemsRemainingToday, orphanIds
│   │   └── progress.ts                # ProgressFile, serializeProgress, parseProgress
│   ├── store/
│   │   ├── db.ts                      # openStore (idb) + fallback em memória
│   │   └── study.ts                   # store Zustand
│   ├── components/
│   │   ├── BottomNav.tsx
│   │   ├── RichBody.tsx               # renderiza Rich[]
│   │   ├── ExerciseRunner.tsx         # máquina de estados da sessão
│   │   └── items/                     # GapItem, ChoiceItem, JudgeItem, TransformItem, ErrorHuntItem
│   └── pages/
│       ├── Today.tsx  Book.tsx  UnitPage.tsx
│       ├── SessionPage.tsx  Progress.tsx  Settings.tsx
```

Cada arquivo de `engine/` tem um `*.test.ts` colocado ao lado. Componentes com `*.test.tsx` ao lado.

---

## Task 1: Scaffold, build e deploy no GitHub Pages

Deploy vem **primeiro**, com um app trivial, porque o risco de `base` errado é conhecido e barato de descobrir agora e caro de descobrir na task 15.

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/theme/tokens.css`
- Create: `src/App.test.tsx`
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: nada
- Produces: `npm run dev`, `npm run build`, `npm test`, `npm run typecheck`. Alias `@/` → `src/`.

- [ ] **Step 1: Inicializar o projeto e instalar dependências**

```bash
cd /home/heltonmaia/work/github-projects/book_english
npm init -y
npm pkg set name="book-english" version="0.1.0" type="module"
npm pkg set private=true --json   # sem --json, o npm grava a string "true"
npm i react react-dom react-router-dom zustand ts-fsrs idb @fontsource-variable/inter
npm i -D vite @vitejs/plugin-react typescript @types/react @types/react-dom \
        tailwindcss @tailwindcss/vite vite-plugin-pwa \
        vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm pkg set scripts.dev="vite" scripts.build="tsc --noEmit && vite build" \
            scripts.preview="vite preview" scripts.test="vitest run" \
            scripts.test:watch="vitest" scripts.typecheck="tsc --noEmit"
```

- [ ] **Step 2: Criar `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/book_english/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

Note que o build usa `tsc --noEmit`, **não** `tsc -b`. Modo build exige projetos `composite` e conflita com `noEmit` em várias versões do TypeScript; aqui há um único projeto e não há nada a emitir — quem gera o bundle é o Vite.

- [ ] **Step 3: Criar `src/test-setup.ts` e `tsconfig.json`**

```ts
// src/test-setup.ts
import '@testing-library/jest-dom/vitest'
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext", "moduleResolution": "bundler",
    "jsx": "react-jsx", "strict": true, "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true, "noEmit": true, "skipLibCheck": true,
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

Sem `baseUrl`: o TypeScript 7 removeu a opção, e por isso `paths` é relativo ao diretório do `tsconfig.json` (daí o `./`). `vite/client` em `types` traz as declarações de `import.meta.env` e dos imports de asset do Vite.

`vite.config.ts` fica fora de `include` de propósito: ele não é typechecked pelo `tsc` do projeto, e o Vite o carrega com o próprio loader. Um `tsconfig.node.json` separado só para ele seria configuração morta.

- [ ] **Step 4: Criar `index.html`, tokens de tema e o shell mínimo**

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>English Grammar</title>
    <script>
      (function () {
        var t = localStorage.getItem('be.theme') || 'system'
        var dark = t === 'dark' || (t === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
        document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      })()
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```css
/* src/theme/tokens.css */
:root {
  --bg: #fbfaf8;        --surface: #ffffff;   --border: #e6e2dc;
  --text: #1b1a18;      --muted: #6b6660;     --accent: #1f6f6b;
  --ok: #17795e;        --bad: #b3261e;       --ok-bg: #e6f4ef;  --bad-bg: #fdeceb;
}
:root[data-theme='dark'] {
  --bg: #17161a;        --surface: #201f24;   --border: #34323a;
  --text: #ece9e4;      --muted: #a39e97;     --accent: #4fb3ad;
  --ok: #5bc39c;        --bad: #ef8b84;       --ok-bg: #16302a;  --bad-bg: #33201f;
}
```

```css
/* src/index.css */
@import 'tailwindcss';
@import '@fontsource-variable/inter';
@import './theme/tokens.css';

@custom-variant can-hover (@media (hover: hover));

@theme {
  --color-bg: var(--bg);         --color-surface: var(--surface);
  --color-border: var(--border); --color-text: var(--text);
  --color-muted: var(--muted);   --color-accent: var(--accent);
  --color-ok: var(--ok);         --color-bad: var(--bad);
  --color-ok-bg: var(--ok-bg);   --color-bad-bg: var(--bad-bg);
  --font-sans: 'Inter Variable', system-ui, sans-serif;
}

html, body, #root { height: 100%; }
body { background: var(--color-bg); color: var(--color-text); font-family: var(--font-sans); }
```

```tsx
// src/App.tsx
export default function App() {
  return <h1 className="p-6 text-2xl font-semibold">English Grammar</h1>
}
```

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)
```

- [ ] **Step 5: Escrever o teste de fumaça e vê-lo falhar**

```tsx
// src/App.test.tsx
import { render, screen } from '@testing-library/react'
import App from './App'

test('renders the app title', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'English Grammar' })).toBeInTheDocument()
})
```

Rode `npm test`. Se os arquivos acima já existem, ele passa direto — isso é aceitável nesta task de scaffold, cujo objetivo é a infraestrutura, não TDD de comportamento. A partir da Task 2 o ciclo vermelho-verde é obrigatório.

- [ ] **Step 6: Verificar build e typecheck**

Rode: `npm run typecheck && npm run build`
Esperado: ambos passam; `dist/index.html` referencia assets sob `/book_english/`.
Confira: `grep -o '/book_english/[^"]*' dist/index.html` deve retornar ao menos um caminho.

- [ ] **Step 7: Criar `.gitignore` e o workflow de deploy**

```
node_modules/
dist/
dev-dist/
.superpowers/
*.local
.DS_Store
```

`.superpowers/` guarda o scratch do processo de execução (ledger, briefs, pacotes de review). É rascunho, não fonte — nunca vai para o repositório.

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 8: Habilitar o GitHub Pages no repositório**

Passo manual, feito uma vez (hoje `has_pages` é `false`):

```bash
gh api -X POST repos/heltonmaia/book_english/pages \
  -f 'build_type=workflow' || \
gh api -X PUT repos/heltonmaia/book_english/pages -f 'build_type=workflow'
```

Se a API recusar, habilite pela interface: **Settings → Pages → Source: GitHub Actions**.

- [ ] **Step 9: Commit e push, e verificar o deploy**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + Tailwind com deploy no GitHub Pages"
git push -u origin main
gh run watch
```

Esperado: workflow verde. Abra `https://heltonmaia.github.io/book_english/` e confirme que o título aparece **e que não há 404 de asset no console** — 404 aqui significa `base` errado, que é exatamente o risco que esta task existe para eliminar.

---

## Task 2: Modelo de conteúdo — tipos, taxonomia e lint

**Files:**
- Create: `src/content/types.ts`, `src/content/taxonomy.ts`, `src/content/index.ts`
- Create: `src/content/content.lint.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: os tipos `ItemId`, `PartId`, `Phenomenon`, `Rich`, `Block`, `Item`, `Unit`; e de `content/index.ts`: `UNITS: Unit[]`, `unitById(id: number): Unit | undefined`, `allItems(): Item[]`, `itemById(id: ItemId): Item | undefined`, `allItemIds(): ItemId[]`.

- [ ] **Step 1: Escrever a taxonomia (listas fechadas)**

```ts
// src/content/taxonomy.ts
export const PART_IDS = [
  'noun-phrase', 'tense-aspect', 'modality-hedging', 'verb-patterns',
  'clause-architecture', 'voice-information', 'adverbials-punctuation',
  'numbers-data', 'spoken-professional', 'confusables',
] as const
export type PartId = (typeof PART_IDS)[number]

export const PART_TITLES: Record<PartId, string> = {
  'noun-phrase': 'The Noun Phrase',
  'tense-aspect': 'Tense and Aspect',
  'modality-hedging': 'Modality and Hedging',
  'verb-patterns': 'Verb Patterns and Complementation',
  'clause-architecture': 'Clause Architecture',
  'voice-information': 'Voice, Information Structure and Style',
  'adverbials-punctuation': 'Adverbials, Connectors and Punctuation',
  'numbers-data': 'Numbers, Data and Results',
  'spoken-professional': 'Spoken Professional English',
  'confusables': 'Confusables and False Friends',
}

// Grows as parts are written. Phase 1 covers only Part 1.
export const PHENOMENA = [
  'zero-article', 'definite-article', 'indefinite-article', 'generic-reference',
  'uncountable-nouns', 'quantifiers', 'noun-noun-modifiers', 'np-agreement',
  'article-with-acronyms',
] as const
export type Phenomenon = (typeof PHENOMENA)[number]
```

- [ ] **Step 2: Escrever os tipos de conteúdo**

```ts
// src/content/types.ts
import type { PartId, Phenomenon } from './taxonomy'

/** Hand-written, position-independent. Format: u<NNN>.<short-slug>.<NN> */
export type ItemId = string

export type Rich =
  | { kind: 'p'; text: string }
  | { kind: 'example'; good?: string; bad?: string; note?: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] }

export type Block = { label: string; heading: string; body: Rich[] }

type ItemBase = { id: ItemId; why: string; phenomenon: Phenomenon }

export type Item =
  /** `context` must contain exactly one `____` blank marker. */
  | (ItemBase & { kind: 'gap'; context: string; answers: string[] })
  | (ItemBase & { kind: 'choice'; prompt: string; options: string[]; correct: number })
  | (ItemBase & { kind: 'judge'; sentence: string; correct: boolean })
  | (ItemBase & { kind: 'transform'; source: string; instruction: string; answers: string[] })
  | (ItemBase & { kind: 'errorHunt'; text: string; span: [number, number]; fix: string })

export type Unit = {
  id: number
  slug: string
  title: string
  part: PartId
  /** Display badge only — never feeds engine logic. */
  level: 'review' | 'core' | 'advanced'
  phenomena: Phenomenon[]
  blocks: Block[]
  items: Item[]
}

export const BLANK = '____'
```

- [ ] **Step 3: Escrever o barril de conteúdo (ainda vazio)**

```ts
// src/content/index.ts
import type { Item, ItemId, Unit } from './types'

export const UNITS: Unit[] = []

export function unitById(id: number): Unit | undefined {
  return UNITS.find((u) => u.id === id)
}
export function allItems(): Item[] {
  return UNITS.flatMap((u) => u.items)
}
export function allItemIds(): ItemId[] {
  return allItems().map((i) => i.id)
}
export function itemById(id: ItemId): Item | undefined {
  return allItems().find((i) => i.id === id)
}
```

- [ ] **Step 4: Escrever o lint de conteúdo e vê-lo falhar**

```ts
// src/content/content.lint.test.ts
import { UNITS, allItems } from './index'
import { BLANK } from './types'
import { PART_IDS, PHENOMENA } from './taxonomy'

test('corpus is not empty', () => {
  expect(UNITS.length).toBeGreaterThan(0)
})

test('unit ids and slugs are unique', () => {
  const ids = UNITS.map((u) => u.id)
  const slugs = UNITS.map((u) => u.slug)
  expect(ids.filter((id, n) => ids.indexOf(id) !== n), 'duplicate unit ids').toEqual([])
  expect(slugs.filter((s, n) => slugs.indexOf(s) !== n), 'duplicate unit slugs').toEqual([])
})

test('every unit declares a known part and at least one block and item', () => {
  for (const u of UNITS) {
    expect(PART_IDS, `unknown part on unit ${u.id}`).toContain(u.part)
    expect(u.blocks.length, `unit ${u.id} has no blocks`).toBeGreaterThan(0)
    expect(u.items.length, `unit ${u.id} has no items`).toBeGreaterThan(0)
  }
})

test('item ids are unique across the whole corpus', () => {
  const ids = allItems().map((i) => i.id)
  const dupes = ids.filter((id, n) => ids.indexOf(id) !== n)
  expect(dupes).toEqual([])
})

test('every item has a non-empty why and a known phenomenon', () => {
  for (const i of allItems()) {
    expect(i.why.trim().length, `empty why on ${i.id}`).toBeGreaterThan(0)
    expect(PHENOMENA, `unknown phenomenon on ${i.id}`).toContain(i.phenomenon)
  }
})

// A unit's declared `phenomena` must cover what its items actually test.
// Nothing else catches an incomplete list: the check above only validates each
// item against the GLOBAL taxonomy, never against its own unit's declaration.
// The Progress screen groups accuracy by phenomenon, so a unit that under-declares
// silently drops itself out of its own statistics.
test('every unit declares the phenomena its items test', () => {
  for (const u of UNITS) {
    const tested = [...new Set(u.items.map((i) => i.phenomenon))]
    const undeclared = tested.filter((p) => !u.phenomena.includes(p))
    expect(undeclared, `unit ${u.id} tests phenomena it does not declare`).toEqual([])
  }
})

test('gap items have exactly one blank and at least one accepted answer', () => {
  for (const i of allItems()) {
    if (i.kind !== 'gap') continue
    expect(i.context.split(BLANK).length - 1, `blank count on ${i.id}`).toBe(1)
    expect(i.answers.length, `no answers on ${i.id}`).toBeGreaterThan(0)
  }
})

test('transform items have at least one accepted answer', () => {
  for (const i of allItems()) {
    if (i.kind !== 'transform') continue
    expect(i.answers.length, `no answers on ${i.id}`).toBeGreaterThan(0)
  }
})

test('choice items have in-range correct index and at least two options', () => {
  for (const i of allItems()) {
    if (i.kind !== 'choice') continue
    expect(i.options.length, `too few options on ${i.id}`).toBeGreaterThanOrEqual(2)
    expect(i.correct, `negative correct index on ${i.id}`).toBeGreaterThanOrEqual(0)
    expect(i.correct, `correct index out of range on ${i.id}`).toBeLessThan(i.options.length)
  }
})

test('errorHunt spans fall inside the text', () => {
  for (const i of allItems()) {
    if (i.kind !== 'errorHunt') continue
    const [a, b] = i.span
    expect(a, `negative span start on ${i.id}`).toBeGreaterThanOrEqual(0)
    expect(b, `empty or inverted span on ${i.id}`).toBeGreaterThan(a)
    expect(b, `span runs past the text on ${i.id}`).toBeLessThanOrEqual(i.text.length)
  }
})

test('item ids follow the u<NNN>.<slug>.<NN> convention', () => {
  for (const i of allItems()) {
    expect(i.id, `malformed id ${i.id}`).toMatch(/^u\d{3}\.[a-z0-9-]+\.\d{2}$/)
  }
})

// Spec §4: ~10 items per unit, at least 2 judge and 2 gap. `judge` is fast on
// touch and diagnostic for fossilization; `gap` forces production. A unit made
// only of multiple choice would be recognition practice, which is what this
// whole design is built to avoid.
test('every unit has a workable item mix', () => {
  for (const u of UNITS) {
    const count = (kind: string) => u.items.filter((i) => i.kind === kind).length
    expect(u.items.length, `unit ${u.id} has too few items`).toBeGreaterThanOrEqual(8)
    expect(count('judge'), `unit ${u.id} needs at least 2 judge items`).toBeGreaterThanOrEqual(2)
    expect(count('gap'), `unit ${u.id} needs at least 2 gap items`).toBeGreaterThanOrEqual(2)
  }
})
```

- [ ] **Step 5: Rodar o lint e confirmar que falha por corpus vazio**

Rode: `npm test -- src/content/content.lint.test.ts`
Esperado: FAIL em `corpus is not empty` (os demais passam vacuamente). É a falha correta — a Task 3 a resolve com conteúdo real.

- [ ] **Step 6: Commit**

```bash
git add src/content
git commit -m "feat: modelo de conteúdo tipado e lint de corpus"
```

---

## Task 3: Primeira unidade real

Conteúdo de verdade, não fixture. O lint da Task 2 passa a verde por causa desta task.

**Files:**
- Create: `src/content/units/u001.ts`
- Modify: `src/content/index.ts`

**Interfaces:**
- Consumes: `Unit`, `Item`, `BLANK` de `content/types.ts`; `Phenomenon` de `content/taxonomy.ts`
- Produces: `u001: Unit`, registrada em `UNITS`

- [ ] **Step 1: Escrever a unidade 1**

```ts
// src/content/units/u001.ts
import type { Unit } from '../types'

export const u001: Unit = {
  id: 1,
  slug: 'zero-article-with-generics',
  title: 'Zero article with generic plurals',
  part: 'noun-phrase',
  level: 'review',
  phenomena: ['zero-article', 'generic-reference', 'definite-article', 'uncountable-nouns'],
  blocks: [
    {
      label: 'A',
      heading: 'The pattern',
      body: [
        { kind: 'p', text: 'When a plural noun refers to a class of things in general, English uses no article at all. This is the zero article.' },
        { kind: 'example', good: 'Neural networks are trained on large corpora.', bad: 'The neural networks are trained on large corpora.', note: 'The bad version says something about a specific, previously identified set of networks.' },
        { kind: 'example', good: 'Rats show a startle response to sudden noise.', bad: 'The rats show a startle response to sudden noise.' },
      ],
    },
    {
      label: 'B',
      heading: 'Uncountable nouns behave the same way',
      body: [
        { kind: 'p', text: 'Uncountable nouns used generically also take no article. Many of these are countable in Portuguese, which is why the article slips in.' },
        { kind: 'list', items: ['evidence', 'research', 'information', 'software', 'equipment', 'literature'] },
        { kind: 'example', good: 'Evidence for this mechanism is still limited.', bad: 'The evidence for this mechanism is still limited.', note: 'Use "the" only when you mean specific evidence already introduced.' },
      ],
    },
    {
      label: 'C',
      heading: 'When "the" is correct after all',
      body: [
        { kind: 'p', text: 'Use "the" when the reference is specific: identified by context, by a modifier, or because it was mentioned before.' },
        { kind: 'example', good: 'The networks we trained in Section 3 converged quickly.', note: 'This relative clause points at one particular, already-trained set, and that is what makes the reference specific. A relative clause does not do this on its own: "Networks that use attention scale well" stays generic and takes no article.' },
        { kind: 'example', good: 'We trained three networks. The networks differed only in depth.', note: 'Second mention.' },
      ],
    },
  ],
  items: [
    { kind: 'gap', id: 'u001.generic-plural.01', phenomenon: 'zero-article',
      context: '____ neural networks are trained on large corpora.',
      answers: [''],
      why: 'Generic plural: no article. Leave the blank empty.' },
    { kind: 'gap', id: 'u001.generic-plural.02', phenomenon: 'definite-article',
      context: '____ networks we trained in Section 3 converged quickly.',
      answers: ['The', 'the'],
      why: 'The relative clause "we trained in Section 3" makes the reference specific, so "the" is required.' },
    { kind: 'gap', id: 'u001.uncountable.03', phenomenon: 'uncountable-nouns',
      context: '____ evidence for this mechanism is still limited.',
      answers: [''],
      why: 'Generic uncountable noun: no article. Portuguese would use "a evidência", which is what pulls the article in.' },
    { kind: 'judge', id: 'u001.judge.04', phenomenon: 'zero-article',
      sentence: 'In general, the transformers have replaced recurrent models in most benchmarks.',
      correct: false,
      why: '"In general" signals a claim about the class as a whole, and English marks that with the bare plural: "transformers have replaced". "The transformers" can only mean one particular, already-identified set.' },
    { kind: 'judge', id: 'u001.judge.05', phenomenon: 'generic-reference',
      sentence: 'Rats show a startle response to sudden noise.',
      correct: true,
      why: 'Correct. Generic plural with zero article.' },
    { kind: 'judge', id: 'u001.judge.06', phenomenon: 'uncountable-nouns',
      sentence: 'We collected many informations about the task.',
      correct: false,
      why: '"Information" is uncountable in English: "much information" or "a great deal of information".' },
    { kind: 'choice', id: 'u001.choice.07', phenomenon: 'definite-article',
      prompt: 'We ran three models. ___ models differed only in depth.',
      options: ['The', 'A', '(no article)'],
      correct: 0,
      why: 'Second mention of an already-introduced set, so the reference is specific.' },
    { kind: 'choice', id: 'u001.choice.08', phenomenon: 'zero-article',
      prompt: '___ research on this topic has accelerated since 2020.',
      options: ['The', 'A', '(no article)'],
      correct: 2,
      why: 'Generic uncountable noun. "The research" would mean a specific body of work already identified.' },
    { kind: 'transform', id: 'u001.transform.09', phenomenon: 'zero-article',
      instruction: 'Rewrite so that the sentence refers to convolutional networks in general.',
      source: 'The convolutional networks are sensitive to input scale.',
      answers: ['Convolutional networks are sensitive to input scale.'],
      why: 'Drop the article to move from a specific set to the class as a whole.' },
    { kind: 'errorHunt', id: 'u001.error-hunt.10', phenomenon: 'uncountable-nouns',
      text: 'We reviewed the literatures on neonatal EEG before designing the protocol.',
      span: [16, 27],
      fix: 'literature',
      why: '"Literature" in the scholarly sense is uncountable and has no plural form.' },
  ],
}
```

- [ ] **Step 2: Registrar a unidade no barril**

```ts
// src/content/index.ts — substituir a linha de UNITS
import { u001 } from './units/u001'

export const UNITS: Unit[] = [u001]
```

- [ ] **Step 3: Rodar o lint e verificar que passa**

Rode: `npm test -- src/content/content.lint.test.ts`
Esperado: PASS em todos os casos.

Se `item ids follow the convention` falhar, confira que cada id casa `u001.<slug>.<NN>` com dois dígitos no fim.

- [ ] **Step 4: Commit**

```bash
git add src/content
git commit -m "feat: unidade 1 — zero article com plurais genéricos"
```

---

## Task 4: Correção de resposta

O ponto mais delicado do motor: tolerante ao acidental, intolerante ao gramatical.

**Files:**
- Create: `src/engine/answer.ts`, `src/engine/answer.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `normalizeAnswer(raw: string): string`, `checkAnswer(raw: string, accepted: string[]): boolean`

- [ ] **Step 1: Escrever os testes e vê-los falhar**

```ts
// src/engine/answer.test.ts
import { checkAnswer, normalizeAnswer } from './answer'

describe('normalizeAnswer', () => {
  test('trims and lowercases', () => {
    expect(normalizeAnswer('  The  ')).toBe('the')
  })
  test('collapses internal whitespace', () => {
    expect(normalizeAnswer('has   been   shown')).toBe('has been shown')
  })
  test('treats curly and straight apostrophes as the same', () => {
    expect(normalizeAnswer('don’t')).toBe(normalizeAnswer("don't"))
  })
  test('strips a single trailing period', () => {
    expect(normalizeAnswer('Networks are trained.')).toBe('networks are trained')
  })
})

describe('checkAnswer', () => {
  test('accepts an exact match', () => {
    expect(checkAnswer('the', ['the'])).toBe(true)
  })
  test('accepts a case and spacing variant', () => {
    expect(checkAnswer('  The ', ['the'])).toBe(true)
  })
  test('accepts any listed alternative', () => {
    expect(checkAnswer('a', ['an', 'a'])).toBe(true)
  })
  test('rejects a grammatical difference', () => {
    expect(checkAnswer('the', [''])).toBe(false)
    expect(checkAnswer('an', ['a'])).toBe(false)
  })
  test('rejects a contraction not listed among the answers', () => {
    expect(checkAnswer("don't", ['do not'])).toBe(false)
  })
  test('accepts a contraction when the author listed both', () => {
    expect(checkAnswer("don't", ['do not', "don't"])).toBe(true)
  })

  // The zero-article case: blank input is a real answer, not "no answer".
  test('accepts an empty submission when the empty string is accepted', () => {
    expect(checkAnswer('', [''])).toBe(true)
    expect(checkAnswer('   ', [''])).toBe(true)
  })
  test('rejects an empty submission when a word is required', () => {
    expect(checkAnswer('', ['the'])).toBe(false)
  })
})
```

Rode: `npm test -- src/engine/answer.test.ts`
Esperado: FAIL — `Failed to resolve import "./answer"`.

- [ ] **Step 2: Implementar**

```ts
// src/engine/answer.ts

/** Normalizes away accidental differences only. Grammatical differences survive. */
export function normalizeAnswer(raw: string): string {
  return raw
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim()
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function checkAnswer(raw: string, accepted: string[]): boolean {
  const given = normalizeAnswer(raw)
  return accepted.some((a) => normalizeAnswer(a) === given)
}
```

- [ ] **Step 3: Rodar os testes e verificar que passam**

Rode: `npm test -- src/engine/answer.test.ts`
Esperado: PASS, 11 testes.

- [ ] **Step 4: Commit**

```bash
git add src/engine
git commit -m "feat: correção de resposta tolerante ao acidental"
```

---

## Task 5: Agendador FSRS

**Files:**
- Create: `src/engine/scheduler.ts`, `src/engine/scheduler.test.ts`

**Interfaces:**
- Consumes: `ItemId` de `content/types.ts`
- Produces: tipo `Grade = 'again' | 'hard' | 'good'`; tipo `StoredCard`; `newCard(itemId: ItemId, now: number): StoredCard`; `gradeCard(card: StoredCard, grade: Grade, now: number): StoredCard`

- [ ] **Step 1: Escrever os testes e vê-los falhar**

```ts
// src/engine/scheduler.test.ts
import { gradeCard, newCard } from './scheduler'

const T0 = 1_754_600_000_000 // fixed epoch ms; no Date.now() in tests

describe('newCard', () => {
  test('is due immediately and has no review history', () => {
    const c = newCard('u001.generic-plural.01', T0)
    expect(c.itemId).toBe('u001.generic-plural.01')
    expect(c.due).toBeLessThanOrEqual(T0)
    expect(c.reps).toBe(0)
    expect(c.lapses).toBe(0)
    expect(c.introducedAt).toBe(T0)
    expect(c.lastReview).toBeNull()
  })
})

describe('gradeCard', () => {
  test('good pushes the due date into the future and records the review', () => {
    const next = gradeCard(newCard('x.y.01', T0), 'good', T0)
    expect(next.due).toBeGreaterThan(T0)
    expect(next.reps).toBe(1)
    expect(next.lastReview).toBe(T0)
  })

  test('again keeps the card due within the same day', () => {
    const next = gradeCard(newCard('x.y.01', T0), 'again', T0)
    expect(next.due - T0).toBeLessThan(24 * 60 * 60 * 1000)
  })

  test('hard schedules sooner than good on the same card', () => {
    const base = gradeCard(newCard('x.y.01', T0), 'good', T0)
    const hard = gradeCard(base, 'hard', base.due)
    const good = gradeCard(base, 'good', base.due)
    expect(hard.due).toBeLessThan(good.due)
  })

  test('again increments lapses on a card that was already learned', () => {
    const learned = gradeCard(gradeCard(newCard('x.y.01', T0), 'good', T0), 'good', T0 + 86_400_000)
    const lapsed = gradeCard(learned, 'again', learned.due)
    expect(lapsed.lapses).toBeGreaterThan(learned.lapses)
  })

  test('preserves itemId and introducedAt across grading', () => {
    const c = newCard('u001.judge.04', T0)
    const next = gradeCard(c, 'good', T0)
    expect(next.itemId).toBe('u001.judge.04')
    expect(next.introducedAt).toBe(T0)
  })

  test('the returned card is serializable (no Date instances)', () => {
    const next = gradeCard(newCard('x.y.01', T0), 'good', T0)
    for (const v of Object.values(next)) expect(v instanceof Date).toBe(false)
    expect(() => JSON.stringify(next)).not.toThrow()
  })
})
```

Rode: `npm test -- src/engine/scheduler.test.ts`
Esperado: FAIL — módulo inexistente.

- [ ] **Step 2: Implementar o invólucro**

`ts-fsrs` trabalha com `Date`; a fronteira converte para epoch ms, porque `Date` não sobrevive ao IndexedDB de forma previsível e o resto do app usa `number`.

```ts
// src/engine/scheduler.ts
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card } from 'ts-fsrs'
import type { ItemId } from '@/content/types'

export type Grade = 'again' | 'hard' | 'good'

export type StoredCard = {
  itemId: ItemId
  due: number
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  state: number
  lastReview: number | null
  introducedAt: number
}

const scheduler = fsrs(generatorParameters({ enable_fuzz: false }))

const RATING: Record<Grade, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
}

function toStored(card: Card, itemId: ItemId, introducedAt: number): StoredCard {
  return {
    itemId,
    introducedAt,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.getTime() : null,
  }
}

function toFsrs(c: StoredCard): Card {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsedDays,
    scheduled_days: c.scheduledDays,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.lastReview === null ? undefined : new Date(c.lastReview),
  } as Card
}

export function newCard(itemId: ItemId, now: number): StoredCard {
  return toStored(createEmptyCard(new Date(now)), itemId, now)
}

export function gradeCard(card: StoredCard, grade: Grade, now: number): StoredCard {
  const result = scheduler.next(toFsrs(card), new Date(now), RATING[grade])
  return toStored(result.card, card.itemId, card.introducedAt)
}
```

- [ ] **Step 3: Rodar os testes**

Rode: `npm test -- src/engine/scheduler.test.ts`
Esperado: PASS, 7 testes.

Se a API do `ts-fsrs` divergir (`scheduler.next` ausente, ou `repeat` retornando um record por Rating), consulte `node_modules/ts-fsrs/dist/index.d.ts` e ajuste **apenas** as duas funções de fronteira — a assinatura pública de `newCard`/`gradeCard` não muda, porque é dela que as tasks 7, 8 e 9 dependem.

- [ ] **Step 4: Commit**

```bash
git add src/engine
git commit -m "feat: invólucro do agendador FSRS com cartão serializável"
```

---

## Task 6: Persistência (IndexedDB com fallback em memória)

**Files:**
- Create: `src/store/db.ts`, `src/store/db.test.ts`

**Interfaces:**
- Consumes: `StoredCard` de `engine/scheduler.ts`
- Produces: tipo `Settings = { newPerDay: number; theme: 'system' | 'light' | 'dark' }`; tipo `Store`; `openStore(): Promise<{ store: Store; persistent: boolean }>`; `memoryStore(): Store`; `DEFAULT_SETTINGS`

- [ ] **Step 1: Escrever os testes e vê-los falhar**

```ts
// src/store/db.test.ts
import { DEFAULT_SETTINGS, memoryStore, openStore } from './db'
import { newCard } from '@/engine/scheduler'

const T0 = 1_754_600_000_000

describe('memoryStore', () => {
  test('round-trips cards', async () => {
    const s = memoryStore()
    await s.putCard(newCard('a.b.01', T0))
    const all = await s.getCards()
    expect(all).toHaveLength(1)
    expect(all[0]!.itemId).toBe('a.b.01')
  })

  test('putCard overwrites by itemId rather than appending', async () => {
    const s = memoryStore()
    await s.putCard(newCard('a.b.01', T0))
    await s.putCard({ ...newCard('a.b.01', T0), reps: 5 })
    const all = await s.getCards()
    expect(all).toHaveLength(1)
    expect(all[0]!.reps).toBe(5)
  })

  test('settings default until written', async () => {
    const s = memoryStore()
    expect(await s.getSettings()).toEqual(DEFAULT_SETTINGS)
    await s.putSettings({ ...DEFAULT_SETTINGS, newPerDay: 5 })
    expect((await s.getSettings()).newPerDay).toBe(5)
  })

  test('replaceAll wipes previous cards', async () => {
    const s = memoryStore()
    await s.putCard(newCard('a.b.01', T0))
    await s.replaceAll([newCard('c.d.02', T0)], DEFAULT_SETTINGS)
    const all = await s.getCards()
    expect(all.map((c) => c.itemId)).toEqual(['c.d.02'])
  })

  test('session counter starts at zero, persists, and resets on replaceAll', async () => {
    const s = memoryStore()
    expect(await s.getSessionsSinceExport()).toBe(0)
    await s.putSessionsSinceExport(7)
    expect(await s.getSessionsSinceExport()).toBe(7)
    await s.replaceAll([], DEFAULT_SETTINGS)
    expect(await s.getSessionsSinceExport()).toBe(0)
  })
})

describe('openStore', () => {
  test('falls back to a memory store and reports non-persistent when indexedDB is missing', async () => {
    const original = globalThis.indexedDB
    // @ts-expect-error - simulating a browser without IndexedDB
    delete globalThis.indexedDB
    try {
      const { store, persistent } = await openStore()
      expect(persistent).toBe(false)
      await store.putCard(newCard('a.b.01', T0))
      expect(await store.getCards()).toHaveLength(1)
    } finally {
      globalThis.indexedDB = original
    }
  })
})
```

Rode: `npm test -- src/store/db.test.ts`
Esperado: FAIL — módulo inexistente.

- [ ] **Step 2: Implementar**

```ts
// src/store/db.ts
import { openDB, type IDBPDatabase } from 'idb'
import type { StoredCard } from '@/engine/scheduler'

export type Settings = { newPerDay: number; theme: 'system' | 'light' | 'dark' }
export const DEFAULT_SETTINGS: Settings = { newPerDay: 12, theme: 'system' }

export type Store = {
  getCards(): Promise<StoredCard[]>
  putCard(card: StoredCard): Promise<void>
  getSettings(): Promise<Settings>
  putSettings(s: Settings): Promise<void>
  /** Sessions finished since the last export — drives the backup reminder. */
  getSessionsSinceExport(): Promise<number>
  putSessionsSinceExport(n: number): Promise<void>
  replaceAll(cards: StoredCard[], s: Settings): Promise<void>
}

const DB_NAME = 'book-english'
const CARDS = 'cards'
const META = 'meta'

export function memoryStore(): Store {
  const cards = new Map<string, StoredCard>()
  let settings: Settings = { ...DEFAULT_SETTINGS }
  let sessions = 0
  return {
    async getCards() { return [...cards.values()] },
    async putCard(c) { cards.set(c.itemId, c) },
    async getSettings() { return { ...settings } },
    async putSettings(s) { settings = { ...s } },
    async getSessionsSinceExport() { return sessions },
    async putSessionsSinceExport(n) { sessions = n },
    async replaceAll(next, s) {
      cards.clear()
      for (const c of next) cards.set(c.itemId, c)
      settings = { ...s }
      sessions = 0
    },
  }
}

function idbStore(db: IDBPDatabase): Store {
  return {
    async getCards() { return (await db.getAll(CARDS)) as StoredCard[] },
    async putCard(c) { await db.put(CARDS, c) },
    async getSettings() {
      return ((await db.get(META, 'settings')) as Settings) ?? { ...DEFAULT_SETTINGS }
    },
    async putSettings(s) { await db.put(META, s, 'settings') },
    async getSessionsSinceExport() {
      return ((await db.get(META, 'sessionsSinceExport')) as number) ?? 0
    },
    async putSessionsSinceExport(n) { await db.put(META, n, 'sessionsSinceExport') },
    async replaceAll(next, s) {
      const tx = db.transaction([CARDS, META], 'readwrite')
      await tx.objectStore(CARDS).clear()
      for (const c of next) await tx.objectStore(CARDS).put(c)
      await tx.objectStore(META).put(s, 'settings')
      await tx.objectStore(META).put(0, 'sessionsSinceExport')
      await tx.done
    },
  }
}

/**
 * Never throws. When IndexedDB is unavailable (Safari private mode, quota,
 * blocked storage) the caller gets a working in-memory store and
 * `persistent: false`, which the UI must surface — silently pretending to
 * save is the one behavior we refuse.
 */
export async function openStore(): Promise<{ store: Store; persistent: boolean }> {
  try {
    if (typeof indexedDB === 'undefined') return { store: memoryStore(), persistent: false }
    const db = await openDB(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(CARDS)) {
          database.createObjectStore(CARDS, { keyPath: 'itemId' })
        }
        if (!database.objectStoreNames.contains(META)) database.createObjectStore(META)
      },
    })
    return { store: idbStore(db), persistent: true }
  } catch {
    return { store: memoryStore(), persistent: false }
  }
}
```

- [ ] **Step 3: Rodar os testes**

Rode: `npm test -- src/store/db.test.ts`
Esperado: PASS, 6 testes.

- [ ] **Step 4: Commit**

```bash
git add src/store
git commit -m "feat: persistência em IndexedDB com fallback honesto em memória"
```

---

## Task 7: Montagem da fila

**Files:**
- Create: `src/engine/queue.ts`, `src/engine/queue.test.ts`

**Interfaces:**
- Consumes: `StoredCard` de `engine/scheduler.ts`; `ItemId` de `content/types.ts`
- Produces: `startOfDay(now: number): number`; `buildReviewQueue(cards: StoredCard[], known: Set<ItemId>, now: number): ItemId[]`; `introducedToday(cards: StoredCard[], now: number): number`; `newItemsRemainingToday(cards: StoredCard[], now: number, cap: number): number`; `orphanIds(cards: StoredCard[], known: Set<ItemId>): ItemId[]`

- [ ] **Step 1: Escrever os testes e vê-los falhar**

```ts
// src/engine/queue.test.ts
import { buildReviewQueue, introducedToday, newItemsRemainingToday, orphanIds } from './queue'
import { newCard, type StoredCard } from './scheduler'

const T0 = 1_754_600_000_000
const DAY = 86_400_000
const card = (itemId: string, over: Partial<StoredCard> = {}): StoredCard =>
  ({ ...newCard(itemId, T0), ...over })

const known = (...ids: string[]) => new Set(ids)

describe('buildReviewQueue', () => {
  test('includes only cards due at or before now', () => {
    const cards = [
      card('a.b.01', { due: T0 - DAY }),
      card('a.b.02', { due: T0 + DAY }),
    ]
    expect(buildReviewQueue(cards, known('a.b.01', 'a.b.02'), T0)).toEqual(['a.b.01'])
  })

  test('sorts by due date, oldest first', () => {
    const cards = [
      card('a.b.02', { due: T0 - DAY }),
      card('a.b.01', { due: T0 - 3 * DAY }),
    ]
    expect(buildReviewQueue(cards, known('a.b.01', 'a.b.02'), T0)).toEqual(['a.b.01', 'a.b.02'])
  })

  test('drops orphans whose item no longer exists in the corpus', () => {
    const cards = [card('gone.x.01', { due: T0 - DAY }), card('a.b.01', { due: T0 - DAY })]
    expect(buildReviewQueue(cards, known('a.b.01'), T0)).toEqual(['a.b.01'])
  })
})

describe('introducedToday', () => {
  test('counts cards introduced since local midnight', () => {
    const cards = [
      card('a.b.01', { introducedAt: T0 }),
      card('a.b.02', { introducedAt: T0 - 3 * DAY }),
    ]
    expect(introducedToday(cards, T0)).toBe(1)
  })
})

describe('newItemsRemainingToday', () => {
  test('subtracts what was already introduced today', () => {
    const cards = [card('a.b.01', { introducedAt: T0 }), card('a.b.02', { introducedAt: T0 })]
    expect(newItemsRemainingToday(cards, T0, 12)).toBe(10)
  })
  test('never goes below zero when the cap was lowered', () => {
    const cards = [card('a.b.01', { introducedAt: T0 }), card('a.b.02', { introducedAt: T0 })]
    expect(newItemsRemainingToday(cards, T0, 1)).toBe(0)
  })
})

describe('orphanIds', () => {
  test('reports cards whose item is gone from the corpus', () => {
    expect(orphanIds([card('gone.x.01'), card('a.b.01')], known('a.b.01'))).toEqual(['gone.x.01'])
  })
})
```

Rode: `npm test -- src/engine/queue.test.ts`
Esperado: FAIL — módulo inexistente.

- [ ] **Step 2: Implementar**

```ts
// src/engine/queue.ts
import type { ItemId } from '@/content/types'
import type { StoredCard } from './scheduler'

/** Local midnight for the day containing `now`. */
export function startOfDay(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function orphanIds(cards: StoredCard[], known: Set<ItemId>): ItemId[] {
  return cards.filter((c) => !known.has(c.itemId)).map((c) => c.itemId)
}

export function buildReviewQueue(
  cards: StoredCard[], known: Set<ItemId>, now: number,
): ItemId[] {
  return cards
    .filter((c) => known.has(c.itemId) && c.due <= now)
    .sort((a, b) => a.due - b.due)
    .map((c) => c.itemId)
}

export function introducedToday(cards: StoredCard[], now: number): number {
  const midnight = startOfDay(now)
  return cards.filter((c) => c.introducedAt >= midnight).length
}

export function newItemsRemainingToday(
  cards: StoredCard[], now: number, cap: number,
): number {
  return Math.max(0, cap - introducedToday(cards, now))
}
```

- [ ] **Step 3: Rodar os testes**

Rode: `npm test -- src/engine/queue.test.ts`
Esperado: PASS, 7 testes.

- [ ] **Step 4: Commit**

```bash
git add src/engine
git commit -m "feat: montagem da fila de revisão com teto de novos e descarte de órfãos"
```

---

## Task 8: Exportar e importar progresso

Única rede de proteção contra perda de meses de estudo. Import inválido **nunca** aplica parcialmente.

**Files:**
- Create: `src/engine/progress.ts`, `src/engine/progress.test.ts`

**Interfaces:**
- Consumes: `StoredCard` de `engine/scheduler.ts`; `Settings`, `DEFAULT_SETTINGS` de `store/db.ts`
- Produces: tipo `ProgressFile`; `serializeProgress(cards: StoredCard[], settings: Settings, exportedAt: number): string`; `parseProgress(json: string): ProgressFile` (lança `Error` com mensagem em inglês quando inválido)

- [ ] **Step 1: Escrever os testes e vê-los falhar**

```ts
// src/engine/progress.test.ts
import { parseProgress, serializeProgress } from './progress'
import { newCard } from './scheduler'
import { DEFAULT_SETTINGS } from '@/store/db'

const T0 = 1_754_600_000_000

test('round-trips cards and settings', () => {
  const cards = [newCard('a.b.01', T0), newCard('a.b.02', T0)]
  const parsed = parseProgress(serializeProgress(cards, DEFAULT_SETTINGS, T0))
  expect(parsed.cards).toEqual(cards)
  expect(parsed.settings).toEqual(DEFAULT_SETTINGS)
  expect(parsed.exportedAt).toBe(T0)
  expect(parsed.version).toBe(1)
})

test('rejects malformed JSON', () => {
  expect(() => parseProgress('{ not json')).toThrow(/not valid JSON/i)
})

test('rejects an unknown file version', () => {
  const bad = JSON.stringify({ version: 99, exportedAt: T0, cards: [], settings: DEFAULT_SETTINGS })
  expect(() => parseProgress(bad)).toThrow(/version/i)
})

test('rejects a file whose cards are not an array', () => {
  const bad = JSON.stringify({ version: 1, exportedAt: T0, cards: {}, settings: DEFAULT_SETTINGS })
  expect(() => parseProgress(bad)).toThrow(/cards/i)
})

test('rejects a card missing required numeric fields', () => {
  const bad = JSON.stringify({
    version: 1, exportedAt: T0, settings: DEFAULT_SETTINGS,
    cards: [{ itemId: 'a.b.01', due: 'soon' }],
  })
  expect(() => parseProgress(bad)).toThrow(/card/i)
})

test('rejects settings with a non-numeric newPerDay', () => {
  const bad = JSON.stringify({
    version: 1, exportedAt: T0, cards: [],
    settings: { newPerDay: 'lots', theme: 'system' },
  })
  expect(() => parseProgress(bad)).toThrow(/settings/i)
})
```

Rode: `npm test -- src/engine/progress.test.ts`
Esperado: FAIL — módulo inexistente.

- [ ] **Step 2: Implementar**

```ts
// src/engine/progress.ts
import type { StoredCard } from './scheduler'
import { DEFAULT_SETTINGS, type Settings } from '@/store/db'

export type ProgressFile = {
  version: 1
  exportedAt: number
  cards: StoredCard[]
  settings: Settings
}

const NUMERIC_FIELDS = [
  'due', 'stability', 'difficulty', 'elapsedDays', 'scheduledDays',
  'reps', 'lapses', 'state', 'introducedAt',
] as const

export function serializeProgress(
  cards: StoredCard[], settings: Settings, exportedAt: number,
): string {
  const file: ProgressFile = { version: 1, exportedAt, cards, settings }
  return JSON.stringify(file, null, 2)
}

/** Validates the whole file before returning. Never applies partially. */
export function parseProgress(json: string): ProgressFile {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  if (typeof raw !== 'object' || raw === null) throw new Error('This file is not a progress file.')
  const o = raw as Record<string, unknown>

  if (o.version !== 1) throw new Error('Unsupported progress file version.')
  if (typeof o.exportedAt !== 'number') throw new Error('Progress file has no export timestamp.')
  if (!Array.isArray(o.cards)) throw new Error('Progress file has no cards array.')

  const cards = o.cards.map((c, n) => {
    if (typeof c !== 'object' || c === null) throw new Error(`Card ${n} is not an object.`)
    const card = c as Record<string, unknown>
    if (typeof card.itemId !== 'string' || card.itemId.length === 0) {
      throw new Error(`Card ${n} has no itemId.`)
    }
    for (const f of NUMERIC_FIELDS) {
      if (typeof card[f] !== 'number' || !Number.isFinite(card[f])) {
        throw new Error(`Card ${n} (${card.itemId}) has an invalid "${f}".`)
      }
    }
    if (card.lastReview !== null && typeof card.lastReview !== 'number') {
      throw new Error(`Card ${n} (${card.itemId}) has an invalid "lastReview".`)
    }
    return card as unknown as StoredCard
  })

  const s = o.settings
  if (typeof s !== 'object' || s === null) throw new Error('Progress file has no settings.')
  const settings = s as Record<string, unknown>
  if (typeof settings.newPerDay !== 'number' || !Number.isFinite(settings.newPerDay)) {
    throw new Error('Progress file settings have an invalid "newPerDay".')
  }
  if (!['system', 'light', 'dark'].includes(String(settings.theme))) {
    throw new Error('Progress file settings have an invalid "theme".')
  }

  return {
    version: 1,
    exportedAt: o.exportedAt,
    cards,
    settings: { ...DEFAULT_SETTINGS, ...(settings as unknown as Settings) },
  }
}
```

- [ ] **Step 3: Rodar os testes**

Rode: `npm test -- src/engine/progress.test.ts`
Esperado: PASS, 6 testes.

- [ ] **Step 4: Commit**

```bash
git add src/engine
git commit -m "feat: exportar e importar progresso com validação total antes de aplicar"
```

---

## Task 9: Store de estudo

Cola entre motor, persistência e UI. Nenhuma regra nova mora aqui — só orquestração.

**Files:**
- Create: `src/store/study.ts`, `src/store/study.test.ts`

**Interfaces:**
- Consumes: `openStore`, `Settings`, `DEFAULT_SETTINGS`, `Store` de `store/db.ts`; `newCard`, `gradeCard`, `StoredCard`, `Grade` de `engine/scheduler.ts`; `buildReviewQueue`, `newItemsRemainingToday` de `engine/queue.ts`; `allItemIds` de `content/index.ts`
- Produces: `createStudyStore(opener?)` (fábrica testável), a instância `studyStore`, e o hook `useStudy(selector)`. Estado: `{ cards, settings, sessionsSinceExport, persistent, ready }`. Ações: `hydrate()`, `introduce(itemIds, now)`, `answer(itemId, grade, now)`, `setSettings(patch)`, `completeSession()`, `exportProgress(now): string`, `importProgress(json)`. Seletores puros exportados: `reviewQueue(state, known: Set<ItemId>, now)`, `newRemaining(state, now)`.

- [ ] **Step 1: Escrever os testes e vê-los falhar**

```ts
// src/store/study.test.ts
import { createStudyStore, newRemaining, reviewQueue } from './study'
import { memoryStore } from './db'

const T0 = 1_754_600_000_000
const DAY = 86_400_000

test('hydrate marks the store ready and reports persistence', async () => {
  const s = createStudyStore(async () => ({ store: memoryStore(), persistent: true }))
  await s.getState().hydrate()
  expect(s.getState().ready).toBe(true)
  expect(s.getState().persistent).toBe(true)
})

test('hydrate surfaces a non-persistent store instead of hiding it', async () => {
  const s = createStudyStore(async () => ({ store: memoryStore(), persistent: false }))
  await s.getState().hydrate()
  expect(s.getState().persistent).toBe(false)
})

test('introduce creates cards due immediately', async () => {
  const s = createStudyStore(async () => ({ store: memoryStore(), persistent: true }))
  await s.getState().hydrate()
  await s.getState().introduce(['u001.generic-plural.01'], T0)
  expect(reviewQueue(s.getState(), new Set(['u001.generic-plural.01']), T0))
    .toEqual(['u001.generic-plural.01'])
})

test('introduce is idempotent and does not reset an existing card', async () => {
  const s = createStudyStore(async () => ({ store: memoryStore(), persistent: true }))
  await s.getState().hydrate()
  await s.getState().introduce(['a.b.01'], T0)
  await s.getState().answer('a.b.01', 'good', T0)
  const after = s.getState().cards['a.b.01']!
  await s.getState().introduce(['a.b.01'], T0 + DAY)
  expect(s.getState().cards['a.b.01']).toEqual(after)
})

test('answer advances the card and persists it', async () => {
  const store = memoryStore()
  const s = createStudyStore(async () => ({ store, persistent: true }))
  await s.getState().hydrate()
  await s.getState().introduce(['a.b.01'], T0)
  await s.getState().answer('a.b.01', 'good', T0)
  expect(s.getState().cards['a.b.01']!.reps).toBe(1)
  expect((await store.getCards())[0]!.reps).toBe(1)
})

test('newRemaining reflects the configured cap', async () => {
  const s = createStudyStore(async () => ({ store: memoryStore(), persistent: true }))
  await s.getState().hydrate()
  await s.getState().setSettings({ newPerDay: 3 })
  await s.getState().introduce(['a.b.01', 'a.b.02'], T0)
  expect(newRemaining(s.getState(), T0)).toBe(1)
})

test('completeSession counts toward the export reminder and exporting resets it', async () => {
  const store = memoryStore()
  const s = createStudyStore(async () => ({ store, persistent: true }))
  await s.getState().hydrate()
  await s.getState().completeSession()
  await s.getState().completeSession()
  expect(s.getState().sessionsSinceExport).toBe(2)
  expect(await store.getSessionsSinceExport()).toBe(2)

  s.getState().exportProgress(T0)
  expect(s.getState().sessionsSinceExport).toBe(0)
})

test('the session counter survives a reload', async () => {
  const store = memoryStore()
  const first = createStudyStore(async () => ({ store, persistent: true }))
  await first.getState().hydrate()
  await first.getState().completeSession()

  const second = createStudyStore(async () => ({ store, persistent: true }))
  await second.getState().hydrate()
  expect(second.getState().sessionsSinceExport).toBe(1)
})

test('importProgress replaces state wholesale and rejects a bad file untouched', async () => {
  const s = createStudyStore(async () => ({ store: memoryStore(), persistent: true }))
  await s.getState().hydrate()
  await s.getState().introduce(['a.b.01'], T0)
  const exported = s.getState().exportProgress(T0)

  await s.getState().introduce(['c.d.02'], T0)
  expect(Object.keys(s.getState().cards)).toHaveLength(2)

  await s.getState().importProgress(exported)
  expect(Object.keys(s.getState().cards)).toEqual(['a.b.01'])

  await expect(s.getState().importProgress('{ nope')).rejects.toThrow()
  expect(Object.keys(s.getState().cards)).toEqual(['a.b.01'])
})
```

Rode: `npm test -- src/store/study.test.ts`
Esperado: FAIL — módulo inexistente.

- [ ] **Step 2: Implementar**

```ts
// src/store/study.ts
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { ItemId } from '@/content/types'
import { gradeCard, newCard, type Grade, type StoredCard } from '@/engine/scheduler'
import { buildReviewQueue, newItemsRemainingToday } from '@/engine/queue'
import { parseProgress, serializeProgress } from '@/engine/progress'
import { DEFAULT_SETTINGS, openStore, type Settings, type Store } from './db'

/** Spec §5: nudge a backup after this many sessions without an export. */
export const EXPORT_REMINDER_AFTER = 20

export type StudyState = {
  cards: Record<ItemId, StoredCard>
  settings: Settings
  sessionsSinceExport: number
  persistent: boolean
  ready: boolean
  hydrate(): Promise<void>
  introduce(itemIds: ItemId[], now: number): Promise<void>
  answer(itemId: ItemId, grade: Grade, now: number): Promise<void>
  setSettings(patch: Partial<Settings>): Promise<void>
  completeSession(): Promise<void>
  exportProgress(now: number): string
  importProgress(json: string): Promise<void>
}

type Opener = () => Promise<{ store: Store; persistent: boolean }>

export function createStudyStore(opener: Opener = openStore) {
  let store: Store | null = null

  return createStore<StudyState>((set, get) => ({
    cards: {},
    settings: { ...DEFAULT_SETTINGS },
    sessionsSinceExport: 0,
    persistent: false,
    ready: false,

    async hydrate() {
      const opened = await opener()
      store = opened.store
      const [cards, settings, sessionsSinceExport] = await Promise.all([
        store.getCards(), store.getSettings(), store.getSessionsSinceExport(),
      ])
      set({
        cards: Object.fromEntries(cards.map((c) => [c.itemId, c])),
        settings,
        sessionsSinceExport,
        persistent: opened.persistent,
        ready: true,
      })
    },

    async introduce(itemIds, now) {
      const existing = get().cards
      const fresh = itemIds.filter((id) => !existing[id]).map((id) => newCard(id, now))
      if (fresh.length === 0) return
      for (const c of fresh) await store?.putCard(c)
      set({ cards: { ...existing, ...Object.fromEntries(fresh.map((c) => [c.itemId, c])) } })
    },

    async answer(itemId, grade, now) {
      const current = get().cards[itemId] ?? newCard(itemId, now)
      const next = gradeCard(current, grade, now)
      await store?.putCard(next)
      set({ cards: { ...get().cards, [itemId]: next } })
    },

    async setSettings(patch) {
      const settings = { ...get().settings, ...patch }
      await store?.putSettings(settings)
      set({ settings })
    },

    async completeSession() {
      const next = get().sessionsSinceExport + 1
      await store?.putSessionsSinceExport(next)
      set({ sessionsSinceExport: next })
    },

    exportProgress(now) {
      const json = serializeProgress(Object.values(get().cards), get().settings, now)
      void store?.putSessionsSinceExport(0)
      set({ sessionsSinceExport: 0 })
      return json
    },

    async importProgress(json) {
      const file = parseProgress(json) // throws before anything is touched
      await store?.replaceAll(file.cards, file.settings)
      set({
        cards: Object.fromEntries(file.cards.map((c) => [c.itemId, c])),
        settings: file.settings,
        sessionsSinceExport: 0,
      })
    },
  }))
}

export const studyStore = createStudyStore()
export function useStudy<T>(selector: (s: StudyState) => T): T {
  return useStore(studyStore, selector)
}

// Pure selectors — kept out of the store so they stay trivially testable.
export function reviewQueue(state: StudyState, known: Set<ItemId>, now: number): ItemId[] {
  return buildReviewQueue(Object.values(state.cards), known, now)
}
export function newRemaining(state: StudyState, now: number): number {
  return newItemsRemainingToday(Object.values(state.cards), now, state.settings.newPerDay)
}
```

- [ ] **Step 3: Rodar os testes**

Rode: `npm test -- src/store/study.test.ts`
Esperado: PASS, 9 testes.

- [ ] **Step 4: Commit**

```bash
git add src/store
git commit -m "feat: store de estudo ligando motor, persistência e UI"
```

---

## Task 10: Componentes de item

Cinco tipos, uma interface comum. Cada um só reporta se acertou; nada de agendamento aqui.

**Files:**
- Create: `src/components/items/ItemView.tsx` (dispatcher + tipo comum)
- Create: `src/components/items/GapItem.tsx`, `ChoiceItem.tsx`, `JudgeItem.tsx`, `TransformItem.tsx`, `ErrorHuntItem.tsx`
- Create: `src/components/items/ItemView.test.tsx`

**Interfaces:**
- Consumes: `Item`, `BLANK` de `content/types.ts`; `checkAnswer` de `engine/answer.ts`
- Produces: `type ItemViewProps = { item: Item; onAnswered: (correct: boolean) => void; disabled: boolean }`; componente `ItemView`

- [ ] **Step 1: Escrever os testes e vê-los falhar**

```tsx
// src/components/items/ItemView.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemView } from './ItemView'
import type { Item } from '@/content/types'

const gap: Item = {
  kind: 'gap', id: 'u001.g.01', phenomenon: 'zero-article',
  context: '____ neural networks are trained on large corpora.',
  answers: [''], why: 'Generic plural takes no article.',
}
const choice: Item = {
  kind: 'choice', id: 'u001.c.02', phenomenon: 'definite-article',
  prompt: 'We ran three models. ___ models differed only in depth.',
  options: ['The', 'A', '(no article)'], correct: 0, why: 'Second mention.',
}
const judge: Item = {
  kind: 'judge', id: 'u001.j.03', phenomenon: 'zero-article',
  sentence: 'The transformers have replaced recurrent models.',
  correct: false, why: 'Generic reference takes no article.',
}

test('gap: submitting an empty blank counts as the zero-article answer', async () => {
  const onAnswered = vi.fn()
  render(<ItemView item={gap} onAnswered={onAnswered} disabled={false} />)
  await userEvent.click(screen.getByRole('button', { name: 'Check' }))
  expect(onAnswered).toHaveBeenCalledWith(true)
})

test('gap: a wrong word is reported as incorrect', async () => {
  const onAnswered = vi.fn()
  render(<ItemView item={gap} onAnswered={onAnswered} disabled={false} />)
  await userEvent.type(screen.getByRole('textbox'), 'The')
  await userEvent.click(screen.getByRole('button', { name: 'Check' }))
  expect(onAnswered).toHaveBeenCalledWith(false)
})

test('gap: tells the learner that a blank answer is allowed', () => {
  render(<ItemView item={gap} onAnswered={vi.fn()} disabled={false} />)
  expect(screen.getByText(/leave blank if no word is needed/i)).toBeInTheDocument()
})

test('choice: picking the right option reports correct', async () => {
  const onAnswered = vi.fn()
  render(<ItemView item={choice} onAnswered={onAnswered} disabled={false} />)
  await userEvent.click(screen.getByRole('button', { name: 'The' }))
  expect(onAnswered).toHaveBeenCalledWith(true)
})

test('judge: the wrong verdict reports incorrect', async () => {
  const onAnswered = vi.fn()
  render(<ItemView item={judge} onAnswered={onAnswered} disabled={false} />)
  await userEvent.click(screen.getByRole('button', { name: 'Correct' }))
  expect(onAnswered).toHaveBeenCalledWith(false)
})

test('disabled items do not fire onAnswered', async () => {
  const onAnswered = vi.fn()
  render(<ItemView item={choice} onAnswered={onAnswered} disabled={true} />)
  await userEvent.click(screen.getByRole('button', { name: 'The' }))
  expect(onAnswered).not.toHaveBeenCalled()
})
```

Rode: `npm test -- src/components/items`
Esperado: FAIL — módulos inexistentes.

- [ ] **Step 2: Implementar os cinco componentes e o dispatcher**

```tsx
// src/components/items/ItemView.tsx
import type { Item } from '@/content/types'
import { GapItem } from './GapItem'
import { ChoiceItem } from './ChoiceItem'
import { JudgeItem } from './JudgeItem'
import { TransformItem } from './TransformItem'
import { ErrorHuntItem } from './ErrorHuntItem'

export type ItemViewProps = {
  item: Item
  onAnswered: (correct: boolean) => void
  disabled: boolean
}

export function ItemView({ item, onAnswered, disabled }: ItemViewProps) {
  const p = { onAnswered, disabled }
  switch (item.kind) {
    case 'gap': return <GapItem item={item} {...p} />
    case 'choice': return <ChoiceItem item={item} {...p} />
    case 'judge': return <JudgeItem item={item} {...p} />
    case 'transform': return <TransformItem item={item} {...p} />
    case 'errorHunt': return <ErrorHuntItem item={item} {...p} />
  }
}
```

```tsx
// src/components/items/GapItem.tsx
import { useState } from 'react'
import { BLANK, type Item } from '@/content/types'
import { checkAnswer } from '@/engine/answer'

type Props = { item: Extract<Item, { kind: 'gap' }>; onAnswered: (c: boolean) => void; disabled: boolean }

export function GapItem({ item, onAnswered, disabled }: Props) {
  const [value, setValue] = useState('')
  const [before, after] = item.context.split(BLANK)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return
    onAnswered(checkAnswer(value, item.answers))
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-lg leading-relaxed">
        {before}
        <input
          aria-label="Your answer"
          value={value}
          disabled={disabled}
          autoCapitalize="off" autoCorrect="off" spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
          className="mx-1 w-32 border-b-2 border-accent bg-transparent px-1 text-center outline-none"
        />
        {after}
      </p>
      <p className="text-sm text-muted">Leave blank if no word is needed.</p>
      <button type="submit" disabled={disabled}
        className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-bg disabled:opacity-50">
        Check
      </button>
    </form>
  )
}
```

```tsx
// src/components/items/ChoiceItem.tsx
import type { Item } from '@/content/types'

type Props = { item: Extract<Item, { kind: 'choice' }>; onAnswered: (c: boolean) => void; disabled: boolean }

export function ChoiceItem({ item, onAnswered, disabled }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-lg leading-relaxed">{item.prompt}</p>
      <div className="grid gap-2">
        {item.options.map((opt, n) => (
          <button key={opt} type="button" disabled={disabled}
            onClick={() => !disabled && onAnswered(n === item.correct)}
            className="rounded-lg border border-border bg-surface px-4 py-3 text-left disabled:opacity-50 can-hover:hover:border-accent">
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
```

```tsx
// src/components/items/JudgeItem.tsx
import type { Item } from '@/content/types'

type Props = { item: Extract<Item, { kind: 'judge' }>; onAnswered: (c: boolean) => void; disabled: boolean }

export function JudgeItem({ item, onAnswered, disabled }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Is this sentence correct?</p>
      <p className="text-lg leading-relaxed">{item.sentence}</p>
      <div className="grid grid-cols-2 gap-2">
        {([['Correct', true], ['Wrong', false]] as const).map(([label, verdict]) => (
          <button key={label} type="button" disabled={disabled}
            onClick={() => !disabled && onAnswered(verdict === item.correct)}
            className="rounded-lg border border-border bg-surface px-4 py-3 disabled:opacity-50 can-hover:hover:border-accent">
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

```tsx
// src/components/items/TransformItem.tsx
import { useState } from 'react'
import type { Item } from '@/content/types'
import { checkAnswer } from '@/engine/answer'

type Props = { item: Extract<Item, { kind: 'transform' }>; onAnswered: (c: boolean) => void; disabled: boolean }

export function TransformItem({ item, onAnswered, disabled }: Props) {
  const [value, setValue] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return
    onAnswered(checkAnswer(value, item.answers))
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">{item.instruction}</p>
      <p className="text-lg leading-relaxed">{item.source}</p>
      <textarea aria-label="Your answer" value={value} disabled={disabled} rows={3}
        autoCapitalize="off" autoCorrect="off" spellCheck={false}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface p-3 outline-none focus:border-accent" />
      <button type="submit" disabled={disabled}
        className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-bg disabled:opacity-50">
        Check
      </button>
    </form>
  )
}
```

```tsx
// src/components/items/ErrorHuntItem.tsx
import type { Item } from '@/content/types'

type Props = { item: Extract<Item, { kind: 'errorHunt' }>; onAnswered: (c: boolean) => void; disabled: boolean }

/** Tokenizes on word boundaries so the learner taps the offending word. */
export function ErrorHuntItem({ item, onAnswered, disabled }: Props) {
  const [start, end] = item.span
  const tokens: { text: string; at: number }[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(item.text)) !== null) tokens.push({ text: m[0], at: m.index })

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Tap the word that is wrong.</p>
      <p className="text-lg leading-relaxed">
        {tokens.map((t) => (
          <button key={t.at} type="button" disabled={disabled}
            onClick={() => !disabled && onAnswered(t.at >= start && t.at < end)}
            className="mr-1 rounded px-1 disabled:opacity-50 can-hover:hover:bg-accent/20">
            {t.text}
          </button>
        ))}
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Rodar os testes**

Rode: `npm test -- src/components/items`
Esperado: PASS, 6 testes.

- [ ] **Step 4: Commit**

```bash
git add src/components
git commit -m "feat: componentes dos cinco tipos de item"
```

---

## Task 11: Exercise runner

Máquina de estados da sessão: responder → corrigido → próximo. É onde o "I guessed" e o mapeamento para `Grade` acontecem.

**Files:**
- Create: `src/components/ExerciseRunner.tsx`, `src/components/ExerciseRunner.test.tsx`

**Interfaces:**
- Consumes: `Item` de `content/types.ts`; `ItemView` de `components/items/ItemView.tsx`; `Grade` de `engine/scheduler.ts`
- Produces: `ExerciseRunner` com props `{ items: Item[]; onGraded: (itemId: ItemId, grade: Grade) => void; onFinished: () => void }`

- [ ] **Step 1: Escrever os testes e vê-los falhar**

```tsx
// src/components/ExerciseRunner.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExerciseRunner } from './ExerciseRunner'
import type { Item } from '@/content/types'

const items: Item[] = [
  { kind: 'judge', id: 'a.b.01', phenomenon: 'zero-article',
    sentence: 'Transformers have replaced recurrent models.', correct: true,
    why: 'Generic plural: no article.' },
  { kind: 'judge', id: 'a.b.02', phenomenon: 'zero-article',
    sentence: 'The evidence are limited.', correct: false,
    why: 'Uncountable noun takes a singular verb.' },
]

test('a correct answer grades good and offers the guess downgrade', async () => {
  const onGraded = vi.fn()
  render(<ExerciseRunner items={items} onGraded={onGraded} onFinished={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Correct' }))
  expect(screen.getByText('Generic plural: no article.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /i guessed/i })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(onGraded).toHaveBeenCalledWith('a.b.01', 'good')
})

test('marking "I guessed" downgrades the grade to hard', async () => {
  const onGraded = vi.fn()
  render(<ExerciseRunner items={items} onGraded={onGraded} onFinished={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Correct' }))
  await userEvent.click(screen.getByRole('button', { name: /i guessed/i }))
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(onGraded).toHaveBeenCalledWith('a.b.01', 'hard')
})

test('a wrong answer grades again and hides the guess option', async () => {
  const onGraded = vi.fn()
  render(<ExerciseRunner items={items} onGraded={onGraded} onFinished={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Wrong' }))
  expect(screen.queryByRole('button', { name: /i guessed/i })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(onGraded).toHaveBeenCalledWith('a.b.01', 'again')
})

test('advances through every item and then finishes', async () => {
  const onFinished = vi.fn()
  render(<ExerciseRunner items={items} onGraded={vi.fn()} onFinished={onFinished} />)
  await userEvent.click(screen.getByRole('button', { name: 'Correct' }))
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByText('The evidence are limited.')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Wrong' }))
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(onFinished).toHaveBeenCalled()
})

test('reports session progress', () => {
  render(<ExerciseRunner items={items} onGraded={vi.fn()} onFinished={vi.fn()} />)
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '2')
})
```

Rode: `npm test -- src/components/ExerciseRunner.test.tsx`
Esperado: FAIL — módulo inexistente.

- [ ] **Step 2: Implementar**

```tsx
// src/components/ExerciseRunner.tsx
import { useState } from 'react'
import type { Item, ItemId } from '@/content/types'
import type { Grade } from '@/engine/scheduler'
import { ItemView } from './items/ItemView'

type Props = {
  items: Item[]
  onGraded: (itemId: ItemId, grade: Grade) => void
  onFinished: () => void
}

export function ExerciseRunner({ items, onGraded, onFinished }: Props) {
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const [guessed, setGuessed] = useState(false)

  const item = items[index]
  if (!item) return null
  const answered = correct !== null

  function next() {
    if (correct === null) return
    onGraded(item!.id, correct ? (guessed ? 'hard' : 'good') : 'again')
    setCorrect(null)
    setGuessed(false)
    if (index + 1 >= items.length) onFinished()
    else setIndex(index + 1)
  }

  return (
    <div className="flex min-h-full flex-col gap-6 p-4">
      <div role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={items.length}
        className="h-1 w-full rounded bg-border">
        <div className="h-1 rounded bg-accent"
          style={{ width: `${((index + 1) / items.length) * 100}%` }} />
      </div>

      <ItemView item={item} disabled={answered} onAnswered={setCorrect} />

      {answered && (
        <div className={`space-y-3 rounded-lg p-4 ${correct ? 'bg-ok-bg' : 'bg-bad-bg'}`}>
          <p className={`font-medium ${correct ? 'text-ok' : 'text-bad'}`}>
            {correct ? 'Correct' : 'Not quite'}
          </p>
          <p className="text-sm leading-relaxed">{item.why}</p>
          {correct && (
            <button type="button" onClick={() => setGuessed(!guessed)}
              className={`rounded-full border px-3 py-1 text-sm ${
                guessed ? 'border-accent text-accent' : 'border-border text-muted'}`}>
              {guessed ? '✓ I guessed' : 'I guessed'}
            </button>
          )}
          <button type="button" onClick={next}
            className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-bg">
            Next
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Rodar os testes**

Rode: `npm test -- src/components/ExerciseRunner.test.tsx`
Esperado: PASS, 5 testes.

- [ ] **Step 4: Commit**

```bash
git add src/components
git commit -m "feat: runner de exercício com correção imediata e downgrade por chute"
```

---

## Task 12: Leitor de unidade e índice do livro

**Files:**
- Create: `src/components/RichBody.tsx`, `src/components/RichBody.test.tsx`
- Create: `src/pages/UnitPage.tsx`, `src/pages/Book.tsx`

**Interfaces:**
- Consumes: `Rich`, `Unit` de `content/types.ts`; `UNITS`, `unitById` de `content/index.ts`
- Produces: `RichBody({ body }: { body: Rich[] })`; páginas `UnitPage` (rota `/unit/:id`) e `Book` (rota `/book`)

- [ ] **Step 1: Escrever os testes do RichBody e vê-los falhar**

```tsx
// src/components/RichBody.test.tsx
import { render, screen } from '@testing-library/react'
import { RichBody } from './RichBody'

test('renders paragraphs, lists and tables', () => {
  render(<RichBody body={[
    { kind: 'p', text: 'A paragraph.' },
    { kind: 'list', items: ['evidence', 'research'] },
    { kind: 'table', head: ['Form', 'Use'], rows: [['zero', 'generic']] },
  ]} />)
  expect(screen.getByText('A paragraph.')).toBeInTheDocument()
  expect(screen.getByText('evidence')).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: 'Form' })).toBeInTheDocument()
  expect(screen.getByRole('cell', { name: 'generic' })).toBeInTheDocument()
})

test('marks good and bad examples so they are distinguishable without color', () => {
  render(<RichBody body={[
    { kind: 'example', good: 'Networks are trained.', bad: 'The networks are trained.' },
  ]} />)
  expect(screen.getByLabelText('Correct example')).toHaveTextContent('Networks are trained.')
  expect(screen.getByLabelText('Incorrect example')).toHaveTextContent('The networks are trained.')
})
```

Rode: `npm test -- src/components/RichBody.test.tsx`
Esperado: FAIL — módulo inexistente.

- [ ] **Step 2: Implementar `RichBody`**

```tsx
// src/components/RichBody.tsx
import type { Rich } from '@/content/types'

export function RichBody({ body }: { body: Rich[] }) {
  return (
    <div className="space-y-4">
      {body.map((node, n) => {
        switch (node.kind) {
          case 'p':
            return <p key={n} className="leading-relaxed">{node.text}</p>
          case 'list':
            return (
              <ul key={n} className="list-disc space-y-1 pl-6">
                {node.items.map((it) => <li key={it}>{it}</li>)}
              </ul>
            )
          case 'table':
            return (
              <div key={n} className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>{node.head.map((h) => (
                      <th key={h} className="border-b border-border px-2 py-1 text-left">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>{node.rows.map((row, r) => (
                    <tr key={r}>{row.map((cell, c) => (
                      <td key={c} className="border-b border-border px-2 py-1">{cell}</td>
                    ))}</tr>
                  ))}</tbody>
                </table>
              </div>
            )
          case 'example':
            return (
              <div key={n} className="space-y-1 border-l-2 border-border pl-3">
                {node.good && (
                  <p aria-label="Correct example" className="text-ok">
                    <span aria-hidden="true">{'✓ '}</span>{node.good}
                  </p>
                )}
                {node.bad && (
                  <p aria-label="Incorrect example" className="text-bad">
                    <span aria-hidden="true">{'✗ '}</span>{node.bad}
                  </p>
                )}
                {node.note && <p className="text-sm text-muted">{node.note}</p>}
              </div>
            )
        }
      })}
    </div>
  )
}
```

- [ ] **Step 3: Rodar os testes do RichBody**

Rode: `npm test -- src/components/RichBody.test.tsx`
Esperado: PASS, 2 testes.

- [ ] **Step 4: Implementar `UnitPage` e `Book`**

```tsx
// src/pages/UnitPage.tsx
import { Link, useParams } from 'react-router-dom'
import { unitById } from '@/content'
import { RichBody } from '@/components/RichBody'

export function UnitPage() {
  const { id } = useParams()
  const unit = unitById(Number(id))
  if (!unit) return <p className="p-4">Unit not found.</p>

  return (
    <article className="space-y-6 p-4 pb-28">
      <header>
        <p className="text-sm text-muted">Unit {unit.id}</p>
        <h1 className="text-2xl font-semibold">{unit.title}</h1>
      </header>
      {unit.blocks.map((b) => (
        <section key={b.label} className="space-y-3">
          <h2 className="font-medium">
            <span className="mr-2 text-accent">{b.label}</span>{b.heading}
          </h2>
          <RichBody body={b.body} />
        </section>
      ))}
      <Link to={`/session/unit/${unit.id}`}
        className="block rounded-lg bg-accent px-4 py-3 text-center font-medium text-bg">
        Practice ({unit.items.length} items)
      </Link>
    </article>
  )
}
```

```tsx
// src/pages/Book.tsx
import { Link } from 'react-router-dom'
import { UNITS } from '@/content'
import { PART_TITLES } from '@/content/taxonomy'

export function Book() {
  const parts = [...new Set(UNITS.map((u) => u.part))]
  return (
    <div className="space-y-6 p-4 pb-28">
      <h1 className="text-2xl font-semibold">Book</h1>
      {parts.map((part) => (
        <section key={part} className="space-y-2">
          <h2 className="text-sm uppercase tracking-wide text-muted">{PART_TITLES[part]}</h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {UNITS.filter((u) => u.part === part).map((u) => (
              <li key={u.id}>
                <Link to={`/unit/${u.id}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-8 text-sm text-muted">{u.id}</span>
                  <span className="flex-1">{u.title}</span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                    {u.level}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Rodar a suíte e o typecheck**

Rode: `npm test && npm run typecheck`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add src/components src/pages
git commit -m "feat: leitor de unidade e índice do livro"
```

---

## Task 13: Shell do app — Today, rotas, navegação e ajustes

**Files:**
- Create: `src/components/BottomNav.tsx`, `src/pages/Today.tsx`, `src/pages/SessionPage.tsx`, `src/pages/Progress.tsx`, `src/pages/Settings.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`
- Create: `src/pages/Today.test.tsx`

**Interfaces:**
- Consumes: `useStudy`, `studyStore`, `reviewQueue`, `newRemaining` de `store/study.ts`; `UNITS`, `itemById`, `allItemIds` de `content/index.ts`; `ExerciseRunner` de `components/ExerciseRunner.tsx`
- Produces: rotas `/` (Today), `/book`, `/unit/:id`, `/session/unit/:id`, `/session/review`, `/progress`, `/settings`

- [ ] **Step 1: Escrever o teste da Today e vê-lo falhar**

```tsx
// src/pages/Today.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Today } from './Today'
import { studyStore } from '@/store/study'

beforeEach(async () => {
  await studyStore.getState().hydrate()
})

test('shows the due count and the next unit', () => {
  render(<MemoryRouter><Today /></MemoryRouter>)
  expect(screen.getByText(/0 due/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /new unit/i })).toBeInTheDocument()
})

test('warns when storage is not persistent', () => {
  studyStore.setState({ persistent: false })
  render(<MemoryRouter><Today /></MemoryRouter>)
  expect(screen.getByRole('alert')).toHaveTextContent(/progress will not be saved/i)
})

test('nudges a backup after 20 sessions without an export', () => {
  studyStore.setState({ persistent: true, sessionsSinceExport: 20 })
  render(<MemoryRouter><Today /></MemoryRouter>)
  expect(screen.getByRole('status')).toHaveTextContent(/20 sessions since your last backup/i)
})

test('does not nudge before the threshold', () => {
  studyStore.setState({ persistent: true, sessionsSinceExport: 19 })
  render(<MemoryRouter><Today /></MemoryRouter>)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
```

Rode: `npm test -- src/pages/Today.test.tsx`
Esperado: FAIL — módulo inexistente.

- [ ] **Step 2: Implementar a navegação e as páginas**

```tsx
// src/components/BottomNav.tsx
import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Today', end: true },
  { to: '/book', label: 'Book', end: false },
  { to: '/progress', label: 'Progress', end: false },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-surface
                    pb-[env(safe-area-inset-bottom)]">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end}
          className={({ isActive }) =>
            `flex-1 py-3 text-center text-sm ${isActive ? 'text-accent' : 'text-muted'}`}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

```tsx
// src/pages/Today.tsx
import { Link } from 'react-router-dom'
import { UNITS, allItemIds } from '@/content'
import { EXPORT_REMINDER_AFTER, newRemaining, reviewQueue, useStudy } from '@/store/study'

export function Today() {
  const state = useStudy((s) => s)
  const now = Date.now()
  const known = new Set(allItemIds())
  const due = reviewQueue(state, known, now)
  const remaining = newRemaining(state, now)

  const nextUnit = UNITS.find((u) => u.items.some((i) => !state.cards[i.id]))

  return (
    <div className="space-y-4 p-4 pb-28">
      {!state.persistent && (
        <p role="alert" className="rounded-lg bg-bad-bg p-3 text-sm text-bad">
          Storage is unavailable in this browser, so progress will not be saved.
        </p>
      )}

      {state.persistent && state.sessionsSinceExport >= EXPORT_REMINDER_AFTER && (
        <p role="status" className="rounded-lg border border-border bg-surface p-3 text-sm">
          You have studied {state.sessionsSinceExport} sessions since your last backup.{' '}
          <Link to="/settings" className="text-accent underline">Export your progress</Link>.
        </p>
      )}

      <h1 className="text-2xl font-semibold">Today</h1>

      <Link to="/session/review"
        aria-disabled={due.length === 0}
        className={`block rounded-xl border border-border bg-surface p-6 text-center
                    ${due.length === 0 ? 'pointer-events-none opacity-50' : ''}`}>
        <span className="block text-3xl font-semibold">{due.length}</span>
        <span className="text-sm text-muted">{due.length} due for review</span>
      </Link>

      {nextUnit && (
        <Link to={`/unit/${nextUnit.id}`}
          className="block rounded-xl border border-border bg-surface p-6 text-center">
          <span className="block text-sm uppercase tracking-wide text-muted">New unit</span>
          <span className="mt-1 block font-medium">{nextUnit.id}. {nextUnit.title}</span>
        </Link>
      )}

      <p className="text-center text-sm text-muted">{remaining} new items left today</p>
      <Link to="/settings" className="block text-center text-sm text-accent">Settings</Link>
    </div>
  )
}
```

```tsx
// src/pages/SessionPage.tsx
import { useNavigate, useParams } from 'react-router-dom'
import { allItemIds, itemById, unitById } from '@/content'
import type { Item } from '@/content/types'
import { ExerciseRunner } from '@/components/ExerciseRunner'
import { reviewQueue, studyStore, useStudy } from '@/store/study'

export function SessionPage({ mode }: { mode: 'unit' | 'review' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const state = useStudy((s) => s)
  const now = Date.now()

  let items: Item[] = []
  if (mode === 'unit') {
    items = unitById(Number(id))?.items ?? []
  } else {
    items = reviewQueue(state, new Set(allItemIds()), now)
      .map((itemId) => itemById(itemId))
      .filter((i): i is Item => Boolean(i))
  }

  if (items.length === 0) {
    return <p className="p-4">Nothing to practise right now.</p>
  }

  return (
    <ExerciseRunner
      items={items}
      onGraded={(itemId, grade) => { void studyStore.getState().answer(itemId, grade, Date.now()) }}
      onFinished={() => { void studyStore.getState().completeSession(); navigate('/') }}
    />
  )
}
```

```tsx
// src/pages/Progress.tsx
import { UNITS, allItemIds } from '@/content'
import { useStudy } from '@/store/study'

export function Progress() {
  const cards = useStudy((s) => s.cards)
  const ids = allItemIds()
  const seen = ids.filter((id) => cards[id]).length
  const mature = ids.filter((id) => (cards[id]?.scheduledDays ?? 0) >= 21).length
  const unitsStarted = UNITS.filter((u) => u.items.some((i) => cards[i.id])).length

  return (
    <div className="space-y-4 p-4 pb-28">
      <h1 className="text-2xl font-semibold">Progress</h1>
      <dl className="grid grid-cols-3 gap-3">
        {([['Units started', unitsStarted], ['Items seen', seen], ['Items mature', mature]] as const)
          .map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-surface p-4 text-center">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="text-2xl font-semibold">{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  )
}
```

```tsx
// src/pages/Settings.tsx
import { useRef, useState } from 'react'
import { studyStore, useStudy } from '@/store/study'

export function Settings() {
  const settings = useStudy((s) => s.settings)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function download() {
    const json = studyStore.getState().exportProgress(Date.now())
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'english-grammar-progress.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function upload(file: File) {
    setError(null)
    try {
      await studyStore.getState().importProgress(await file.text())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.')
    }
  }

  return (
    <div className="space-y-6 p-4 pb-28">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <label className="block space-y-2">
        <span className="text-sm">New items per day: {settings.newPerDay}</span>
        <input type="range" min={4} max={30} value={settings.newPerDay}
          onChange={(e) => void studyStore.getState().setSettings({ newPerDay: Number(e.target.value) })}
          className="w-full" />
      </label>

      <div className="space-y-2">
        <button type="button" onClick={download}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3">
          Export progress
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3">
          Import progress
        </button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f) }} />
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        <p className="text-sm text-muted">
          Progress lives only in this browser. Export regularly — clearing browser data erases it.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Ligar as rotas**

```tsx
// src/App.tsx
import { Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { Today } from './pages/Today'
import { Book } from './pages/Book'
import { UnitPage } from './pages/UnitPage'
import { SessionPage } from './pages/SessionPage'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/book" element={<Book />} />
        <Route path="/unit/:id" element={<UnitPage />} />
        <Route path="/session/unit/:id" element={<SessionPage mode="unit" />} />
        <Route path="/session/review" element={<SessionPage mode="review" />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <BottomNav />
    </>
  )
}
```

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { studyStore } from './store/study'
import './index.css'

void studyStore.getState().hydrate()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/book_english">
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

Substitua também o antigo `src/App.test.tsx` (o teste de fumaça da Task 1) — ele testava o `<h1>` que acabou de sair:

```bash
rm src/App.test.tsx
```

- [ ] **Step 4: Rodar tudo**

Rode: `npm test && npm run typecheck && npm run build`
Esperado: tudo passa.

- [ ] **Step 5: Verificar o fluxo à mão**

Rode `npm run dev` e abra `http://localhost:5173/book_english/`. Percorra: Today → New unit → leia → Practice → responda os 10 itens → volta para Today → o contador de revisão passa a ser maior que zero. Recarregue a página e confirme que o progresso sobreviveu.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: shell do app com Today, rotas, navegação e ajustes"
```

---

## Task 14: PWA instalável

**Files:**
- Modify: `vite.config.ts`
- Create: `src/components/UpdatePrompt.tsx`
- Modify: `src/App.tsx`
- Create: `public/icon-192.png`, `public/icon-512.png`

**Interfaces:**
- Consumes: `virtual:pwa-register/react`
- Produces: `UpdatePrompt` montado em `App`

- [ ] **Step 1: Gerar os ícones**

```bash
mkdir -p public
python3 -c "
from PIL import Image, ImageDraw, ImageFont
for size in (192, 512):
    img = Image.new('RGB', (size, size), '#1f6f6b')
    d = ImageDraw.Draw(img)
    f = ImageFont.load_default(size=int(size*0.55))
    d.text((size/2, size/2), 'E', fill='#fbfaf8', anchor='mm', font=f)
    img.save(f'public/icon-{size}.png')
"
```

Se o Pillow não estiver disponível, qualquer PNG quadrado sólido nos dois tamanhos serve — o ícone não é o ponto desta task.

- [ ] **Step 2: Configurar o plugin PWA**

Adicione ao `vite.config.ts` (mantendo `base` e os demais plugins):

```ts
import { VitePWA } from 'vite-plugin-pwa'

// dentro de plugins: [...]
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['icon-192.png', 'icon-512.png'],
  manifest: {
    name: 'English Grammar',
    short_name: 'Grammar',
    description: 'Grammar, usage and spaced practice for advanced learners.',
    id: '/book_english/',
    start_url: '/book_english/',
    scope: '/book_english/',
    display: 'standalone',
    background_color: '#fbfaf8',
    theme_color: '#1f6f6b',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    // The whole app — content included — is precached. There is no network
    // runtime caching because there is no network to fall back to.
    globPatterns: ['**/*.{js,css,html,woff2,png}'],
  },
})
```

- [ ] **Step 3: Implementar o aviso de atualização**

Como o GitHub Pages não permite cabeçalhos customizados, não dá para forçar `Cache-Control: no-cache` no shell. O aviso visível é a mitigação.

```tsx
// src/components/UpdatePrompt.tsx
import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="fixed inset-x-0 bottom-16 z-10 mx-4 flex items-center gap-3
                    rounded-lg border border-border bg-surface p-3 shadow-lg">
      <p className="flex-1 text-sm">A new version is available.</p>
      <button type="button" onClick={() => void updateServiceWorker(true)}
        className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-bg">
        Reload
      </button>
    </div>
  )
}
```

Monte-o em `App.tsx`, logo antes de `<BottomNav />`:

```tsx
import { UpdatePrompt } from './components/UpdatePrompt'
// ...
      <UpdatePrompt />
      <BottomNav />
```

Adicione os tipos do plugin ao `tsconfig.json`, em `compilerOptions.types`:

```json
"types": ["vite/client", "vitest/globals", "@testing-library/jest-dom", "vite-plugin-pwa/react"]
```

- [ ] **Step 4: Build e verificação do manifesto**

Rode: `npm run build`
Confira:

```bash
grep -o '"scope":"[^"]*"' dist/manifest.webmanifest
grep -o '"start_url":"[^"]*"' dist/manifest.webmanifest
ls dist/sw.js
```

Esperado: `scope` e `start_url` ambos `/book_english/`, e `sw.js` presente. Se algum vier como `/`, a instalação falha no celular — corrija antes de seguir.

- [ ] **Step 5: Commit, push e instalar no celular**

```bash
git add -A
git commit -m "feat: PWA instalável com aviso de atualização"
git push
gh run watch
```

Abra `https://heltonmaia.github.io/book_english/` no celular e instale (Chrome: menu → Adicionar à tela inicial; iOS Safari: Compartilhar → Adicionar à Tela de Início). Ative o modo avião e confirme que o app abre e uma sessão de prática funciona.

---

## Task 15: Unidades 2 a 6

Fecha a fatia vertical com corpus suficiente para uma semana real de estudo.

**Files:**
- Create: `src/content/units/u002.ts` … `u006.ts`
- Modify: `src/content/index.ts`

**Interfaces:**
- Consumes: `Unit` de `content/types.ts`
- Produces: `UNITS` com 6 unidades, ~60 itens

**Natureza desta task:** é trabalho de *autoria*, não de implementação. A forma está inteiramente fixada por `u001.ts` (escrita por extenso na Task 3), pelos tipos da Task 2 e pelo lint, que é o critério de aceite mecânico. O que varia é a prosa — e prosa não se especifica em plano, se escreve e se revisa.

**Faça uma unidade por vez, com commit próprio.** Cinco unidades num commit só são cinco coisas que um revisor não consegue rejeitar separadamente. Para cada uma: escreva o arquivo, registre no barril, rode o lint, commite.

- [ ] **Step 1: Escrever as cinco unidades, uma por commit**

Siga exatamente a forma de `u001.ts`. Uma por arquivo, `id` sequencial, `slug` único, ~10 itens cada com no mínimo 2 `judge` e 2 `gap`. Temas, todos em `part: 'noun-phrase'`:

| id | slug | Foco | phenomena |
|----|------|------|-----------|
| 2 | `definite-article-specific-reference` | Quando "the" é obrigatório: segunda menção, modificador restritivo, referência única | `definite-article`, `generic-reference` |
| 3 | `uncountable-nouns-in-academic-writing` | *evidence, research, information, feedback, software, equipment*; como quantificá-los (*a piece of*, *much*, *a body of*) | `uncountable-nouns`, `quantifiers` |
| 4 | `data-and-other-latin-plurals` | *data, criteria, phenomena, analyses*; concordância e uso corrente | `uncountable-nouns`, `np-agreement` |
| 5 | `noun-noun-modifiers` | Empilhamento de modificadores em CS (*a deep learning based approach*), quando hifenizar, quando desempilhar | `noun-noun-modifiers` |
| 6 | `articles-with-acronyms-and-named-entities` | *the CNN* × *a CNN* × *CNNs*; *the Transformer architecture*; nomes de instituição e de dataset | `article-with-acronyms`, `definite-article` |

Regras de conteúdo, herdadas da spec (§11) e valendo para toda unidade:

- Exemplos puxam para ciência, neurociência, computação e IA.
- Cada item é **autocontido**: frase completa, respondível seis semanas depois sem o contexto da unidade.
- `why` explica a regra, não repete o enunciado; pode citar o contraste com o português — em inglês.
- Distinguir **regra** de **convenção de estilo**. Se um ponto for convenção editorial e não gramática, dizer isso no texto.
- Nada de mito prescritivo. Em ponto contestado, seguir descrição (Swan, *Practical English Usage*; Huddleston & Pullum, *CGEL*), não folclore.

**Critério de aceite por unidade.** O lint garante forma; correção e qualidade exigem leitura humana. Antes de commitar cada unidade, confirme:

1. O lint passa (`npm test -- src/content`).
2. Toda regra afirmada está certa, e o que é convenção de estilo está rotulado como tal.
3. Todo item é respondível fora do contexto da unidade — leia só o item, sem os blocos, e veja se ainda faz sentido.
4. Nenhum `why` apenas repete o enunciado; cada um explica *por que*.
5. Nenhuma resposta aceita está faltando em `answers` — em particular variantes legítimas que você mesmo escreveria.

O item 5 é o que mais dói na prática: uma resposta certa recusada pelo app mina a confiança na correção inteira, e o FSRS ainda registra como erro e reagenda.

- [ ] **Step 2: Registrar no barril**

```ts
// src/content/index.ts
import { u001 } from './units/u001'
import { u002 } from './units/u002'
import { u003 } from './units/u003'
import { u004 } from './units/u004'
import { u005 } from './units/u005'
import { u006 } from './units/u006'

export const UNITS: Unit[] = [u001, u002, u003, u004, u005, u006]
```

- [ ] **Step 3: Rodar o lint de conteúdo e a suíte completa**

Rode: `npm test && npm run typecheck`
Esperado: tudo passa, incluindo unicidade de `ItemId` em todo o corpus.

- [ ] **Step 4: Commit por unidade, e deploy no fim**

Um commit por unidade, à medida que cada uma passa no critério de aceite:

```bash
git add src/content/units/u002.ts src/content/index.ts
git commit -m "feat: unidade 2 — artigo definido e referência específica"
# ... e assim por diante até u006
git push
gh run watch
```

- [ ] **Step 5: Gate da Fase 1**

Estude de verdade por uma semana antes de escrever qualquer plano da Fase 2. Ao fim, responda:

1. A fila de revisão apareceu nos dias certos e no volume certo?
2. A correção de resposta rejeitou algo que estava certo, ou aceitou algo errado?
3. O `why` foi suficiente para entender o erro sem voltar à unidade?
4. O teto de 12 novos por dia se mostrou alto, baixo ou certo?
5. Digitar no celular foi tolerável?

Cada "não" vira correção no motor **antes** da Fase 2. Escalar conteúdo em cima de um motor com defeito multiplica o defeito por 150.

---

## Notas de execução

- **Ordem:** as tasks 4 a 9 são o motor e têm dependência estrita entre si. As tasks 10 a 13 dependem de 9. A 14 depende de 13. A 15 depende de 3.
- **Paralelismo possível:** a Task 3 (conteúdo) é independente das tasks 4 a 9 (motor) depois que a Task 2 define os tipos.
- **Nenhuma task deixa a suíte vermelha.** Se um commit sair com teste falhando, corrija antes de seguir.
