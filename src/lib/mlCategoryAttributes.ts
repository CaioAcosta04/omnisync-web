import type {
  MlAttributeDefinition,
  MlAttributeFormValue,
  MlCategoryRequirementsResponse,
} from '../types/mercadolivreCatalog'

export type { MlAttributeDefinition, MlAttributeFormValue, MlCategoryRequirementsResponse }

const SKIP_ATTRIBUTE_IDS = new Set(['SELLER_SKU', 'ITEM_CONDITION'])

function hasTag(attr: MlAttributeDefinition, tag: string): boolean {
  const tags = attr.tags
  if (tags == null) return false
  if (Array.isArray(tags)) {
    return tags.some((t) => String(t).toLowerCase() === tag.toLowerCase())
  }
  const key = tag in tags ? tag : Object.keys(tags).find((k) => k.toLowerCase() === tag.toLowerCase())
  if (key == null) return false
  const val = tags[key as keyof typeof tags]
  return val === true
}

function isHidden(attr: MlAttributeDefinition): boolean {
  return hasTag(attr, 'hidden') || hasTag(attr, 'read_only')
}

function isCatalogRequired(attr: MlAttributeDefinition): boolean {
  return hasTag(attr, 'required') || hasTag(attr, 'catalog_required') || hasTag(attr, 'conditional_required')
}

function normalizeDefinition(raw: Partial<MlAttributeDefinition>): MlAttributeDefinition | null {
  const id = raw.id != null ? String(raw.id).trim() : ''
  const name = raw.name != null ? String(raw.name).trim() : id
  if (!id) return null
  return {
    id,
    name: name || id,
    value_type: raw.value_type,
    tags: raw.tags,
    values: raw.values,
    allowed_units: raw.allowed_units,
    hint: raw.hint,
    group_label: raw.group_label,
    component: raw.component,
    group_id: raw.group_id,
  }
}

/** Mescla obrigatórios de technical_specs + tags da lista completa de attributes. */
export function mergeRequiredAttributes(
  response: MlCategoryRequirementsResponse
): MlAttributeDefinition[] {
  const byId = new Map<string, MlAttributeDefinition>()

  const allRaw = [
    ...(response.required_attributes ?? []),
    ...(response.attributes ?? []).filter(isCatalogRequired),
  ]

  for (const raw of allRaw) {
    const def = normalizeDefinition(raw)
    if (!def || SKIP_ATTRIBUTE_IDS.has(def.id) || isHidden(def)) continue
    if (!byId.has(def.id)) {
      byId.set(def.id, def)
    }
  }

  return Array.from(byId.values())
}

export type MlAttributeFieldState = Record<string, string>

export function buildInitialFieldState(fields: MlAttributeDefinition[]): MlAttributeFieldState {
  const state: MlAttributeFieldState = {}
  for (const field of fields) {
    if (field.value_type === 'boolean') {
      state[field.id] = ''
    } else if (field.value_type === 'number_unit') {
      state[`${field.id}__number`] = ''
      state[`${field.id}__unit`] = field.allowed_units?.[0]?.id ?? ''
    } else {
      state[field.id] = ''
    }
  }
  return state
}

export function serializeAttributes(
  fields: MlAttributeDefinition[],
  state: MlAttributeFieldState
): MlAttributeFormValue[] {
  const result: MlAttributeFormValue[] = []

  for (const field of fields) {
    const valueType = field.value_type ?? 'string'

    if (valueType === 'list') {
      const valueId = (state[field.id] ?? '').trim()
      if (!valueId) continue
      const option = field.values?.find((v) => v.id === valueId)
      result.push({
        id: field.id,
        value_id: valueId,
        ...(option?.name ? { value_name: option.name } : {}),
      })
      continue
    }

    if (valueType === 'boolean') {
      const raw = (state[field.id] ?? '').trim()
      if (!raw) continue
      result.push({ id: field.id, value_name: raw })
      continue
    }

    if (valueType === 'number_unit') {
      const num = (state[`${field.id}__number`] ?? '').trim()
      const unitId = (state[`${field.id}__unit`] ?? '').trim()
      if (!num) continue
      const unit = field.allowed_units?.find((u) => u.id === unitId)
      const unitLabel = unit?.name ?? unitId
      result.push({
        id: field.id,
        value_name: unitLabel ? `${num} ${unitLabel}` : num,
      })
      continue
    }

    const valueName = (state[field.id] ?? '').trim()
    if (!valueName) continue
    result.push({ id: field.id, value_name: valueName })
  }

  return result
}

export type MlAttributeValidationErrors = Record<string, string>

export function validateAttributeFields(
  fields: MlAttributeDefinition[],
  state: MlAttributeFieldState
): MlAttributeValidationErrors {
  const errors: MlAttributeValidationErrors = {}

  for (const field of fields) {
    const valueType = field.value_type ?? 'string'
    const label = field.name || field.id

    if (valueType === 'list') {
      if (!(state[field.id] ?? '').trim()) {
        errors[field.id] = `${label} é obrigatório.`
      }
      continue
    }

    if (valueType === 'boolean') {
      if (!(state[field.id] ?? '').trim()) {
        errors[field.id] = `${label} é obrigatório.`
      }
      continue
    }

    if (valueType === 'number_unit') {
      const num = (state[`${field.id}__number`] ?? '').trim()
      if (!num) {
        errors[field.id] = `${label} é obrigatório.`
      } else if (Number.isNaN(Number(num))) {
        errors[field.id] = `${label} deve ser um número.`
      }
      continue
    }

    if (!(state[field.id] ?? '').trim()) {
      errors[field.id] = `${label} é obrigatório.`
    }
  }

  return errors
}

export function groupAttributesByLabel(
  fields: MlAttributeDefinition[]
): Array<{ label: string; fields: MlAttributeDefinition[] }> {
  const groups = new Map<string, MlAttributeDefinition[]>()

  for (const field of fields) {
    const label = field.group_label?.trim() || 'Características do produto'
    const list = groups.get(label) ?? []
    list.push(field)
    groups.set(label, list)
  }

  return Array.from(groups.entries()).map(([label, groupFields]) => ({
    label,
    fields: groupFields,
  }))
}
