import { useMemo, useState } from 'react'
import { FiPackage, FiSearch, FiX } from 'react-icons/fi'
import { ProductImageThumb } from './ProductImageThumb'
import { getProductImageUrl } from '../lib/productImage'
import type { ProductDto } from '../types/product'

type SelectProductToAnnounceModalProps = {
  open: boolean
  products: ProductDto[]
  onClose: () => void
  onSelect: (product: ProductDto) => void
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function SelectProductToAnnounceModal({
  open,
  products,
  onClose,
  onSelect,
}: SelectProductToAnnounceModalProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return products
    const q = query.toLowerCase()
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    )
  }, [products, query])

  if (!open) return null

  const handleClose = () => {
    setQuery('')
    onClose()
  }

  const handleSelect = (product: ProductDto) => {
    setQuery('')
    onSelect(product)
  }

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Selecionar produto</h2>
            <p style={styles.subtitle}>
              Escolha um produto da loja para publicar no Mercado Livre.
            </p>
          </div>
          <button type="button" style={styles.closeBtn} onClick={handleClose} aria-label="Fechar">
            <FiX size={20} />
          </button>
        </div>

        <div style={styles.searchWrap}>
          <FiSearch size={16} color="#9ca3af" />
          <input
            type="text"
            placeholder="Buscar por nome ou SKU..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={styles.searchInput}
            autoFocus
          />
        </div>

        {products.length === 0 ? (
          <div style={styles.emptyWrap}>
            <FiPackage size={32} color="#9ca3af" />
            <p style={styles.emptyText}>
              Nenhum produto disponível para anunciar. Cadastre um produto na tela de Estoque
              sem marcar a opção de anúncio automático.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyWrap}>
            <p style={styles.emptyText}>Nenhum produto encontrado para &quot;{query}&quot;.</p>
          </div>
        ) : (
          <ul style={styles.list}>
            {filtered.map((product) => {
              const available = Math.max(0, product.stock - product.reserved_stock)
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    style={styles.itemBtn}
                    onClick={() => handleSelect(product)}
                  >
                    <ProductImageThumb
                      src={getProductImageUrl(product)}
                      alt={product.name}
                      size={44}
                    />
                    <div style={styles.itemInfo}>
                      <span style={styles.itemName}>{product.name}</span>
                      <span style={styles.itemMeta}>
                        SKU {product.sku} · {available} un. · {BRL.format(product.price)}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
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
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    padding: '28px 32px 24px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '20px',
    flexShrink: 0,
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
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    marginBottom: '16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: 'transparent',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    overflowY: 'auto' as const,
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  itemBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
    transition: 'background-color 0.12s, border-color 0.12s',
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  itemName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  itemMeta: {
    fontSize: '12px',
    color: '#6b7280',
  },
  emptyWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
    padding: '32px 16px',
    textAlign: 'center' as const,
  },
  emptyText: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.5,
    maxWidth: '360px',
  },
} as const
