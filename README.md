# Limiar da Corrupção — Ficha de Personagem Online

SPA estática para gerenciamento de fichas de personagem do sistema de RPG **Limiar da Corrupção**.  
Sem backend. Persistência via `localStorage`. Pronta para GitHub Pages.

---

## Estrutura de arquivos

```
limiar-da-corrupcao/
├── index.html   ← Shell HTML, todas as abas e modais
├── style.css    ← Tema Dark/Cyberpunk, variáveis, responsividade
├── state.js     ← CRUD, LocalStorage, import/export, cálculos
├── ui.js        ← Renderização, bindings, roster, ficha
├── dice.js      ← Rolagem 2d10, pop-up animado
└── app.js       ← Entry point (inicializa tudo)
```

---

## Deploy no GitHub Pages

### 1. Criar o repositório

```bash
git init
git add .
git commit -m "feat: Limiar da Corrupção v1.0"
```

### 2. Criar repositório no GitHub

Acesse https://github.com/new e crie um repositório público (ex: `limiar-da-corrupcao`).

```bash
git remote add origin https://github.com/SEU_USUARIO/limiar-da-corrupcao.git
git branch -M main
git push -u origin main
```

### 3. Ativar GitHub Pages

1. No repositório, vá em **Settings → Pages**
2. Em **Source**, selecione `Deploy from a branch`
3. Branch: `main` — Pasta: `/ (root)`
4. Clique em **Save**

Após ~1 minuto, o site estará disponível em:
```
https://SEU_USUARIO.github.io/limiar-da-corrupcao/
```

> **Atenção:** Os scripts usam `type="module"` (ES6 modules). O GitHub Pages serve os arquivos com os headers corretos, mas **não funciona abrindo `index.html` direto no navegador** (protocolo `file://`). Para testar localmente, use um servidor local:
>
> ```bash
> # Python
> python3 -m http.server 8080
>
> # Node (npx)
> npx serve .
> ```
> Depois acesse `http://localhost:8080`.

---

## Funcionalidades

| Feature | Descrição |
|---|---|
| **Roster** | Galeria de cards com barras de Vida, BM e Fonte |
| **CRUD** | Criar, abrir, editar e deletar agentes |
| **Persistência** | Dados salvos automaticamente no `localStorage` |
| **Import/Export** | Baixar ficha como `.json` e carregar fichas externas |
| **Foto** | Upload de imagem convertida para Base64 (salva no JSON) |
| **Atributos** | Steppers para RAZ, INS, PRE, PRS, FIS (0–20) |
| **BM dinâmica** | Barreira Mágica = (RAZ + INS) × 5, recalculada ao vivo |
| **Fonte** | 10 pips interativos + tipo (Poder/Corrupção/Adrenalina) |
| **Fontes de Ação** | 5 hexágonos CSS toggle |
| **Perícias** | 19 perícias agrupadas por atributo, híbridos com ⌊(A+B)/2⌋ |
| **Rolagem** | Pop-up 2d10 animado com fase de "sorteio" |
| **Arsenal** | Contadores de RD e Créditos + tabela de equipamentos |
| **Habilidades** | Cards dinâmicos (Ordem/Ruína/Adrenalina) |
| **Anotações** | Grid de blocos de texto livres |
| **Responsivo** | Mobile-first, testado em 320px+ |

---

## Notas técnicas

- **Sem dependências externas** — HTML/CSS/JS puro, apenas fontes do Google Fonts
- **ES6 Modules** — `type="module"` no HTML; importações relativas entre os arquivos JS
- **Retrocompatibilidade** — `mergeWithDefaults()` em `state.js` garante que fichas antigas não quebrem ao adicionar novos campos
- **Conflito de import** — Se importar um `.json` com ID já existente, o app pergunta se deseja substituir; caso contrário, gera um novo ID automaticamente
