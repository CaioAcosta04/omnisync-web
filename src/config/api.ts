/**
 * Base da API.
 * - Dev: vazio → proxy Vite (`vite.config`) para a VM.
 * - Vercel (`VERCEL=1` no build): vazio → `vercel.json` faz rewrite de `/api` para a VM (evita CORS em previews *.vercel.app).
 * - Outros deploys: `VITE_API_BASE_URL` se definida, senão `https://omnisync.site` (exige CORS com essa origem).
 */
const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
const useSameOriginApi =
  import.meta.env.DEV || import.meta.env.VITE_VERCEL === '1'

export const API_BASE_URL = (
  envBase
    ? envBase
    : useSameOriginApi
      ? ''
      : 'https://omnisync.site'
).replace(/\/$/, '')
