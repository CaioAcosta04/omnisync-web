import { useState } from 'react'
import { FiDollarSign, FiHash, FiPackage, FiX } from 'react-icons/fi'

export type NewProductData = {
  name: string
  sku: string
  description: string
  price: number
  stock: number
  reservedStock: number
}

type AddProductModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (data: NewProductData) => void
}

type FieldError = Partial<Record<keyof NewProductData, string>>

function validate(form: NewProductData): FieldError {
  const errors: FieldError = {}

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

const INITIAL_FORM: NewProductData = {
  name: '',
  sku: '',
  description: '',
  price: 0,
  stock: 0,
  reservedStock: 0,
}

export function AddProductModal({ open, onClose, onSubmit }: AddProductModalProps) {
  const [form, setForm] = useState<NewProductData>({ ...INITIAL_FORM })
  const [errors, setErrors] = useState<FieldError>({})
  const [touched, setTouched] = useState<Set<keyof NewProductData>>(new Set())

  if (!open) return null

  const set = <K extends keyof NewProductData>(key: K, value: NewProductData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (touched.has(key)) {
      const updated = { ...form, [key]: value }
      const newErrors = validate(updated)
      setErrors((prev) => ({ ...prev, [key]: newErrors[key] }))
    }
  }

  const markTouched = (key: keyof NewProductData) => {
    setTouched((prev) => new Set(prev).add(key))
    const newErrors = validate(form)
    setErrors((prev) => ({ ...prev, [key]: newErrors[key] }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const allErrors = validate(form)
    setErrors(allErrors)
    setTouched(new Set(Object.keys(form) as (keyof NewProductData)[]))

    if (Object.keys(allErrors).length > 0) return

    onSubmit(form)
    setForm({ ...INITIAL_FORM })
    setErrors({})
    setTouched(new Set())
  }

  const handleClose = () => {
    setForm({ ...INITIAL_FORM })
    setErrors({})
    setTouched(new Set())
    onClose()
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
          <button type="button" style={styles.closeBtn} onClick={handleClose} aria-label="Close">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Name */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="product-name">
              Product Name <span style={styles.required}>*</span>
            </label>
            <div style={{ ...styles.inputWrap, ...(errors.name ? styles.inputWrapError : {}) }}>
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
            {errors.name && <span style={styles.errorMsg}>{errors.name}</span>}
          </div>

          {/* SKU */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="product-sku">
              SKU <span style={styles.required}>*</span>
            </label>
            <div style={{ ...styles.inputWrap, ...(errors.sku ? styles.inputWrapError : {}) }}>
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
            {errors.sku && <span style={styles.errorMsg}>{errors.sku}</span>}
          </div>

          {/* Description */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="product-description">
              Description <span style={styles.required}>*</span>
            </label>
            <div
              style={{
                ...styles.textareaWrap,
                ...(errors.description ? styles.inputWrapError : {}),
              }}
            >
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
            {errors.description && <span style={styles.errorMsg}>{errors.description}</span>}
          </div>

          {/* Price */}
          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label} htmlFor="product-price">
                Price (R$) <span style={styles.required}>*</span>
              </label>
              <div style={{ ...styles.inputWrap, ...(errors.price ? styles.inputWrapError : {}) }}>
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
              {errors.price && <span style={styles.errorMsg}>{errors.price}</span>}
            </div>
          </div>

          {/* Stock & Reserved Stock */}
          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label} htmlFor="product-stock">
                Stock <span style={styles.required}>*</span>
              </label>
              <div style={{ ...styles.inputWrap, ...(errors.stock ? styles.inputWrapError : {}) }}>
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
              {errors.stock && <span style={styles.errorMsg}>{errors.stock}</span>}
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label} htmlFor="product-reserved">
                Reserved Stock
              </label>
              <div
                style={{
                  ...styles.inputWrap,
                  ...(errors.reservedStock ? styles.inputWrapError : {}),
                }}
              >
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
              {errors.reservedStock && (
                <span style={styles.errorMsg}>{errors.reservedStock}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" style={styles.submitBtn}>
              Create Product
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
    maxWidth: '560px',
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
