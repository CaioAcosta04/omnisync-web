import { useCallback, useEffect, useRef, useState } from 'react'
import { FiDollarSign, FiHash, FiImage, FiPackage, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi'
import { searchCategorySuggestions, type MlCategorySuggestion } from '../services/mercadoLivreCatalogApi'
import type { MercadoLivreProductMetadata } from '../types/product'

export type NewProductData = {
  name: string
  sku: string
  description: string
  price: number
  stock: number
  reservedStock: number
  announcement: boolean
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
}

const URL_REGEX = /^https?:\/\/.+/

function validateBase(form: BaseFields): BaseErrors {
  const errors: BaseErrors = {}
  if (!form.name.trim()) errors.name = 'Product name is required.'
  if (!form.sku.trim()) errors.sku = 'SKU is required.'
  else if (form.sku.trim().length > 100) errors.sku = 'SKU must be at most 100 characters.'
  if (!form.description.trim()) errors.description = 'Description is required.'
  if (form.price < 0) errors.price = 'Price cannot be negative.'
  if (form.stock < 0) errors.stock = 'Stock cannot be negative.'
  if (form.reservedStock < 0) errors.reservedStock = 'Reserved stock cannot be negative.'
  else if (form.reservedStock > form.stock)
    errors.reservedStock = 'Reserved stock cannot exceed total stock.'
  return errors
}

function validateMl(
  announcement: boolean,
  category: MlCategorySuggestion | null,
  pictures: string[]
): MlErrors {
  if (!announcement) return {}
  const errors: MlErrors = {}
  if (!category) errors.category = 'Selecione uma categoria.'
  const validPics = pictures.filter((u) => u.trim() && URL_REGEX.test(u.trim()))
  if (validPics.length === 0) errors.pictures = 'Adicione ao menos uma URL de imagem válida (http/https).'
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
  const [mlPictures, setMlPictures] = useState<string[]>([''])
  const [mlErrors, setMlErrors] = useState<MlErrors>({})

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const categoryInputRef = useRef<HTMLInputElement>(null)

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
    setMlPictures([''])
    setMlErrors({})
  }, [])

  // Reset when modal opens
  useEffect(() => {
    if (open) resetAll()
  }, [open, resetAll])

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
    setMlErrors((prev) => ({ ...prev, category: undefined }))
  }

  // Pictures
  const setPicture = (index: number, value: string) => {
    setMlPictures((prev) => prev.map((u, i) => (i === index ? value : u)))
    setMlErrors((prev) => ({ ...prev, pictures: undefined }))
  }
  const addPicture = () => setMlPictures((prev) => [...prev, ''])
  const removePicture = (index: number) =>
    setMlPictures((prev) => prev.length === 1 ? [''] : prev.filter((_, i) => i !== index))

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const allBaseErrors = validateBase(form)
    setBaseErrors(allBaseErrors)
    setTouched(new Set(Object.keys(form) as (keyof BaseFields)[]))

    const allMlErrors = validateMl(announcement, mlCategory, mlPictures)
    setMlErrors(allMlErrors)

    if (Object.keys(allBaseErrors).length > 0 || Object.keys(allMlErrors).length > 0) return

    const validPics = mlPictures
      .map((u) => u.trim())
      .filter((u) => u && URL_REGEX.test(u))
      .map((source) => ({ source }))

    const mlMetadata: MercadoLivreProductMetadata | undefined =
      announcement && mlCategory
        ? { category_id: mlCategory.category_id, condition: mlCondition, pictures: validPics }
        : undefined

    await onSubmit({
      ...form,
      announcement: mlConnected && announcement,
      mlMetadata,
    })
  }

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Add New Product</h2>
            <p style={styles.subtitle}>Fill in the product details below</p>
          </div>
          <button
            type="button"
            style={styles.closeBtn}
            onClick={handleClose}
            disabled={submitting}
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Name */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="product-name">
              Product Name <span style={styles.required}>*</span>
            </label>
            <div style={{ ...styles.inputWrap, ...(baseErrors.name ? styles.inputWrapError : {}) }}>
              <FiPackage size={16} color="#9ca3af" />
              <input
                id="product-name"
                type="text"
                placeholder="e.g. Premium Wireless Headphones"
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
                placeholder="e.g. WH-1000XM5-B"
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
              Description <span style={styles.required}>*</span>
            </label>
            <div style={{ ...styles.textareaWrap, ...(baseErrors.description ? styles.inputWrapError : {}) }}>
              <textarea
                id="product-description"
                placeholder="Brief product description..."
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
                Price (R$) <span style={styles.required}>*</span>
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
                Stock <span style={styles.required}>*</span>
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
                Reserved Stock
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

                  {/* Pictures */}
                  <div style={styles.field}>
                    <label style={styles.label}>
                      Fotos (URL) <span style={styles.required}>*</span>
                    </label>
                    <div style={styles.picturesWrap}>
                      {mlPictures.map((url, i) => (
                        <div key={i} style={styles.pictureRow}>
                          <div
                            style={{
                              ...styles.inputWrap,
                              flex: 1,
                              ...(mlErrors.pictures && !URL_REGEX.test(url.trim()) && url.trim()
                                ? styles.inputWrapError
                                : {}),
                            }}
                          >
                            <FiImage size={16} color="#9ca3af" />
                            <input
                              type="url"
                              placeholder="https://..."
                              value={url}
                              onChange={(e) => setPicture(i, e.target.value)}
                              style={styles.input}
                            />
                          </div>
                          <button
                            type="button"
                            style={styles.removePicBtn}
                            onClick={() => removePicture(i)}
                            aria-label="Remover foto"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button type="button" style={styles.addPicBtn} onClick={addPicture}>
                        <FiPlus size={14} />
                        Adicionar foto
                      </button>
                    </div>
                    {mlErrors.pictures && <span style={styles.errorMsg}>{mlErrors.pictures}</span>}
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
              Cancel
            </button>
            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Criando…' : 'Create Product'}
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
