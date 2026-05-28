import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  FiEdit2,
  FiExternalLink,
  FiPause,
  FiPlay,
  FiRefreshCw,
  FiTrash2,
  FiX,
} from 'react-icons/fi'
import { ProductImageThumb } from './ProductImageThumb'
import { getProductImageUrl } from '../lib/productImage'
import {
  buildProductUpdatePayload,
  getMercadoLivreInfo,
  hasMercadoLivreListing,
} from '../lib/productMercadoLivre'
import { formatRelative } from '../lib/relativeTime'
import { deleteProduct, getProduct, updateProduct } from '../services/productsApi'
import type { ProductDto } from '../types/product'

type ProductDetailDialogProps = {
  productId: number | null
  systemClientId: number
  initialProduct?: ProductDto | null
  onClose: () => void
  onChanged: () => void
}

type EditFields = {
  name: string
  sku: string
  description: string
  stock: string
  reserved_stock: string
  price: string
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const ML_STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: 'Ativo', bg: '#dcfce7', color: '#166534' },
  paused: { label: 'Pausado', bg: '#fef3c7', color: '#92400e' },
  closed: { label: 'Fechado', bg: '#fee2e2', color: '#991b1b' },
}

function toEditFields(p: ProductDto): EditFields {
  return {
    name: p.name,
    sku: p.sku,
    description: p.description,
    stock: String(p.stock),
    reserved_stock: String(p.reserved_stock),
    price: String(p.price),
  }
}

function validateEdit(fields: EditFields): string | null {
  if (!fields.name.trim()) return 'Nome é obrigatório.'
  if (!fields.sku.trim()) return 'SKU é obrigatório.'
  if (!fields.description.trim()) return 'Descrição é obrigatória.'
  const price = Number(fields.price)
  if (Number.isNaN(price) || price < 0) return 'Preço inválido.'
  const stock = Number(fields.stock)
  if (Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock)) return 'Estoque inválido.'
  const reserved = Number(fields.reserved_stock)
  if (Number.isNaN(reserved) || reserved < 0 || !Number.isInteger(reserved))
    return 'Estoque reservado inválido.'
  if (reserved > stock) return 'Estoque reservado não pode ser maior que o total.'
  return null
}

