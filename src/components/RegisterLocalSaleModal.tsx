import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi'
import { ProductImageThumb } from './ProductImageThumb'
import { getProductImageUrl } from '../lib/productImage'
import type { ProductDto } from '../types/product'

export type LocalSaleLineItem = {
  productId: number
  quantity: number
  totalValue: number
}

export type LocalSaleFormData = {
  items: LocalSaleLineItem[]
  note: string
}

type CartEntry = {
  productId: number
  quantity: string
  totalValue: string
  totalTouched: boolean
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

function suggestedLineTotal(product: ProductDto, quantity: number): number {
  return product.price * quantity
}

export function RegisterLocalSaleModal(props: RegisterLocalSaleModalProps) {
  if (!props.open) return null
  return <RegisterLocalSaleModalContent {...props} />
}

function RegisterLocalSaleModalContent({
  products,
  loadingProducts = false,
  submitting = false,
  errorMessage = null,
  onClose,
  onSubmit,
}: RegisterLocalSaleModalProps) {
  const [search, setSearch] = useState('')
  const [addQuantity, setAddQuantity] = useState('1')
  const [cart, setCart] = useState<CartEntry[]>([])
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setSearch('')
    setAddQuantity('1')
    setCart([])
    setNote('')
    setFormError(null)
  }, [])

  useEffect(() => {
    if (open) {
      // Use Promise.resolve() para batching do setState, evitando cascading renders
      Promise.resolve().then(resetForm)
    }
  }, [open, resetForm])

  const productsById = useMemo(() => {
    const map = new Map<number, ProductDto>()
    for (const p of products) map.set(p.id, p)
    return map
  }, [products])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    )
  }, [products, search])

  const cartProductIds = useMemo(() => new Set(cart.map((c) => c.productId)), [cart])

  const orderTotal = useMemo(() => {
    return cart.reduce((sum, entry) => {
      const total = Number(entry.totalValue)
      return sum + (Number.isNaN(total) ? 0 : total)
    }, 0)
  }, [cart])

  const addToCart = (product: ProductDto) => {
    setFormError(null)
    const qty = Number(addQuantity)
    if (!Number.isInteger(qty) || qty <= 0) {
      setFormError('Informe uma quantidade válida para adicionar.')
      return
    }

    const available = availableQty(product)
    const existing = cart.find((c) => c.productId === product.id)
    const currentQty = existing ? Number(existing.quantity) || 0 : 0
    const newQty = currentQty + qty

    if (newQty > available) {
      setFormError(
        `Estoque insuficiente para ${product.name}. Disponível: ${available} un.${existing ? ` (${currentQty} já no pedido)` : ''}`,
      )
      return
    }

    const suggested = suggestedLineTotal(product, newQty)

    setCart((prev) => {
      if (existing) {
        return prev.map((entry) =>
          entry.productId === product.id
            ? {
                ...entry,
                quantity: String(newQty),
                totalValue: entry.totalTouched ? entry.totalValue : suggested.toFixed(2),
              }
            : entry,
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          quantity: String(qty),
          totalValue: suggested.toFixed(2),
          totalTouched: false,
        },
      ]
    })
  }

  const updateCartEntry = (productId: number, patch: Partial<CartEntry>) => {
    setFormError(null)
    setCart((prev) =>
      prev.map((entry) => (entry.productId === productId ? { ...entry, ...patch } : entry)),
    )
  }

  const removeFromCart = (productId: number) => {
    setFormError(null)
    setCart((prev) => prev.filter((entry) => entry.productId !== productId))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (cart.length === 0) {
      setFormError('Adicione ao menos um produto ao pedido.')
      return
    }

    const items: LocalSaleLineItem[] = []
    const usedStock = new Map<number, number>()

    for (const entry of cart) {
      const product = productsById.get(entry.productId)
      if (product == null) {
        setFormError('Produto inválido no pedido.')
        return
      }

      const qty = Number(entry.quantity)
      if (!Number.isInteger(qty) || qty <= 0) {
        setFormError(`Quantidade inválida para ${product.name}.`)
        return
      }

      const total = Number(entry.totalValue)
      if (Number.isNaN(total) || total < 0) {
        setFormError(`Valor inválido para ${product.name}.`)
        return
      }

      const available = availableQty(product)
      const accumulated = (usedStock.get(product.id) ?? 0) + qty
      if (accumulated > available) {
        setFormError(`Estoque insuficiente para ${product.name}. Disponível: ${available} un.`)
        return
      }
      usedStock.set(product.id, accumulated)

      items.push({
        productId: product.id,
        quantity: qty,
        totalValue: total,
      })
    }

    void onSubmit({ items, note: note.trim() })
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Registrar venda na loja</h2>
            <p style={styles.subtitle}>
              Adicione quantos produtos quiser. O estoque é baixado e sincronizado com o Mercado
              Livre, se houver anúncio.
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
            <label style={styles.label}>Adicionar produtos</label>
            <div style={styles.addRow}>
              <div style={{ ...styles.searchWrap, flex: 1 }}>
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
              <div style={styles.addQtyWrap}>
                <label style={styles.addQtyLabel} htmlFor="add-quantity">
                  Qtd.
                </label>
                <input
                  id="add-quantity"
                  type="number"
                  min={1}
                  step={1}
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(e.target.value)}
                  style={styles.addQtyInput}
                  disabled={submitting || loadingProducts}
                />
              </div>
            </div>
            <div style={styles.productList}>
              {loadingProducts ? (
                <p style={styles.emptyList}>Carregando produtos…</p>
              ) : filteredProducts.length === 0 ? (
                <p style={styles.emptyList}>Nenhum produto encontrado.</p>
              ) : (
                filteredProducts.map((product) => {
                  const available = availableQty(product)
                  const inCart = cartProductIds.has(product.id)
                  const disabled = available === 0
                  return (
                    <div
                      key={product.id}
                      style={{
                        ...styles.productOption,
                        ...(inCart ? styles.productOptionInCart : {}),
                        ...(disabled ? styles.productOptionDisabled : {}),
                      }}
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
                      <button
                        type="button"
                        style={{
                          ...styles.addBtn,
                          ...(disabled || submitting ? styles.addBtnDisabled : {}),
                        }}
                        onClick={() => addToCart(product)}
                        disabled={submitting || disabled}
                        title={disabled ? 'Sem estoque' : 'Adicionar ao pedido'}
                      >
                        <FiPlus size={14} />
                        {inCart ? 'Mais' : 'Adicionar'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div style={styles.field}>
            <div style={styles.cartHeader}>
              <label style={styles.label}>Itens da venda</label>
              {cart.length > 0 && (
                <span style={styles.cartCount}>
                  {cart.length} {cart.length === 1 ? 'item' : 'itens'}
                </span>
              )}
            </div>

            {cart.length === 0 ? (
              <div style={styles.cartEmpty}>
                Nenhum produto adicionado. Use a lista acima para montar o pedido.
              </div>
            ) : (
              <div style={styles.cartList}>
                {cart.map((entry) => {
                  const product = productsById.get(entry.productId)
                  if (product == null) return null
                  const qty = Number(entry.quantity)
                  const suggested =
                    !Number.isNaN(qty) && qty > 0 ? suggestedLineTotal(product, qty) : null

                  return (
                    <div key={entry.productId} style={styles.cartItem}>
                      <div style={styles.cartItemTop}>
                        <ProductImageThumb
                          src={getProductImageUrl(product)}
                          alt={product.name}
                          size={32}
                        />
                        <div style={styles.cartItemInfo}>
                          <span style={styles.cartItemName}>{product.name}</span>
                          <span style={styles.cartItemMeta}>
                            {BRL.format(product.price)} / un. · {availableQty(product)} disp.
                          </span>
                        </div>
                        <button
                          type="button"
                          style={styles.removeBtn}
                          onClick={() => removeFromCart(entry.productId)}
                          disabled={submitting}
                          aria-label={`Remover ${product.name}`}
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                      <div style={styles.cartItemFields}>
                        <div style={styles.cartField}>
                          <label style={styles.cartFieldLabel}>Qtd.</label>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={entry.quantity}
                            onChange={(e) => {
                              const nextQty = e.target.value
                              const parsed = Number(nextQty)
                              updateCartEntry(entry.productId, {
                                quantity: nextQty,
                                totalTouched: false,
                                totalValue:
                                  !Number.isNaN(parsed) && parsed > 0
                                    ? suggestedLineTotal(product, parsed).toFixed(2)
                                    : entry.totalValue,
                              })
                            }}
                            style={styles.cartInput}
                            disabled={submitting}
                          />
                        </div>
                        <div style={{ ...styles.cartField, flex: 1 }}>
                          <label style={styles.cartFieldLabel}>Subtotal (R$)</label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={entry.totalValue}
                            onChange={(e) =>
                              updateCartEntry(entry.productId, {
                                totalValue: e.target.value,
                                totalTouched: true,
                              })
                            }
                            style={styles.cartInput}
                            disabled={submitting}
                          />
                        </div>
                      </div>
                      {suggested != null &&
                        entry.totalTouched &&
                        Number(entry.totalValue) !== suggested && (
                          <button
                            type="button"
                            style={styles.suggestLink}
                            onClick={() =>
                              updateCartEntry(entry.productId, {
                                totalValue: suggested.toFixed(2),
                                totalTouched: false,
                              })
                            }
                          >
                            Usar sugerido: {BRL.format(suggested)}
                          </button>
                        )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div style={styles.orderTotalRow}>
              <span style={styles.orderTotalLabel}>Total do pedido</span>
              <span style={styles.orderTotalValue}>{BRL.format(orderTotal)}</span>
            </div>
          )}

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
              disabled={submitting || loadingProducts || cart.length === 0}
            >
              {submitting
                ? 'Registrando…'
                : cart.length > 1
                  ? `Confirmar ${cart.length} itens`
                  : 'Confirmar venda'}
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
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px',
  },
  addRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '8px',
    alignItems: 'flex-end',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    padding: '10px 0',
    fontFamily: 'inherit',
    fontSize: '14px',
  },
  addQtyWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    flexShrink: 0,
  },
  addQtyLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6b7280',
  },
  addQtyInput: {
    width: '64px',
    padding: '10px 8px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    fontFamily: 'inherit',
    fontSize: '14px',
    textAlign: 'center' as const,
    boxSizing: 'border-box' as const,
  },
  productList: {
    maxHeight: '180px',
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
    textAlign: 'left' as const,
    fontFamily: 'inherit',
  },
  productOptionInCart: {
    backgroundColor: '#f9fafb',
  },
  productOptionDisabled: {
    opacity: 0.5,
  },
  productOptionText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    minWidth: 0,
    flex: 1,
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
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid #bfdbfe',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    fontFamily: 'inherit',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
  addBtnDisabled: {
    opacity: 0.5,
    cursor: 'default' as const,
  },
  cartHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  cartCount: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
  },
  cartEmpty: {
    padding: '20px 16px',
    borderRadius: '10px',
    border: '1px dashed #d1d5db',
    fontSize: '13px',
    color: '#6b7280',
    textAlign: 'center' as const,
    lineHeight: 1.4,
  },
  cartList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  cartItem: {
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#fafafa',
  },
  cartItemTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  cartItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  cartItemName: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  cartItemMeta: {
    display: 'block',
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  removeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    backgroundColor: '#ffffff',
    color: '#dc2626',
    cursor: 'pointer',
    flexShrink: 0,
  },
  cartItemFields: {
    display: 'flex',
    gap: '10px',
  },
  cartField: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  cartFieldLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6b7280',
  },
  cartInput: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontFamily: 'inherit',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    backgroundColor: '#ffffff',
  },
  suggestLink: {
    marginTop: '6px',
    padding: 0,
    border: 'none',
    background: 'none',
    fontFamily: 'inherit',
    fontSize: '12px',
    fontWeight: 500,
    color: '#2563eb',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  orderTotalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    marginBottom: '16px',
    borderRadius: '10px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
  },
  orderTotalLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e40af',
  },
  orderTotalValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1e3a8a',
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
