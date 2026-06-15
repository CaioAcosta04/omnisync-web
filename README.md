# OmniSync Web

Interface web do projeto OmniSync (TCC) — painel para gestão de estoque, vendas, marketplaces (Mercado Livre), anúncios e usuários, com autenticação via API backend.

## Stack

- **React 19** + **TypeScript**
- **Vite 7** (build e dev server)
- **react-pro-sidebar**, **react-icons**, **Montserrat** (`@fontsource-variable/montserrat`)
- **ESLint**

## Pré-requisitos

- Node.js 18+
- npm
- API backend do OmniSync acessível (padrão: `https://omnisync.site`)

## Como rodar

```bash
# Instalar dependências
npm install

# Desenvolvimento (com hot reload)
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

Em desenvolvimento, requisições para `/api` são encaminhadas via proxy do Vite para o backend (padrão: `https://omnisync.site`).

## Variáveis de ambiente

Opcionais — crie um `.env` na raiz do projeto:

| Variável | Descrição |
| -------- | --------- |
| `OMNISYNC_DEV_API_PROXY` ou `VITE_DEV_API_PROXY` | URL do backend usada pelo proxy do Vite em dev (padrão: `https://omnisync.site`) |
| `VITE_API_BASE_URL` | Base da API em deploys fora da Vercel (padrão: `https://omnisync.site`) |
| `VITE_SKIP_AUTH` | Defina como `true` para pular autenticação e entrar com usuário placeholder |

Na Vercel, `/api` é reescrito para o backend via `vercel.json` (mesma origem, sem CORS).

## Scripts

| Script | Descrição |
| ------ | --------- |
| `npm run dev` | Sobe o servidor de desenvolvimento |
| `npm run build` | Type-check + build de produção em `dist/` |
| `npm run preview` | Serve o conteúdo de `dist/` localmente |
| `npm run lint` | Roda o ESLint |

## Estrutura do projeto

```
omnisync-web/
├── public/
├── scripts/           # utilitários (ex.: teste de login no CI)
├── src/
│   ├── components/    # UI reutilizável, modais, sidebar, topbar
│   ├── config/        # configuração da API
│   ├── contexts/      # auth, OAuth Mercado Livre, navegação
│   ├── lib/           # helpers (fetch, erros, ML, etc.)
│   ├── screens/       # telas do painel e fluxo de usuário
│   ├── services/      # chamadas à API (produtos, vendas, usuários, ML)
│   ├── types/         # tipos TypeScript
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .github/workflows/ # CI (teste de login contra a API)
├── index.html
├── vercel.json
└── package.json
```

## Convenções

- Estilos inline ficam no **final do arquivo**, em um objeto `styles` (padrão nas telas e layout).
- Alguns componentes usam **CSS dedicado** (ex.: formulários de auth, topbar).
- Serviços em `src/services/` encapsulam endpoints; `apiFetch` centraliza requisições autenticadas.
