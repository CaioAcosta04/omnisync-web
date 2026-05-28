export type MlAttributeValueType =
  | 'string'
  | 'number'
  | 'number_unit'
  | 'boolean'
  | 'list'
  | 'grid_id'
  | string

export type MlAttributeValueOption = {
  id: string
  name: string
}

export type MlAttributeUnitOption = {
  id: string
  name: string
}

export type MlAttributeDefinition = {
  id: string
  name: string
  value_type?: MlAttributeValueType
  tags?: Record<string, boolean> | string[]
  values?: MlAttributeValueOption[]
  allowed_units?: MlAttributeUnitOption[]
  hint?: string
  group_label?: string
  component?: string
  group_id?: string
}

/** Valor enviado em product.resource.mercado_livre.attributes */
export type MlAttributeFormValue = {
  id: string
  value_name?: string
  value_id?: string
}

export type MlCategoryRequirementsResponse = {
  category_id: string
  attributes: MlAttributeDefinition[]
  required_attributes: MlAttributeDefinition[]
  technical_specs_input?: Record<string, unknown>
}
