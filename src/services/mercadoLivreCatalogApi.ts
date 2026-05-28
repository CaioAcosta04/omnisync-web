import { apiFetch } from '../lib/apiFetch'
import type { MlCategoryRequirementsResponse } from '../types/mercadolivreCatalog'

export type MlCategorySuggestion = {
  category_id: string
  category_name: string
  domain_id?: string
  domain_name?: string
}

export async function searchCategorySuggestions(
  systemClientId: number,
  query: string
): Promise<MlCategorySuggestion[]> {
  const res = await apiFetch(
    `/api/integrations/mercadolivre/catalog/categories/suggestions?systemClientId=${systemClientId}&q=${encodeURIComponent(query)}`
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Erro ao buscar categorias.')
  }
  const data = (await res.json()) as { suggestions: MlCategorySuggestion[] }
  return data.suggestions ?? []
}

export async function fetchCategoryRequirements(
  systemClientId: number,
  categoryId: string
): Promise<MlCategoryRequirementsResponse> {
  const res = await apiFetch(
    `/api/integrations/mercadolivre/catalog/categories/${encodeURIComponent(categoryId)}/requirements?systemClientId=${systemClientId}`
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Erro ao carregar campos da categoria.')
  }
  return (await res.json()) as MlCategoryRequirementsResponse
}
