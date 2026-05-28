import { useCallback, useEffect, useRef, useState } from 'react'
import { FiDollarSign, FiHash, FiPackage, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi'
import { MlCategoryAttributesForm } from './MlCategoryAttributesForm'
import { ProductPicturesEditor } from './ProductPicturesEditor'
import {
  buildInitialFieldState,
  mergeRequiredAttributesWithGtinReason,
  serializeAttributes,
  validateAttributeFields,
  type MlAttributeFieldState,
} from '../lib/mlCategoryAttributes'
import type { MlAttributeDefinition } from '../types/mercadolivreCatalog'
import { fetchCategoryRequirements, searchCategorySuggestions, type MlCategorySuggestion } from '../services/mercadoLivreCatalogApi'
import {
  createEmptyPicture,
  toMercadoLivrePictures,
  toResourceImages,
  validatePictures,
  type ProductPictureEntry,
} from '../lib/productPictures'
import type { MercadoLivreProductMetadata } from '../types/product'

export type NewProductData = {
  name: string
  sku: string
  description: string
  price: number
  stock: number
  reservedStock: number
  announcement: boolean
  imageResource?: Array<{ url: string }>
  mlMetadata?: MercadoLivreProductMetadata
}

type AddProductModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (data: NewProductData) => void | Promise<void>
  mlConnected: boolean
  systemClientId: number | null
  submitting?: boolean
  errorMessage?: string | null
}

type BaseFields = Omit<NewProductData, 'announcement' | 'mlMetadata'>
type BaseErrors = Partial<Record<keyof BaseFields, string>>
type MlErrors = {
  category?: string
  pictures?: string
  attributes?: string
  attributeFields?: Record<string, string>
}

function validateBase(form: BaseFields): BaseErrors {
  const errors: BaseErrors = {}
  if (!form.name.trim()) errors.name = 'Nome do produto é obrigatório.'
  if (!form.sku.trim()) errors.sku = 'SKU é obrigatório.'
  else if (form.sku.trim().length > 100) errors.sku = 'SKU deve ter no máximo 100 caracteres.'
  if (!form.description.trim()) errors.description = 'Descrição é obrigatória.'
  if (form.price < 0) errors.price = 'Preço não pode ser negativo.'
  if (form.stock < 0) errors.stock = 'Estoque não pode ser negativo.'
  if (form.reservedStock < 0) errors.reservedStock = 'Estoque reservado não pode ser negativo.'
  else if (form.reservedStock > form.stock)
    errors.reservedStock = 'Estoque reservado não pode ser maior que o total.'
  return errors
}

