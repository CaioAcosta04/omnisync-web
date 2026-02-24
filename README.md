# OmniSync Web

Interface web do projeto OmniSync (TCC).

## Stack

- **React 19** + **TypeScript**
- **Vite 7** (build e dev server)
- **ESLint**

## Pré-requisitos

- Node.js 18+
- npm

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

## Scripts

| Script    | Descrição              |
| --------- | ---------------------- |
| `npm run dev`     | Sobe o servidor de desenvolvimento |
| `npm run build`   | Gera o build de produção em `dist/` |
| `npm run preview` | Serve o conteúdo de `dist/` localmente |
| `npm run lint`    | Roda o ESLint          |

## Estrutura do projeto

```
omnisync-web/
├── public/
├── src/
│   ├── assets/      # imagens, fontes, etc.
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
└── package.json
```

## Convenções

- Estilos inline ficam no **final do arquivo**, em um objeto `styles` (quando usados no componente).
