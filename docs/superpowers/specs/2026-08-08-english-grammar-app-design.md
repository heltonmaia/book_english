# English Grammar App — Design

**Data:** 2026-08-08
**Repositório:** `github-projects/book_english`
**Status:** design aprovado, aguardando plano de implementação

---

## 1. Objetivo

Um app de estudo de gramática inglesa, instalável no celular e utilizável no navegador,
desenhado para **um aprendiz avançado falante de português** que já escreve e publica em
inglês e quer eliminar erro residual fossilizado.

O pedido original era um PDF; virou app durante o brainstorming. A troca se justifica por
uma razão pedagógica, não tecnológica: erro fossilizado não se desfaz entendendo a regra —
o usuário já entende quase todas — e sim por recuperação repetida e espaçada até a forma
correta sair automática sob pressão. Isso um app faz e um PDF não faz. Se abrirmos mão da
revisão espaçada, o app vira um PDF com scroll e o esforço não se paga.

**Perfil do usuário:** cientista/neurocientista, computação e IA. Os exemplos puxam para
esse domínio em todo o material.

---

## 2. Decisões tomadas

| # | Decisão | Escolha |
|---|---------|---------|
| 1 | Idioma das explicações | **Tudo em inglês**, inclusive a interface |
| 2 | Formato da unidade | Explicação em blocos A/B/C + conjunto de exercícios |
| 3 | Calibragem do básico | Revisão densa focada no erro residual, não curso do zero |
| 4 | Registro | Escrita acadêmica + fala profissional |
| 5 | Público | Só o autor (sem contas, sem servidor) |
| 6 | Abordagem | Livro interativo **+ revisão espaçada (FSRS)** |
| 7 | Publicação | GitHub Pages |
| 8 | Avaliação do item | Automática, com "I guessed" opcional |
| 9 | Tamanho | ~150 unidades, cobertura completa |
| 10 | Resposta de lacuna | Digitada, com lacunas curtas |

### Racional das menos óbvias

**(1) Tudo em inglês.** Imersão no estilo Murphy/Swan; o próprio app vira prática de
leitura. O contraste com o português continua sendo explorado — mas *descrito em inglês*,
dentro da explicação de correção. Não se perde o dado mais útil sobre os erros do usuário.

**(3) Revisão densa.** O usuário publica em inglês há anos. Dar unidade cheia a plural `-s`
desperdiça seu tempo. O básico entra comprimido e concentrado onde falantes avançados de
português ainda escorregam.

**(5) Só o autor.** O conteúdo é o custo dominante do projeto; contas e operação não
acrescentam nada pedagogicamente. O modelo de dados fica com costura para receber
sincronização depois, se houver demanda real.

**(8) Avaliação automática.** Os exercícios são objetivamente corrigíveis, então
autoavaliação estilo Anki jogaria fora um sinal que o app já tem de graça — e
autoavaliação é notoriamente ruidosa. O toque opcional de "I guessed" recupera a distinção
entre saber e ter tido sorte, que é o que o agendador precisa.

**(10) Digitação.** Produzir a forma é o que quebra fossilização; reconhecer a alternativa
certa numa lista é bem mais fácil e ensina muito menos. Banco de palavras foi rejeitado por
isso, e a variação por aparelho foi rejeitada porque contaminaria o histórico de revisão
(o mesmo item teria duas dificuldades e o agendador não saberia qual foi enfrentada).

---

## 3. Arquitetura

**PWA estática, sem backend.** Vite 7 + React 19 + TypeScript + Tailwind v4 +
`vite-plugin-pwa`, espelhando o padrão já provado em `github-projects/hmtasks` — porém
**sem** FastAPI, sem TanStack Query e sem autenticação, porque não há servidor com que
conversar.

Todo o conteúdo vai no bundle. O app funciona offline **por construção**: aqui offline é o
modo normal de operação, não um fallback com último estado em cache como no hmtasks.

