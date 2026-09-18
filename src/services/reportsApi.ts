import { throwApiError } from '../lib/apiError'
import { apiFetch } from '../lib/apiFetch'

/**
 * Serviço de relatórios.
 *
 * Consome `POST /api/reports/{systemClientId}/generate` (backend OMNI-76), que
 * responde com um PDF (bytes) e `Content-Disposition: attachment`.
 *
 * Contrato do body:
 * - `report_type`: SALES | INVENTORY | LISTINGS (snake_case por @JsonProperty no back)
 * - `format`: apenas "PDF"
 * - `period`: { start, end } em yyyy-MM-dd — SOMENTE para SALES
 * - `marketplaces`: canais/marketplaces válidos por tipo (vazio = sem filtro)
 * - `fields`: ao menos 1, válidos para o tipo, sem repetir
 *
 * Regras de validação (espelhadas na UI para evitar 400) e permissões
 * (SALE_READ para SALES; PRODUCT_READ para INVENTORY/LISTINGS) são cobradas
 * pelo backend; erros voltam como { status, message } e são propagados.
 */

export type ReportTypeId = 'SALES' | 'INVENTORY' | 'LISTINGS'

export type ReportField = { key: string; label: string }

export type ReportOption = { value: string; label: string }

/** Campos disponíveis por tipo (chave + rótulo), na mesma ordem do backend. */
export const REPORT_FIELDS: Record<ReportTypeId, ReportField[]> = {
  SALES: [
    { key: 'id', label: 'Identificador' },
    { key: 'created_at', label: 'Data' },
    { key: 'product_name', label: 'Produto' },
    { key: 'sku', label: 'SKU' },
    { key: 'quantity', label: 'Quantidade' },
    { key: 'total_value', label: 'Valor total' },
    { key: 'channel', label: 'Canal' },
    { key: 'status', label: 'Status' },
    { key: 'external_reference_id', label: 'Referência externa' },
  ],
  INVENTORY: [
    { key: 'id', label: 'Identificador' },
    { key: 'sku', label: 'SKU' },
    { key: 'product_name', label: 'Produto' },
    { key: 'stock', label: 'Estoque físico' },
    { key: 'reserved_stock', label: 'Reservado' },
    { key: 'available_stock', label: 'Disponível' },
    { key: 'minimum_stock', label: 'Estoque mínimo' },
    { key: 'price', label: 'Preço' },
    { key: 'inventory_value', label: 'Valor em estoque' },
  ],
  LISTINGS: [
    { key: 'product_name', label: 'Produto' },
    { key: 'sku', label: 'SKU' },
    { key: 'marketplace', label: 'Marketplace' },
    { key: 'external_id', label: 'ID externo' },
    { key: 'price', label: 'Preço' },
    { key: 'stock', label: 'Quantidade' },
    { key: 'status', label: 'Situação' },
  ],
}

/**
 * Opções de filtro por tipo:
 * - SALES usa os canais de venda (SaleChannel).
 * - LISTINGS usa os marketplaces (Marketplace).
 * - INVENTORY não aceita filtro (posição atual).
 */
export const REPORT_MARKETPLACE_OPTIONS: Record<ReportTypeId, ReportOption[]> = {
  SALES: [
    { value: 'MERCADO_LIVRE', label: 'Mercado Livre' },
    { value: 'SHOPEE', label: 'Shopee' },
    { value: 'AMAZON', label: 'Amazon' },
    { value: 'PHYSICAL', label: 'Loja física' },
    { value: 'MANUAL', label: 'Manual' },
  ],
  LISTINGS: [
    { value: 'MERCADO_LIVRE', label: 'Mercado Livre' },
    { value: 'SHOPEE', label: 'Shopee' },
    { value: 'AMAZON', label: 'Amazon' },
  ],
  INVENTORY: [],
}

export const REPORT_TYPE_LABELS: Record<ReportTypeId, string> = {
  SALES: 'Vendas',
  INVENTORY: 'Estoque',
  LISTINGS: 'Anúncios',
}

/** Apenas SALES aceita período histórico; os demais são posição atual. */
export function reportSupportsPeriod(type: ReportTypeId): boolean {
  return type === 'SALES'
}

export function reportSupportsMarketplaces(type: ReportTypeId): boolean {
  return REPORT_MARKETPLACE_OPTIONS[type].length > 0
}

export type ReportPeriod = { start: string; end: string }

export type ReportRequestBody = {
  report_type: ReportTypeId
  format: 'PDF'
  period?: ReportPeriod | null
  marketplaces: string[]
  fields: string[]
}

function parseFilename(disposition: string | null): string | null {
  if (!disposition) return null
  // Ex.: attachment; filename="relatorio-vendas-2026-09-18.pdf"
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
  return match ? decodeURIComponent(match[1].trim()) : null
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoga no próximo tick para garantir que o download foi iniciado.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Gera o relatório e dispara o download do PDF no navegador.
 * Lança Error com a mensagem do backend em caso de falha (validação, permissão, etc.).
 */
export async function generateReport(
  systemClientId: number,
  body: ReportRequestBody,
): Promise<void> {
  const res = await apiFetch(`/api/reports/${systemClientId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) await throwApiError(res, 'Não foi possível gerar o relatório.')

  const blob = await res.blob()
  const filename =
    parseFilename(res.headers.get('Content-Disposition')) ?? `relatorio-${body.report_type.toLowerCase()}.pdf`
  triggerDownload(blob, filename)
}