export function ProductDetailDialog({
  productId,
  systemClientId,
  initialProduct,
  onClose,
  onChanged,
}: ProductDetailDialogProps) {
  const [product, setProduct] = useState<ProductDto | null>(initialProduct ?? null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editFields, setEditFields] = useState<EditFields | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const loadProduct = useCallback(async () => {
    if (productId == null) return
    setLoading(true)
    setError(null)
    try {
      const fresh = await getProduct(systemClientId, productId)
      setProduct(fresh)
      setEditFields(toEditFields(fresh))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar produto.')
    } finally {
      setLoading(false)
    }
  }, [productId, systemClientId])

  useEffect(() => {
    if (productId == null) return
    setEditing(false)
    setConfirmDelete(false)
    setActionError(null)
    const cached = initialProduct?.id === productId ? initialProduct : null
    if (cached) {
      setProduct(cached)
      setEditFields(toEditFields(cached))
    } else {
      setProduct(null)
    }
    void loadProduct()
    // initialProduct só para exibição instantânea ao abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, systemClientId, loadProduct])

  if (productId == null) return null

  const mlInfo = product ? getMercadoLivreInfo(product) : null
  const mlLinked = product ? hasMercadoLivreListing(product) : false
  const mlStatusKey = mlInfo?.status?.toLowerCase() ?? ''
  const mlStatusCfg = ML_STATUS_LABELS[mlStatusKey] ?? {
    label: mlInfo?.status ?? '—',
    bg: '#f3f4f6',
    color: '#374151',
  }
  const availableQty =
    product != null ? Math.max(0, product.stock - product.reserved_stock) : 0
  const imageUrl = product != null ? getProductImageUrl(product) : null

  const handleStartEdit = () => {
    if (product == null) return
    setEditFields(toEditFields(product))
    setEditing(true)
    setActionError(null)
  }

  const handleCancelEdit = () => {
    if (product != null) setEditFields(toEditFields(product))
    setEditing(false)
    setActionError(null)
  }

  const handleSave = async () => {
    if (product == null || editFields == null) return
    const validationError = validateEdit(editFields)
    if (validationError) {
      setActionError(validationError)
      return
    }
    setSubmitting(true)
    setActionError(null)
    try {
      const payload = buildProductUpdatePayload(product, {
        name: editFields.name.trim(),
        sku: editFields.sku.trim(),
        description: editFields.description.trim(),
        stock: Number(editFields.stock),
        reserved_stock: Number(editFields.reserved_stock),
        price: Number(editFields.price),
      })
      const updated = await updateProduct(systemClientId, product.id, payload)
      setProduct(updated)
      setEditFields(toEditFields(updated))
      setEditing(false)
      onChanged()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (status: 'active' | 'paused') => {
    if (product == null) return
    setSubmitting(true)
    setActionError(null)
    try {
      const payload = buildProductUpdatePayload(
        product,
        {
          name: product.name,
          sku: product.sku,
          description: product.description,
          stock: product.stock,
          reserved_stock: product.reserved_stock,
          price: product.price,
        },
        status
      )
      const updated = await updateProduct(systemClientId, product.id, payload)
      setProduct(updated)
      setEditFields(toEditFields(updated))
      onChanged()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível alterar o status.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (product == null) return
    setSubmitting(true)
    setActionError(null)
    try {
      await deleteProduct(systemClientId, product.id)
      onChanged()
      onClose()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível excluir o produto.')
      setConfirmDelete(false)
    } finally {
      setSubmitting(false)
    }
  }

  const canPause =
    mlLinked && mlStatusKey === 'active' && availableQty > 0 && !submitting && !editing
  const canActivate = mlLinked && mlStatusKey === 'paused' && !submitting && !editing

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Detalhes do produto</h2>
            <p style={styles.subtitle}>
              {product != null ? `SKU ${product.sku}` : 'Carregando…'}
            </p>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            <FiX size={20} />
          </button>
        </div>

        {error != null && (
          <div style={styles.errorBanner}>
            {error}
            <button type="button" style={styles.retryLink} onClick={() => void loadProduct()}>
              Tentar novamente
            </button>
          </div>
        )}

        {actionError != null && <div style={styles.errorBanner}>{actionError}</div>}

        {loading && product == null ? (
          <div style={styles.loadingWrap}>
            <FiRefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Carregando produto…</span>
          </div>
        ) : product != null && editFields != null ? (
          <>
            <div style={styles.hero}>
              <ProductImageThumb src={imageUrl} alt={product.name} size={72} />
              <div style={styles.heroInfo}>
                {editing ? (
                  <input
                    style={styles.inputTitle}
                    value={editFields.name}
                    onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                    disabled={submitting}
                  />
                ) : (
                  <h3 style={styles.productName}>{product.name}</h3>
                )}
                <div style={styles.heroMeta}>
                  <span style={styles.priceTag}>{BRL.format(product.price)}</span>
                  {mlInfo != null && (
                    <span
                      style={{
                        ...styles.mlStatusBadge,
                        backgroundColor: mlStatusCfg.bg,
                        color: mlStatusCfg.color,
                      }}
                    >
                      ML · {mlStatusCfg.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.grid}>
              <InfoField label="SKU">
                {editing ? (
                  <input
                    style={styles.input}
                    value={editFields.sku}
                    onChange={(e) => setEditFields({ ...editFields, sku: e.target.value })}
                    disabled={submitting}
                  />
                ) : (
                  product.sku
                )}
              </InfoField>
              <InfoField label="Preço">
                {editing ? (
                  <input
                    style={styles.input}
                    type="number"
                    min={0}
                    step="0.01"
                    value={editFields.price}
                    onChange={(e) => setEditFields({ ...editFields, price: e.target.value })}
                    disabled={submitting}
                  />
                ) : (
                  BRL.format(product.price)
                )}
              </InfoField>
              <InfoField label="Estoque total">
                {editing ? (
                  <input
                    style={styles.input}
                    type="number"
                    min={0}
                    step={1}
                    value={editFields.stock}
                    onChange={(e) => setEditFields({ ...editFields, stock: e.target.value })}
                    disabled={submitting}
                  />
                ) : (
                  `${product.stock} un.`
                )}
              </InfoField>
              <InfoField label="Reservado">
                {editing ? (
                  <input
                    style={styles.input}
                    type="number"
                    min={0}
                    step={1}
                    value={editFields.reserved_stock}
                    onChange={(e) =>
                      setEditFields({ ...editFields, reserved_stock: e.target.value })
                    }
                    disabled={submitting}
                  />
                ) : (
                  `${product.reserved_stock} un.`
                )}
              </InfoField>
              <InfoField label="Disponível">{availableQty} un.</InfoField>
              <InfoField label="Adicionado">
                {product.created_at ? formatRelative(product.created_at) : '—'}
              </InfoField>
            </div>

            <div style={styles.section}>
              <span style={styles.sectionLabel}>Descrição</span>
              {editing ? (
                <textarea
                  style={styles.textarea}
                  rows={4}
                  value={editFields.description}
                  onChange={(e) =>
                    setEditFields({ ...editFields, description: e.target.value })
                  }
                  disabled={submitting}
                />
              ) : (
                <p style={styles.description}>{product.description || '—'}</p>
              )}
            </div>

            {mlInfo != null && (
              <div style={styles.mlSection}>
                <span style={styles.sectionLabel}>Mercado Livre</span>
                <div style={styles.mlRow}>
                  <span style={styles.mlLabel}>Item ID</span>
                  <span style={styles.mlValue}>{mlInfo.itemId}</span>
                </div>
                {mlInfo.categoryId != null && (
                  <div style={styles.mlRow}>
                    <span style={styles.mlLabel}>Categoria</span>
                    <span style={styles.mlValue}>{mlInfo.categoryId}</span>
                  </div>
                )}
                {mlInfo.permalink != null && (
                  <a
                    href={mlInfo.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.permalinkLink}
                  >
                    Ver anúncio no Mercado Livre
                    <FiExternalLink size={14} />
                  </a>
                )}
              </div>
            )}

            {!mlLinked && (
              <p style={styles.hint}>
                Este produto não possui anúncio no Mercado Livre. Edição e exclusão exigem
                sincronização com um anúncio ML.
              </p>
            )}

            {confirmDelete ? (
              <div style={styles.confirmBox}>
                <p style={styles.confirmText}>
                  Excluir <strong>{product.name}</strong>? O anúncio no Mercado Livre também será
                  removido.
                </p>
                <div style={styles.confirmActions}>
                  <button
                    type="button"
                    style={styles.cancelBtn}
                    onClick={() => setConfirmDelete(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    style={styles.dangerBtn}
                    onClick={() => void handleDelete()}
                    disabled={submitting}
                  >
                    {submitting ? 'Excluindo…' : 'Confirmar exclusão'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.actions}>
                {editing ? (
                  <>
                    <button
                      type="button"
                      style={styles.cancelBtn}
                      onClick={handleCancelEdit}
                      disabled={submitting}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.primaryBtn,
                        ...(submitting || !mlLinked ? styles.btnDisabled : {}),
                      }}
                      onClick={() => void handleSave()}
                      disabled={submitting || !mlLinked}
                    >
                      {submitting ? 'Salvando…' : 'Salvar alterações'}
                    </button>
                  </>
                ) : (
                  <>
                    {mlInfo?.permalink != null && (
                      <a
                        href={mlInfo.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.secondaryBtn}
                      >
                        <FiExternalLink size={16} />
                        Abrir no ML
                      </a>
                    )}
                    <button
                      type="button"
                      style={{
                        ...styles.secondaryBtn,
                        ...(!canPause ? styles.btnDisabled : {}),
                      }}
                      onClick={() => void handleStatusChange('paused')}
                      disabled={!canPause}
                      title={
                        !mlLinked
                          ? 'Produto sem anúncio ML'
                          : availableQty === 0
                            ? 'Estoque zerado pausa automaticamente'
                            : undefined
                      }
                    >
                      <FiPause size={16} />
                      Pausar
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.secondaryBtn,
                        ...(!canActivate ? styles.btnDisabled : {}),
                      }}
                      onClick={() => void handleStatusChange('active')}
                      disabled={!canActivate}
                    >
                      <FiPlay size={16} />
                      Reativar
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.secondaryBtn,
                        ...(!mlLinked || submitting ? styles.btnDisabled : {}),
                      }}
                      onClick={handleStartEdit}
                      disabled={!mlLinked || submitting}
                    >
                      <FiEdit2 size={16} />
                      Editar
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.dangerOutlineBtn,
                        ...(!mlLinked || submitting ? styles.btnDisabled : {}),
                      }}
                      onClick={() => setConfirmDelete(true)}
                      disabled={!mlLinked || submitting}
                    >
                      <FiTrash2 size={16} />
                      Excluir
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

function InfoField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={styles.infoField}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{children}</span>
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
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
    padding: '40px 0',
    color: '#6b7280',
    fontSize: '14px',
  },
  hero: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    alignItems: 'flex-start',
  },
  heroInfo: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '8px',
    lineHeight: 1.3,
  },
  inputTitle: {
    width: '100%',
    fontSize: '18px',
    fontWeight: 600,
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontFamily: 'inherit',
    marginBottom: '8px',
  },
  heroMeta: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    alignItems: 'center',
  },
  priceTag: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#059669',
  },
  mlStatusBadge: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '999px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px',
  },
  infoField: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    padding: '10px 12px',
    borderRadius: '10px',
    backgroundColor: '#f9fafb',
  },
  infoLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  input: {
    width: '100%',
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontFamily: 'inherit',
    fontSize: '14px',
  },
  section: {
    marginBottom: '16px',
  },
  sectionLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    marginBottom: '8px',
  },
  description: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: 1.5,
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    fontFamily: 'inherit',
    fontSize: '14px',
    resize: 'vertical' as const,
    minHeight: '80px',
  },
  mlSection: {
    marginBottom: '16px',
    padding: '14px 16px',
    borderRadius: '12px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
  },
  mlRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    fontSize: '13px',
    marginBottom: '6px',
  },
  mlLabel: {
    color: '#6b7280',
  },
  mlValue: {
    color: '#111827',
    fontWeight: 500,
    fontFamily: 'monospace',
  },
  permalinkLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '8px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#2563eb',
    textDecoration: 'none',
  },
  hint: {
    fontSize: '13px',
    color: '#92400e',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '16px',
    lineHeight: 1.4,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    paddingTop: '20px',
    borderTop: '1px solid #f3f4f6',
  },
  confirmBox: {
    marginTop: '16px',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
  },
  confirmText: {
    fontSize: '14px',
    color: '#991b1b',
    marginBottom: '12px',
    lineHeight: 1.4,
  },
  confirmActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  primaryBtn: {
    padding: '10px 18px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#2563eb',
    cursor: 'pointer',
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 14px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    textDecoration: 'none',
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
  dangerBtn: {
    padding: '10px 18px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#dc2626',
    cursor: 'pointer',
  },
  dangerOutlineBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 14px',
    borderRadius: '10px',
    border: '1px solid #fecaca',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    color: '#dc2626',
    cursor: 'pointer',
  },
  btnDisabled: {
    opacity: 0.45,
    cursor: 'default' as const,
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
  retryLink: {
    marginLeft: '8px',
    background: 'none',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    textDecoration: 'underline',
  },
} as const