```
book_english/
├── src/
│   ├── content/           # unidades como dado tipado (o "livro")
│   │   ├── types.ts       # o tipo Unit e os tipos de Item
│   │   ├── taxonomy.ts    # PartId, Phenomenon (listas fechadas)
│   │   └── units/         # um módulo por unidade
│   ├── engine/            # funções puras: agendamento, fila, correção
│   ├── store/             # estado de estudo (Zustand + IndexedDB)
│   ├── components/        # runner de exercício, leitor de unidade, nav
│   ├── pages/             # Today, Book, Progress, Settings
│   └── theme/             # tokens claro/escuro
└── docs/superpowers/      # specs e planos
```

**Stack, item a item:** React 19 · Vite 7 · TS 5.9 · Tailwind v4 (plugin
`@tailwindcss/vite`) · react-router-dom · Zustand · `ts-fsrs` · `idb` · `vite-plugin-pwa` ·
fontes self-hosted (`@fontsource/*`, nunca CDN — quebraria offline) · Vitest + RTL.

**Sem i18n.** Uma língua só (inglês). É uma simplificação deliberada frente ao hmtasks.

**Sem analytics.**

### Gotcha de deploy

GitHub Pages serve em `heltonmaia.github.io/book_english/`, então:

- `base: '/book_english/'` no `vite.config.ts`;
- `scope` e `start_url` do manifesto e do service worker precisam acompanhar o mesmo prefixo.

Essa é a causa clássica de "a PWA não oferece instalação". Verificar no primeiro deploy.

GitHub Pages **não permite definir cabeçalhos HTTP**, então a lição do `Cache-Control:
no-cache` no `sw.js` aprendida no hmtasks não é aplicável aqui. A mitigação é
`registerType: 'autoUpdate'` mais um aviso visível de "nova versão disponível, recarregar".

---

## 4. Modelo de conteúdo

Cada unidade é um **módulo TypeScript** que satisfaz o tipo `Unit`. Com ~150 unidades
escritas ao longo de meses, tipagem é o único jeito de manter consistência sem revisão
manual: unidade malformada quebra o build em vez de quebrar durante o estudo.

```ts
type Unit = {
  id: number                     // 42
  slug: string                   // 'present-perfect-vs-past'
  title: string
  part: PartId
  level: 'review' | 'core' | 'advanced'
  phenomena: Phenomenon[]        // etiquetas da taxonomia fechada
  blocks: Block[]                // os blocos A, B, C da explicação
  items: Item[]                  // exercícios = átomos de revisão
}

type Block = {
  label: string                  // 'A'
  heading: string                // 'Form'
  body: Rich[]
}

type Rich =
  | { kind: 'p';       text: string }
  | { kind: 'example'; good?: string; bad?: string; note?: string }
  | { kind: 'list';    items: string[] }
  | { kind: 'table';   head: string[]; rows: string[][] }

type Item =
  | { kind: 'gap';       id: ItemId; context: string; answers: string[]; why: string }
  | { kind: 'choice';    id: ItemId; prompt: string; options: string[]; correct: number; why: string }
  | { kind: 'judge';     id: ItemId; sentence: string; correct: boolean; why: string }
  | { kind: 'transform'; id: ItemId; source: string; instruction: string; answers: string[]; why: string }
  | { kind: 'errorHunt'; id: ItemId; text: string; span: [number, number]; fix: string; why: string }
```

### A restrição que decide tudo

**O átomo de revisão é o *item*, não a unidade.** Um item vai reaparecer seis semanas
depois, fora do contexto da unidade que o explicou. Então cada item carrega contexto
suficiente para ser respondível sozinho — frase completa, nunca fragmento que só faz
sentido logo abaixo do bloco B.

É por isso que revisão espaçada **não pode ser enxertada depois**: exercícios escritos
assumindo o contexto da página adjacente ficam sem sentido na fila. Essa restrição vale
desde o primeiro item escrito.

### Identidade estável

`ItemId` é uma string **escrita à mão no conteúdo**, nunca derivada da posição no arquivo
(`'u042.perfect-vs-past.03'`). É o que permite corrigir um typo, reescrever uma explicação
ou inserir um exercício no meio da unidade 42 sem perder o histórico de revisão dela.

