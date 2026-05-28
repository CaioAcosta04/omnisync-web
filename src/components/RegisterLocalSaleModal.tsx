import { useEffect, useMemo, useState } from 'react'
import { FiPackage, FiSearch, FiX } from 'react-icons/fi'
import { ProductImageThumb } from './ProductImageThumb'
import { getProductImageUrl } from '../lib/productImage'
import type { ProductDto } from '../types/product'

export type LocalSaleFormData = {
  productId: number
  quantity: number
  totalValue: number
  note: string
}

type RegisterLocalSaleModalProps = {
  open: boolean
  products: ProductDto[]
  loadingProducts?: boolean
  submitting?: boolean
  errorMessage?: string | null
  onClose: () => void
  onSubmit: (data: LocalSaleFormData) => void | Promise<void>
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function availableQty(product: ProductDto): number {
  return Math.max(0, product.stock - product.reserved_stock)
}

export function RegisterLocalSaleModal({
  open,
  products,
  loadingProducts = false,
  submitting = false,
  errorMessage = null,
  onClose,
  onSubmit,
}: RegisterLocalSaleModalProps) {
  const [search, setSearch] = useState('')
  const [productId, setProductId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [totalValue, setTotalValue] = useState('')
  const [totalTouched, setTotalTouched] = useState(false)
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSearch('')
    setProductId(null)
    setQuantity('1')
    setTotalValue('')
    setTotalTouched(false)
    setNote('')
    setFormError(null)
  }, [open])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    )
  }, [products, search])

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId],
  )

  const suggestedTotal = useMemo(() => {
    if (selectedProduct == null) return null
    const qty = Number(quantity)
    if (Number.isNaN(qty) || qty <= 0) return null
    return selectedProduct.price * qty
  }, [selectedProduct, quantity])

  useEffect(() => {
    if (totalTouched || suggestedTotal == null) return
    setTotalValue(suggestedTotal.toFixed(2))
  }, [suggestedTotal, totalTouched])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (productId == null) {
      setFormError('Selecione um produto.')
      return
    }

    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty <= 0) {
      setFormError('Informe uma quantidade válida.')
      return
    }

    const available = selectedProduct != null ? availableQty(selectedProduct) : 0
    if (qty > available) {
      setFormError(`Estoque insuficiente. Disponível: ${available} un.`)
      return
    }

    const total = Number(totalValue)
    if (Number.isNaN(total) || total < 0) {
      setFormError('Informe um valor total válido.')
      return
    }

    void onSubmit({
      productId,
      quantity: qty,
      totalValue: total,
      note: note.trim(),
    })
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Registrar venda na loja</h2>
            <p style={styles.subtitle}>
              Baixa o estoque local e sincroniza com o Mercado Livre, se houver anúncio.
            </p>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            <FiX size={20} />
          </button>
        </div>

        {(errorMessage != null || formError != null) && (
          <div style={styles.errorBanner}>{formError ?? errorMessage}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Produto</label>
            <div style={styles.searchWrap}>
              <FiSearch size={16} color="#9ca3af" />
              <input
                type="text"
                placeholder="Buscar por nome ou SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
                disabled={submitting || loadingProducts}
              />
            </div>
            <div style={styles.productList}>
              {loadingProducts ? (
                <p style={styles.emptyList}>Carregando produtos…</p>
              ) : filteredProducts.length === 0 ? (
                <p style={styles.emptyList}>Nenhum produto encontrado.</p>
              ) : (
                filteredProducts.map((product) => {
                  const available = availableQty(product)
                  const isSelected = product.id === productId
                  const disabled = available === 0
                  return (
                    <button
                      key={product.id}
                      type="button"
                      style={{
                        ...styles.productOption,
                        ...(isSelected ? styles.productOptionSelected : {}),
                        ...(disabled ? styles.productOptionDisabled : {}),
                      }}
                      onClick={() => {
                        if (disabled) return
                        setProductId(product.id)
                        setTotalTouched(false)
                        setQuantity('1')
                      }}
                      disabled={submitting || disabled}
                    >
                      <ProductImageThumb
                        src={getProductImageUrl(product)}
                        alt={product.name}
                        size={36}
                      />
                      <div style={styles.productOptionText}>
                        <span style={styles.productName}>{product.name}</span>
                        <span style={styles.productMeta}>
                          SKU {product.sku} · {BRL.format(product.price)} · {available} disp.
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {selectedProduct != null && (
            <div style={styles.selectedCard}>
              <FiPackage size={18} color="#2563eb" />
              <div>
                <span style={styles.selectedName}>{selectedProduct.name}</span>
                <span style={styles.selectedMeta}>
                  Preço unitário: {BRL.format(selectedProduct.price)} · Disponível:{' '}
                  {availableQty(selectedProduct)} un.
                </span>
              </div>
            </div>
          )}

          <div style={styles.row}>
            <div style={styles.fieldHalf}>
              <label style={styles.label} htmlFor="sale-quantity">
                Quantidade
              </label>
              <input
                id="sale-quantity"
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value)
                  setTotalTouched(false)
                }}
                style={styles.input}
                disabled={submitting || productId == null}
              />
            </div>
            <div style={styles.fieldHalf}>
              <label style={styles.label} htmlFor="sale-total">
                Valor total (R$)
              </label>
              <input
                id="sale-total"
                type="number"
                min={0}
                step="0.01"
                value={totalValue}
                onChange={(e) => {
                  setTotalValue(e.target.value)
                  setTotalTouched(true)
                }}
                style={styles.input}
                disabled={submitting || productId == null}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="sale-note">
              Observação (opcional)
            </label>
            <input
              id="sale-note"
              type="text"
              placeholder="Ex.: pagamento em dinheiro, cliente VIP…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={styles.input}
              disabled={submitting}
            />
          </div>

          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button
              type="submit"
              style={{ ...styles.submitBtn, ...(submitting ? styles.submitBtnDisabled : {}) }}
              disabled={submitting || loadingProducts}
            >
              {submitting ? 'Registrando…' : 'Confirmar venda'}
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
    maxWidth: '520px',
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
    marginBottom: '20px',
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
    lineHeight: 1.4,
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    cursor: 'pointer',
    flexShrink: 0,
  },
  errorBanner: {
    marginBottom: '16px',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    fontSize: '13px',
  },
  field: {
    marginBottom: '16px',
  },
  fieldHalf: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    marginBottom: '8px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    padding: '10px 0',
    fontFamily: 'inherit',
    fontSize: '14px',
  },
  productList: {
    maxHeight: '200px',
    overflowY: 'auto' as const,
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
  },
  emptyList: {
    margin: 0,
    padding: '16px',
    fontSize: '13px',
    color: '#6b7280',
    textAlign: 'center' as const,
  },
  productOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '10px 12px',
    border: 'none',
    borderBottom: '1px solid #f3f4f6',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
  },
  productOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  productOptionDisabled: {
    opacity: 0.5,
    cursor: 'default' as const,
  },
  productOptionText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    minWidth: 0,
  },
  productName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  productMeta: {
    fontSize: '12px',
    color: '#6b7280',
  },
  selectedCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '10px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    marginBottom: '16px',
  },
  selectedName: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e40af',
  },
  selectedMeta: {
    display: 'block',
    fontSize: '12px',
    color: '#3b82f6',
    marginTop: '2px',
  },
  row: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    fontFamily: 'inherit',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    paddingTop: '8px',
    borderTop: '1px solid #f3f4f6',
  },
  cancelBtn: {
    padding: '10px 18px',
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
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#2563eb',
    cursor: 'pointer',
  },
  submitBtnDisabled: {
    opacity: 0.6,
    cursor: 'default' as const,
  },
} as const
