/**
 * Base da API.
 * - Em `npm run dev`: vazio → mesma origem (localhost); o Vite faz proxy de `/api` → VM (veja vite.config).
 * - Em build de produção: `VITE_API_BASE_URL` ou fallback público.
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? '' : 'https://omnisync.site')
).replace(/\/$/, '')