### O campo `level`

`level` é **puramente descritivo**: alimenta apenas o selo mostrado no índice da aba Book
(*review* para o básico comprimido, *core*, *advanced*). Não entra em nenhuma decisão do
motor — não afeta agendamento, ordem nem seleção de item. Se algum dia alimentar lógica,
isso precisa ser uma decisão explícita, não um efeito colateral.

### Item mix

~10 itens por unidade, com no mínimo 2 de `judge` e 2 de `gap`. `judge` (certo/errado) é
rápido no toque e muito diagnóstico para fossilização; `gap` e `transform` são os que
exigem produção.

### Lacuna de artigo zero

Boa parte da Parte 1 tem resposta "nenhuma palavra". A convenção: **deixar em branco e
apertar CHECK** é a resposta de artigo zero, e o enunciado diz isso explicitamente
(*leave blank if no word is needed*). Sem isso o item fica ambíguo entre "não sei" e
"nenhum artigo".

---

## 5. Motor de estudo

### Agendamento

[`ts-fsrs`](https://www.npmjs.com/package/ts-fsrs) (open-spaced-repetition), parâmetros
padrão, rodando inteiramente no aparelho. Otimizar os parâmetros sobre o histórico próprio
só rende com milhares de revisões acumuladas — fica como melhoria futura, não requisito.

### Avaliação

| Resultado | Grade FSRS |
|-----------|-----------|
| Errou | `Again` |
| Acertou | `Good` |
| Acertou + marcou "I guessed" | `Hard` |

### Ciclo diário

A tela inicial mostra quantos itens venceram hoje e qual é a próxima unidade. Uma sessão de
revisão puxa a fila vencida (5–10 min); uma sessão de unidade nova mostra os blocos de
explicação e depois roda os itens daquela unidade pela primeira vez, quando eles entram no
agendador.

**Teto de itens novos por dia:** padrão 12, ajustável. Sem esse teto, três dias empolgados
no início viram avalanche de revisão duas semanas depois — é assim que quase todo mundo
abandona SRS.

### Correção de resposta

Função pura, tolerante ao acidental e intolerante ao gramatical:

- ignora caixa, espaço nas pontas e espaço interno colapsado;
- aceita apóstrofo reto e curvo como equivalentes;
- aceita contração ou forma expandida **somente** quando ambas estiverem na lista `answers`;
- qualquer outra diferença é erro.

O conjunto `answers` é responsabilidade do autor do conteúdo, e o lint exige pelo menos uma
entrada.

### Persistência

Estado dos cartões e log de revisão em **IndexedDB** (via `idb`).

**O buraco do "sem servidor", nomeado:** limpar dados do navegador apaga meses de
progresso. Contramedida: **exportar e importar o progresso como JSON**, que serve tanto de
backup quanto do jeito manual de levar progresso do celular para o desktop. O app lembra de
exportar a cada ~20 sessões.

### Falhas previstas

| Falha | Comportamento |
|-------|---------------|
| IndexedDB indisponível (Safari privado, quota) | Cai para memória volátil **e mostra aviso permanente** — nunca finge que salvou |
| Item sumiu do conteúdo após atualização | Órfão descartado da fila em silêncio; o resto do progresso intacto |
| Shell velho servido após deploy | `autoUpdate` + aviso visível de recarregar |
| JSON de importação inválido/corrompido | Recusa a importação e preserva o estado atual; nunca aplica parcialmente |

---

## 6. Currículo

Dez partes, ~150 unidades. Organizadas **por área de dívida residual**, não pela ordem de um
curso tradicional — que gastaria dezenas de unidades no que o usuário domina há vinte anos.

| # | Parte | Un. | Foco |
|---|-------|-----|------|
| 1 | O sintagma nominal | 25 | Artigos (definido/indefinido/zero), referência genérica, incontáveis (*evidence, research, information, data, literature*), quantificadores, compostos e empilhamento de modificadores, concordância em sintagma longo, artigo com sigla e nome próprio |
| 2 | Tempo e aspecto | 21 | Sistema completo, com peso em present perfect × past simple e nas convenções de tempo verbal por seção do paper |
| 3 | Modalidade e hedging | 13 | Graus de certeza, mitigar afirmação, declarar limitação, subjuntivo mandativo |
| 4 | Padrões verbais e complementação | 15 | Gerúndio × infinitivo, verbos de citação, preposição regida por verbo/adjetivo/substantivo |
| 5 | Arquitetura da oração | 19 | Relativas, orações participiais e modificador solto, condicionais, clivadas, emenda de vírgula |
| 6 | Voz, estrutura da informação e estilo | 15 | Passiva e quando evitá-la, *it*-extraposição, ordem dado-novo, nominalização × estilo verbal, peso final, paralelismo |
| 7 | Adverbiais, conectores e pontuação | 13 | Posição do advérbio, advérbios conjuntivos, ponto e vírgula/dois-pontos/travessão, hífen em modificador composto |
| 8 | Números, dados e resultados | 10 | Quantidade e variação, comparação e grau, linguagem de estatística, referência a figura e tabela |
| 9 | Inglês profissional falado | 11 | Formação de pergunta, tags, elipse e contração, discordar com educação, interromper, sinalizar apresentação, Q&A |
| 10 | Pares confundíveis e falsos amigos | 8 | *actually/currently*, *eventually*, *realize*, *pretend*, *comprehensive*, *sensible*; *affect/effect*, *fewer/less*, *among/between*, *since/for/during* |
| | **Total** | **150** | |

**Ordem e interleaving.** Unidades novas seguem a sequência das partes, mas a revisão
espaçada embaralha por conta própria: o item da unidade 8 volta no meio da unidade 60. Não é
preciso projetar interleaving no currículo — o agendador já faz, e é uma das razões pelas
quais o app supera o livro impresso.

**Escala.** ~150 unidades × ~10 itens ≈ 1.500 itens. No teto de 12 novos/dia, é material
novo por ~4 meses, com revisão continuando depois.

---

## 7. Interface

Três abas na barra inferior, no molde do hmtasks:

- **Today** — o ciclo diário: contagem de vencidos, próxima unidade, dois botões grandes.
- **Book** — índice das unidades, navegável. É o que preserva o valor original de livro:
  terminado o curso, o app continua servindo de consulta.
- **Progress** — unidades concluídas, itens maduros, acerto por fenômeno. O acerto por
  fenômeno é **apenas exibição**: mostra onde você está fraco, mas não roteia o estudo nem
  altera o agendamento. Rotear por fenômeno é a abordagem adaptativa que ficou fora de
  escopo (§10) — a distinção importa para não confundir as duas.

Mais **Settings**: teto de novos/dia, tema, exportar/importar progresso.

### Telas centrais

**Unit reader** — blocos A/B/C com tratamento tipográfico distinto para exemplo certo (✓) e
errado (✗); botão *Practice* no fim.

**Exercise runner** — um item por vez, tela cheia, com barra de progresso da sessão. Estados:
respondendo → corrigido. No estado corrigido aparece o `why`; se acertou, aparece também o
toque opcional *I guessed*.

A explicação de correção pode citar o contraste com o português — **em inglês**. Isso
preserva a imersão escolhida sem jogar fora o dado mais útil sobre os erros do usuário.

### Convenções herdadas do hmtasks

Valem aqui, já pagas em produção lá:

- **Affordance de toque por capacidade, nunca por largura** — variante `can-hover:`, nunca
  `opacity-0` puro nem `md:` para esconder controle. Largura ≠ mouse.
- **Tema claro/escuro por tokens CSS**, seguindo o sistema com override por aparelho e
  script anti-FOUC. Sem hex hardcoded em componente.
- **Lógica pura em `engine/` e `store/`, wiring fino nos componentes.**

---

## 8. Testes

O risco se concentra nas funções puras, e é lá que ficam a maior parte dos testes:

- **Correção de resposta** — normalização e comparação (o caso mais delicado: tolerante ao
  acidental, intolerante ao gramatical). Inclui o caso da lacuna de artigo zero.
- **Montagem da fila** — o que vence hoje, aplicação do teto de novos.
- **Invólucro do agendador** — dado estado + grade, o próximo vencimento.
- **Export/import** — ida e volta preserva o estado; JSON inválido é recusado inteiro.

E um **lint de conteúdo** rodando como suíte Vitest sobre todas as unidades:

- `ItemId` único em todo o corpus e estável entre versões;
- `why` não vazio em todo item;
- item de `gap`/`transform` com ao menos uma resposta aceita;
- `phenomena` dentro da taxonomia fechada;
- `choice.correct` dentro do intervalo de `options`;
- `errorHunt.span` dentro dos limites de `text`.

É esse lint que mantém 150 unidades honestas sem revisão manual. Conteúdo ruim falha o CI.

Componentes (runner de exercício, leitor) com RTL. E2E fica fora por ora.

---

## 9. Faseamento

Escrever 150 unidades é trabalho de meses. Conteúdo e motor **não** são construídos em
paralelo.

> **Escopo do plano de implementação:** o plano que sai desta spec cobre **apenas a Fase 1**.
> As fases 2 e 3 ganham planos próprios, escritos depois do gate da Fase 1 — escrever agora o
> plano de 150 unidades seria planejar em cima de um motor que ainda não se provou.

**Fase 1 — fatia vertical.** Motor inteiro de ponta a ponta com ~6 unidades reais da Parte 1,
publicado no GitHub Pages e instalado no celular. Prova o loop completo: ler → praticar →
agendar → revisar → persistir → exportar. A Parte 1 foi escolhida por ser a maior dívida e
porque artigo exercita os cinco tipos de item, o que melhor estressa o motor.

**Gate:** o usuário estuda de verdade por uma semana antes da fase 2. Se o loop não pegar, o
problema está no motor e conteúdo em escala só multiplicaria o erro.

**Fase 2 — conteúdo em escala.** Parte por parte, motor essencialmente congelado, mexendo
nele só nos buracos que a fase 1 revelar.

**Fase 3 — refinamentos.** Estatística por fenômeno, otimizador de parâmetros do FSRS,
exportação para PDF a partir da mesma fonte de conteúdo.

---

## 10. Fora de escopo (YAGNI)

Deliberadamente ausentes, com o gatilho que os traria de volta:

| Item | Volta quando |
|------|--------------|
| Contas e sincronização entre aparelhos | O export/import manual doer de verdade |
| Áudio e pronúncia | O usuário pedir; hoje o foco é gramática escrita e falada, não fonética |
| Publicação nas lojas | Nunca, salvo virar produto público |
| Otimizador de parâmetros do FSRS | Houver alguns milhares de revisões acumuladas |
| Exportação para PDF | Fase 3; o conteúdo como dado já preserva a possibilidade |
| Modelo adaptativo por fenômeno | O agendamento por item se mostrar insuficiente |
| i18n | Nunca — a decisão de imersão total é o oposto disso |

---

## 11. Riscos

**Correção do conteúdo é o risco dominante.** Uma regra errada ensinada com confiança é pior
que nenhum livro, e a revisão espaçada *grava* o erro. Mitigações:

- distinguir **regra** de **convenção de estilo** no próprio texto. O caso mais clássico é
  *that* × *which* em relativa restritiva: é convenção editorial americana, não regra de
  gramática, e apresentá-la como regra é ensinar um mito prescritivo;
- apoiar pontos contestados em autoridade descritiva (Swan, *Practical English Usage*;
  Huddleston & Pullum, *The Cambridge Grammar of the English Language*) em vez de folclore;
- o lint de conteúdo não checa veracidade — só forma. Correção continua exigindo cuidado
  humano na escrita de cada unidade.

**Abandono do SRS.** Mitigado pelo teto de itens novos por dia.

**Perda de progresso.** Mitigada por export/import e pelo lembrete periódico.

**Volume de escrita.** ~1.500 itens é muito conteúdo. O faseamento existe para que o gate da
fase 1 aconteça antes do grosso do investimento.
