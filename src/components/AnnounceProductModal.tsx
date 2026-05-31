import { useCallback, useEffect, useRef, useState } from 'react'
import { FiRefreshCw, FiSearch, FiX } from 'react-icons/fi'
import { MlCategoryAttributesForm } from './MlCategoryAttributesForm'
import { ProductPicturesEditor } from './ProductPicturesEditor'
import {
  buildInitialFieldState,
  mergeRequiredAttributesWithGtinReason,
  serializeAttributes,
  validateAttributeFields,
  type MlAttributeFieldState,
} from '../lib/mlCategoryAttributes'
import {
  createEmptyPicture,
  pictureFromUrl,
  toMercadoLivrePictures,
  validatePictures,
  type ProductPictureEntry,
} from '../lib/productPictures'
import type { MlAttributeDefinition } from '../types/mercadolivreCatalog'
import { fetchCategoryRequirements, searchCategorySuggestions, type MlCategorySuggestion } from '../services/mercadoLivreCatalogApi'
import type { MercadoLivreProductMetadata, ProductDto } from '../types/product'

type AnnounceProductModalProps = {
  open: boolean
  product: ProductDto
  systemClientId: number
  onClose: () => void
  onSubmit: (mlMetadata: MercadoLivreProductMetadata) => void | Promise<void>
  submitting?: boolean
  errorMessage?: string | null
}

type MlErrors = {
  category?: string
  pictures?: string
  attributes?: string
  attributeFields?: Record<string, string>
}

function picturesFromProduct(product: ProductDto): ProductPictureEntry[] {
  const images = product.resource?.images
  if (!Array.isArray(images)) return [createEmptyPicture()]

  const entries: ProductPictureEntry[] = []
  for (const img of images) {
    if (img == null || typeof img !== 'object') continue
    const url = (img as Record<string, unknown>).url
    if (typeof url === 'string') {
      const entry = pictureFromUrl(url)
      if (entry) entries.push(entry)
    }
  }
  return entries.length > 0 ? entries : [createEmptyPicture()]
}

function validateMl(
  category: MlCategorySuggestion | null,
  pictures: ProductPictureEntry[],
  attributeFields: MlAttributeDefinition[],
  attributeValues: MlAttributeFieldState
): MlErrors {
  const errors: MlErrors = {}
  if (!category) errors.category = 'Selecione uma categoria.'
  const pictureError = validatePictures(pictures, true)
  if (pictureError) errors.pictures = pictureError
  if (attributeFields.length > 0) {
    const fieldErrors = validateAttributeFields(attributeFields, attributeValues)
    if (Object.keys(fieldErrors).length > 0) {
      errors.attributeFields = fieldErrors
    }
  }
  return errors
}