function validateMl(
  announcement: boolean,
  category: MlCategorySuggestion | null,
  pictures: ProductPictureEntry[],
  attributeFields: MlAttributeDefinition[],
  attributeValues: MlAttributeFieldState
): MlErrors {
  if (!announcement) return {}
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

const INITIAL_BASE: BaseFields = { name: '', sku: '', description: '', price: 0, stock: 0, reservedStock: 0 }

export function AddProductModal({
  open,
  onClose,
  onSubmit,
  mlConnected,
  systemClientId,
  submitting = false,
  errorMessage,
}: AddProductModalProps) {
  const [form, setForm] = useState<BaseFields>({ ...INITIAL_BASE })
  const [baseErrors, setBaseErrors] = useState<BaseErrors>({})
  const [touched, setTouched] = useState<Set<keyof BaseFields>>(new Set())

  // ML announcement state
  const [announcement, setAnnouncement] = useState(false)
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
    setForm({ ...INITIAL_BASE })
    setBaseErrors({})
    setTouched(new Set())
    setAnnouncement(false)
    setMlCondition('new')
    setMlCategory(null)
    setMlCategoryQuery('')
    setMlSuggestions([])
    setMlSuggestionsOpen(false)
    setMlCategoryLoading(false)
    setMlPictures([createEmptyPicture()])
    setMlErrors({})
    setMlAttributeFields([])
    setMlAttributeValues({})
    setMlAttributesLoading(false)
    setMlAttributesError(null)
  }, [])

  // Reset when modal opens
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
      if (systemClientId == null) return
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

  const set = <K extends keyof BaseFields>(key: K, value: BaseFields[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (touched.has(key)) {
      const updated = { ...form, [key]: value }
      const newErrors = validateBase(updated)
      setBaseErrors((prev) => ({ ...prev, [key]: newErrors[key] }))
    }
  }

  const markTouched = (key: keyof BaseFields) => {
    setTouched((prev) => new Set(prev).add(key))
    const newErrors = validateBase(form)
    setBaseErrors((prev) => ({ ...prev, [key]: newErrors[key] }))
  }

  // Category autocomplete
  const handleCategoryQueryChange = (q: string) => {
    setMlCategoryQuery(q)
    setMlCategory(null)
    resetCategoryAttributes()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim() || systemClientId == null) {
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

  // Pictures handled via ProductPicturesEditor

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const allBaseErrors = validateBase(form)
    setBaseErrors(allBaseErrors)
    setTouched(new Set(Object.keys(form) as (keyof BaseFields)[]))

    const allMlErrors = validateMl(
      announcement,
      mlCategory,
      mlPictures,
      mlAttributeFields,
      mlAttributeValues
    )
    setMlErrors(allMlErrors)

    if (
      Object.keys(allBaseErrors).length > 0 ||
      Object.keys(allMlErrors).filter((k) => k !== 'attributeFields').length > 0 ||
      (allMlErrors.attributeFields && Object.keys(allMlErrors.attributeFields).length > 0)
    ) {
      return
    }

    if (announcement && mlAttributesLoading) return
    if (announcement && mlCategory && mlAttributesError && mlAttributeFields.length === 0) return

    const mlPicturesPayload = toMercadoLivrePictures(mlPictures)
    const imageResource = toResourceImages(mlPictures)

    const serializedAttributes =
      mlAttributeFields.length > 0 ? serializeAttributes(mlAttributeFields, mlAttributeValues) : undefined

    const mlMetadata: MercadoLivreProductMetadata | undefined =
      announcement && mlCategory && mlPicturesPayload.length > 0
        ? {
            category_id: mlCategory.category_id,
            condition: mlCondition,
            pictures: mlPicturesPayload,
            ...(serializedAttributes && serializedAttributes.length > 0
              ? { attributes: serializedAttributes }
              : {}),
          }
        : undefined

    await onSubmit({
      ...form,
      announcement: mlConnected && announcement,
      imageResource: imageResource.length > 0 ? imageResource : undefined,
      mlMetadata,
    })
  }

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Adicionar produto</h2>
            <p style={styles.subtitle}>Preencha os dados do produto abaixo</p>
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
          {/* Name */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="product-name">
              Nome do produto <span style={styles.required}>*</span>
            </label>
            <div style={{ ...styles.inputWrap, ...(baseErrors.name ? styles.inputWrapError : {}) }}>
              <FiPackage size={16} color="#9ca3af" />
              <input
                id="product-name"
                type="text"
                placeholder="Ex.: Fone Bluetooth Premium"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                onBlur={() => markTouched('name')}
                style={styles.input}
              />
            </div>
            {baseErrors.name && <span style={styles.errorMsg}>{baseErrors.name}</span>}
          </div>

          {/* SKU */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="product-sku">
              SKU <span style={styles.required}>*</span>
            </label>
            <div style={{ ...styles.inputWrap, ...(baseErrors.sku ? styles.inputWrapError : {}) }}>
              <FiHash size={16} color="#9ca3af" />
              <input
                id="product-sku"
                type="text"
                placeholder="Ex.: WH-1000XM5-B"
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                onBlur={() => markTouched('sku')}
                style={styles.input}
                maxLength={100}
              />
            </div>
            {baseErrors.sku && <span style={styles.errorMsg}>{baseErrors.sku}</span>}
          </div>

          {/* Description */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="product-description">
              Descrição <span style={styles.required}>*</span>
            </label>
            <div style={{ ...styles.textareaWrap, ...(baseErrors.description ? styles.inputWrapError : {}) }}>
              <textarea
                id="product-description"
                placeholder="Breve descrição do produto..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                onBlur={() => markTouched('description')}
                style={styles.textarea}
                rows={3}
              />
            </div>
            {baseErrors.description && <span style={styles.errorMsg}>{baseErrors.description}</span>}
          </div>

          {/* Price */}
          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label} htmlFor="product-price">
                Preço (R$) <span style={styles.required}>*</span>
              </label>
              <div style={{ ...styles.inputWrap, ...(baseErrors.price ? styles.inputWrapError : {}) }}>
                <FiDollarSign size={16} color="#9ca3af" />
                <input
                  id="product-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.price || ''}
                  onChange={(e) => set('price', Number(e.target.value))}
                  onBlur={() => markTouched('price')}
                  style={styles.input}
                />
              </div>
              {baseErrors.price && <span style={styles.errorMsg}>{baseErrors.price}</span>}
            </div>
          </div>

          {/* Stock & Reserved Stock */}
          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label} htmlFor="product-stock">
                Estoque <span style={styles.required}>*</span>
              </label>
              <div style={{ ...styles.inputWrap, ...(baseErrors.stock ? styles.inputWrapError : {}) }}>
                <input
                  id="product-stock"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.stock || ''}
                  onChange={(e) => set('stock', Number(e.target.value))}
                  onBlur={() => markTouched('stock')}
                  style={styles.input}
                />
              </div>
              {baseErrors.stock && <span style={styles.errorMsg}>{baseErrors.stock}</span>}
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label} htmlFor="product-reserved">
                Estoque reservado
              </label>
              <div style={{ ...styles.inputWrap, ...(baseErrors.reservedStock ? styles.inputWrapError : {}) }}>
                <input
                  id="product-reserved"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.reservedStock || ''}
                  onChange={(e) => set('reservedStock', Number(e.target.value))}
                  onBlur={() => markTouched('reservedStock')}
                  style={styles.input}
                />
              </div>
              {baseErrors.reservedStock && <span style={styles.errorMsg}>{baseErrors.reservedStock}</span>}
            </div>
          </div>

          {/* Product images */}
          <div style={styles.field}>
            <label style={styles.label}>
              Imagens do produto
              {announcement ? <span style={styles.required}> *</span> : null}
            </label>
            <ProductPicturesEditor
              entries={mlPictures}
              onChange={(next) => {
                setMlPictures(next)
                setMlErrors((prev) => ({ ...prev, pictures: undefined }))
              }}
              error={mlErrors.pictures}
              required={announcement}
            />
          </div>

          {/* ML announcement checkbox — only when mlConnected */}
          {mlConnected && (
            <div>
              <div
                style={{
                  ...styles.mlToggleCard,
                  ...(announcement ? styles.mlToggleCardActive : {}),
                }}
              >
                <div style={styles.mlToggleLeft}>
                  <img
                    src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/logo__large_plus@2x.png"
                    alt="Mercado Livre"
                    style={styles.mlLogo}
                  />
                  <div style={styles.mlToggleText}>
                    <span style={styles.mlToggleTitle}>Criar anúncio no Mercado Livre</span>
                    <span style={styles.mlToggleSubtitle}>
                      O produto também será anunciado automaticamente na sua conta.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  style={{ ...styles.mlCheckbox, ...(announcement ? styles.mlCheckboxActive : {}), cursor: 'pointer' }}
                  onClick={() => {
                    setAnnouncement((v) => !v)
                    setMlErrors({})
                  }}
                  aria-pressed={announcement}
                  aria-label="Criar anúncio no Mercado Livre"
                >
                  {announcement && <span style={styles.mlCheckmark}>✓</span>}
                </button>
              </div>

              {/* Expanded ML fields */}
              {announcement && (
                <div style={styles.mlSection}>
                  {/* Category autocomplete */}
                  <div style={styles.field}>
                    <label style={styles.label} htmlFor="ml-category">
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
                          id="ml-category"
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

                  {/* Category-specific required attributes */}
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

                  {/* Condition */}
                  <div style={styles.field}>
                    <span style={styles.label}>Condição <span style={styles.required}>*</span></span>
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
                </div>
              )}
            </div>
          )}

          {/* Error banner */}
          {errorMessage && (
            <div style={styles.errorBanner} role="alert">
              {errorMessage}
            </div>
          )}

          {/* Actions */}
          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={handleClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Criando…' : 'Criar produto'}
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
    zIndex: 1000,
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
    marginBottom: '28px',
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
    transition: 'border-color 0.15s',
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
  textareaWrap: {
    padding: '10px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    transition: 'border-color 0.15s',
  },
  textarea: {
    width: '100%',
    border: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: 'transparent',
    resize: 'vertical' as const,
    minHeight: '60px',
  },
  errorMsg: {
    fontSize: '12px',
    color: '#dc2626',
    fontWeight: 500,
  },
  row: {
    display: 'flex',
    gap: '16px',
  },

  /* ML toggle card */
  mlToggleCard: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1.5px solid #e5e7eb',
    backgroundColor: '#fafafa',
    transition: 'border-color 0.15s, background-color 0.15s',
  },
  mlToggleCardActive: {
    borderColor: '#ffe600',
    backgroundColor: '#fffde7',
  },
  mlToggleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  mlLogo: {
    height: '20px',
    objectFit: 'contain' as const,
    flexShrink: 0,
  },
  mlToggleText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    minWidth: 0,
  },
  mlToggleTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  mlToggleSubtitle: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.4,
  },
  mlCheckbox: {
    width: '22px',
    height: '22px',
    borderRadius: '6px',
    border: '2px solid #d1d5db',
    backgroundColor: '#ffffff',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'border-color 0.15s, background-color 0.15s',
  },
  mlCheckboxActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#f59e0b',
  },
  mlCheckmark: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1,
  },

  /* Expanded ML section */
  mlSection: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '16px',
    backgroundColor: '#fffde7',
    border: '1px solid #fde68a',
    borderRadius: '10px',
  },

  /* Category autocomplete */
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
    backgroundColor: '#ffffff',
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

  /* Condition toggle */
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

  /* Pictures */
  picturesWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  pictureRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  removePicBtn: {
    width: '36px',
    height: '36px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  addPicBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: '1px dashed #d1d5db',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
    cursor: 'pointer',
    alignSelf: 'flex-start' as const,
  },

  /* Error banner */
  errorBanner: {
    padding: '12px 14px',
    borderRadius: '10px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    fontSize: '13px',
    lineHeight: 1.5,
  },

  /* Actions */
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
    backgroundColor: '#2563eb',
    cursor: 'pointer',
  },
} as const
