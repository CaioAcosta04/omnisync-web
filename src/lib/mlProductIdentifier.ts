/** Comprimentos válidos para GTIN (EAN-8, UPC-A, EAN-13, GTIN-14). */
export const GTIN_VALID_LENGTHS = [8, 12, 13, 14] as const

export const GTIN_FIELD_HINT =
  'Código de barras da embalagem (somente dígitos). Formatos aceitos: 8, 12, 13 ou 14 dígitos (EAN/UPC).'

export const EMPTY_GTIN_REASON_HINT =
  'Selecione o motivo apenas se o produto não possui código de barras.'

/** Remove tudo que não for dígito. */
export function normalizeGtinInput(raw: string): string {
  return raw.replace(/\D/g, '')
}

/** Valida dígito verificador GS1 (EAN/UPC/GTIN). */
export function isValidGtinChecksum(code: string): boolean {
  const digits = normalizeGtinInput(code)
  if (!GTIN_VALID_LENGTHS.includes(digits.length as (typeof GTIN_VALID_LENGTHS)[number])) {
    return false
  }

  let sum = 0
  for (let i = digits.length - 2; i >= 0; i--) {
    const d = Number(digits[i])
    const posFromRight = digits.length - 1 - i
    sum += d * (posFromRight % 2 === 1 ? 3 : 1)
  }

  const check = Number(digits[digits.length - 1])
  return (10 - (sum % 10)) % 10 === check
}

/** Retorna mensagem de erro ou null se válido. Aceita vazio (validação de obrigatoriedade é separada). */
export function validateGtinValue(raw: string, label = 'GTIN'): string | null {
  const digits = normalizeGtinInput(raw)
  if (!digits) return null

  if (!GTIN_VALID_LENGTHS.includes(digits.length as (typeof GTIN_VALID_LENGTHS)[number])) {
    return `${label} deve ter 8, 12, 13 ou 14 dígitos.`
  }

  if (!isValidGtinChecksum(digits)) {
    return `${label} inválido. Verifique o código de barras da embalagem.`
  }

  return null
}

export function isGtinAttributeId(id: string): boolean {
  return id.toUpperCase() === 'GTIN'
}

export function isEmptyGtinReasonAttributeId(id: string): boolean {
  return id.toUpperCase() === 'EMPTY_GTIN_REASON'
}