export function AnnounceProductModal({
  open,
  product,
  systemClientId,
  onClose,
  onSubmit,
  submitting = false,
  errorMessage,
}: AnnounceProductModalProps) {
  const [mlCondition, setMlCondition] = useState<'new' | 'used'>('new')
  const [mlCategory, setMlCategory] = useState<MlCategorySuggestion | null>(null)
  const [mlCategoryQuery, setMlCategoryQuery] = useState('')
  const [mlSuggestions, setMlSuggestions] = useState<MlCategorySuggestion[]>([])
  const [mlSuggestionsOpen, setMlSuggestionsOpen] = useState(false)
  const [mlCategoryLoading, setMlCategoryLoading] = useState(false)
  const [mlPictures, setMlPictures] = useState<ProductPictureEntry[]>(() => [createEmptyPicture()])
  const [mlErrors, setMlErrors] = useState<MlErrors>({})
  const [mlAttributeFields, setMlAttributeFields] = useState<MlAttributeDefinition[]>([])
  const [mlAttributeValues, setMlAttributeValues] = useState<MlAttributeFieldState>({})
  const [mlAttributesLoading, setMlAttributesLoading] = useState(false)
  const [mlAttributesError, setMlAttributesError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const categoryInputRef = useRef<HTMLInputElement>(null)
  const attributesRequestRef = useRef(0)

  const resetAll = useCallback(() => {
    setMlCondition('new')
    setMlCategory(null)
    setMlCategoryQuery('')
    setMlSuggestions([])
    setMlSuggestionsOpen(false)
    setMlCategoryLoading(false)
    setMlPictures(picturesFromProduct(product))
    setMlErrors({})
    setMlAttributeFields([])
    setMlAttributeValues({})
    setMlAttributesLoading(false)
    setMlAttributesError(null)
  }, [product])

  useEffect(() => {
    if (open) resetAll()
  }, [open, resetAll])

  const resetCategoryAttributes = useCallback(() => {
    setMlAttributeFields([])
    setMlAttributeValues({})
    setMlAttributesLoading(false)
    setMlAttributesError(null)
    setMlErrors((prev) => {
      const next = { ...prev }
      delete next.attributes
      delete next.attributeFields
      return next
    })
  }, [])

  const loadCategoryAttributes = useCallback(
    async (categoryId: string) => {
      const requestId = ++attributesRequestRef.current
      setMlAttributesLoading(true)
      setMlAttributesError(null)
      setMlAttributeFields([])
      setMlAttributeValues({})

      try {
        const requirements = await fetchCategoryRequirements(systemClientId, categoryId)
        if (requestId !== attributesRequestRef.current) return

        const fields = mergeRequiredAttributesWithGtinReason(requirements)
        setMlAttributeFields(fields)
        setMlAttributeValues(buildInitialFieldState(fields))

        if (fields.length === 0) {
          setMlAttributesError(
            'Nenhum atributo obrigatório encontrado para esta categoria. O anúncio pode falhar na publicação.'
          )
        }
      } catch (e) {
        if (requestId !== attributesRequestRef.current) return
        const msg = e instanceof Error ? e.message : 'Erro ao carregar atributos da categoria.'
        setMlAttributesError(msg)
        setMlAttributeFields([])
        setMlAttributeValues({})
      } finally {
        if (requestId === attributesRequestRef.current) {
          setMlAttributesLoading(false)
        }
      }
    },
    [systemClientId]
  )

  if (!open) return null

  const handleCategoryQueryChange = (q: string) => {
    setMlCategoryQuery(q)
    setMlCategory(null)
    resetCategoryAttributes()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) {
      setMlSuggestions([])
      setMlSuggestionsOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setMlCategoryLoading(true)
      try {
        const results = await searchCategorySuggestions(systemClientId, q)
        setMlSuggestions(results)
        setMlSuggestionsOpen(results.length > 0)
      } catch {
        setMlSuggestions([])
        setMlSuggestionsOpen(false)
      } finally {
        setMlCategoryLoading(false)
      }
    }, 300)
  }

  const selectCategory = (cat: MlCategorySuggestion) => {
    setMlCategory(cat)
    setMlCategoryQuery(cat.category_name)
    setMlSuggestions([])
    setMlSuggestionsOpen(false)
    setMlErrors((prev) => ({ ...prev, category: undefined, attributes: undefined, attributeFields: undefined }))
    void loadCategoryAttributes(cat.category_id)
  }

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const allMlErrors = validateMl(mlCategory, mlPictures, mlAttributeFields, mlAttributeValues)
    setMlErrors(allMlErrors)

    if (
      Object.keys(allMlErrors).filter((k) => k !== 'attributeFields').length > 0 ||
      (allMlErrors.attributeFields && Object.keys(allMlErrors.attributeFields).length > 0)
    ) {
      return
    }

    if (mlAttributesLoading) return
    if (mlCategory && mlAttributesError && mlAttributeFields.length === 0) return

    const mlPicturesPayload = toMercadoLivrePictures(mlPictures)
    if (!mlCategory || mlPicturesPayload.length === 0) return

    const serializedAttributes =
      mlAttributeFields.length > 0 ? serializeAttributes(mlAttributeFields, mlAttributeValues) : undefined

    const mlMetadata: MercadoLivreProductMetadata = {
      category_id: mlCategory.category_id,
      condition: mlCondition,
      pictures: mlPicturesPayload,
      ...(serializedAttributes && serializedAttributes.length > 0
        ? { attributes: serializedAttributes }
        : {}),
    }

    await onSubmit(mlMetadata)
  }

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Anunciar no Mercado Livre</h2>
            <p style={styles.subtitle}>
              Configure o anúncio para <strong>{product.name}</strong>
            </p>
          </div>
          <button
            type="button"
            style={styles.closeBtn}
            onClick={handleClose}
            disabled={submitting}
            aria-label="Fechar"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.mlBanner}>
            <img
              src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/logo__large_plus@2x.png"
              alt="Mercado Livre"
              style={styles.mlLogo}
            />
            <span style={styles.mlBannerText}>
              O produto já está cadastrado na loja. Preencha os dados do anúncio abaixo.
            </span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Fotos do anúncio <span style={styles.required}>*</span>
            </label>
            <ProductPicturesEditor
              entries={mlPictures}
              onChange={(next) => {
                setMlPictures(next)
                setMlErrors((prev) => ({ ...prev, pictures: undefined }))
              }}
              error={mlErrors.pictures}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="announce-ml-category">
              Categoria <span style={styles.required}>*</span>
            </label>
            <div style={styles.autocompleteWrap}>
              <div
                style={{
                  ...styles.inputWrap,
                  ...(mlErrors.category ? styles.inputWrapError : {}),
                }}
              >
                <FiSearch size={16} color="#9ca3af" />
                <input
                  id="announce-ml-category"
                  ref={categoryInputRef}
                  type="text"
                  placeholder="Ex: Fones de ouvido sem fio"
                  value={mlCategoryQuery}
                  onChange={(e) => handleCategoryQueryChange(e.target.value)}
                  onBlur={() => {
                    setTimeout(() => setMlSuggestionsOpen(false), 150)
                  }}
                  style={styles.input}
                  autoComplete="off"
                />
                {mlCategoryLoading && <div style={styles.miniSpinner} />}
              </div>
              {mlSuggestionsOpen && mlSuggestions.length > 0 && (
                <ul style={styles.suggestionsList}>
                  {mlSuggestions.map((s) => (
                    <li key={s.category_id}>
                      <button
                        type="button"
                        style={styles.suggestionItem}
                        onMouseDown={() => selectCategory(s)}
                      >
                        <span style={styles.suggestionName}>{s.category_name}</span>
                        {s.domain_name && (
                          <span style={styles.suggestionDomain}>{s.domain_name}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {mlErrors.category && <span style={styles.errorMsg}>{mlErrors.category}</span>}
            {mlCategory && (
              <span style={styles.categorySelected}>
                ID: <code>{mlCategory.category_id}</code>
              </span>
            )}
          </div>

          {mlCategory && (
            <div style={styles.mlAttributesBlock}>
              {mlAttributesLoading ? (
                <div style={styles.attributesLoading}>
                  <div style={styles.miniSpinner} />
                  <span>Carregando campos da categoria…</span>
                </div>
              ) : null}

              {mlAttributesError ? (
                <div style={styles.attributesErrorBanner} role="alert">
                  <span>{mlAttributesError}</span>
                  <button
                    type="button"
                    style={styles.retryAttributesBtn}
                    onClick={() => void loadCategoryAttributes(mlCategory.category_id)}
                  >
                    <FiRefreshCw size={13} />
                    Tentar novamente
                  </button>
                </div>
              ) : null}

              {!mlAttributesLoading && mlAttributeFields.length > 0 ? (
                <MlCategoryAttributesForm
                  fields={mlAttributeFields}
                  values={mlAttributeValues}
                  errors={mlErrors.attributeFields ?? {}}
                  onChange={(next) => {
                    setMlAttributeValues(next)
                    setMlErrors((prev) => ({ ...prev, attributeFields: undefined }))
                  }}
                />
              ) : null}
            </div>
          )}

          <div style={styles.field}>
            <span style={styles.label}>
              Condição <span style={styles.required}>*</span>
            </span>
            <div style={styles.conditionRow}>
              {(['new', 'used'] as const).map((cond) => (
                <button
                  key={cond}
                  type="button"
                  style={{
                    ...styles.conditionBtn,
                    ...(mlCondition === cond ? styles.conditionBtnActive : {}),
                  }}
                  onClick={() => setMlCondition(cond)}
                  aria-pressed={mlCondition === cond}
                >
                  {cond === 'new' ? 'Novo' : 'Usado'}
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div style={styles.errorBanner} role="alert">
              {errorMessage}
            </div>
          )}

          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={handleClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Publicando…' : 'Publicar anúncio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '24px',
  },
  modal: {
    width: '100%',
    maxWidth: '580px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    padding: '28px 32px 32px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '4px',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
  },
  closeBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  mlBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1.5px solid #fde68a',
    backgroundColor: '#fffde7',
  },
  mlLogo: {
    height: '20px',
    objectFit: 'contain' as const,
    flexShrink: 0,
  },
  mlBannerText: {
    fontSize: '13px',
    color: '#374151',
    lineHeight: 1.4,
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
  },
  required: {
    color: '#dc2626',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
  },
  inputWrapError: {
    borderColor: '#fca5a5',
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: 'transparent',
    minWidth: 0,
  },
  errorMsg: {
    fontSize: '12px',
    color: '#dc2626',
    fontWeight: 500,
  },
  autocompleteWrap: {
    position: 'relative' as const,
  },
  miniSpinner: {
    width: '14px',
    height: '14px',
    border: '2px solid #e5e7eb',
    borderTopColor: '#f59e0b',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    flexShrink: 0,
  },
  suggestionsList: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
    listStyle: 'none',
    padding: '4px',
    marginTop: '4px',
    maxHeight: '220px',
    overflowY: 'auto' as const,
  },
  suggestionItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '10px 12px',
    border: 'none',
    background: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
  },
  suggestionName: {
    fontSize: '14px',
    color: '#111827',
    fontWeight: 500,
  },
  suggestionDomain: {
    fontSize: '12px',
    color: '#9ca3af',
    flexShrink: 0,
  },
  categorySelected: {
    fontSize: '12px',
    color: '#6b7280',
  },
  mlAttributesBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    padding: '12px',
    backgroundColor: '#fffde7',
    border: '1px solid #fde68a',
    borderRadius: '8px',
  },
  attributesLoading: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    color: '#6b7280',
  },
  attributesErrorBanner: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    fontSize: '13px',
  },
  retryAttributesBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    alignSelf: 'flex-start' as const,
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    backgroundColor: '#ffffff',
    color: '#991b1b',
    fontFamily: 'inherit',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  conditionRow: {
    display: 'flex',
    gap: '8px',
  },
  conditionBtn: {
    padding: '8px 20px',
    borderRadius: '8px',
    border: '1.5px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
  },
  conditionBtnActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    color: '#92400e',
    fontWeight: 600,
  },
  errorBanner: {
    padding: '12px 14px',
    borderRadius: '10px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
  },
  cancelBtn: {
    padding: '10px 22px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '10px 24px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#f59e0b',
    cursor: 'pointer',
  },
} as const
