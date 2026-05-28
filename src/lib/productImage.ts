import type { ProductDto } from '../types/product'

type PictureLike = Record<string, unknown>

function pickUrl(obj: PictureLike | null | undefined): string | null {
  if (obj == null) return null
  for (const key of ['secure_url', 'url', 'source', 'previewUrl', 'preview_url']) {
    const val = obj[key]
    if (typeof val === 'string' && val.trim()) return val.trim()
  }
  return null
}

function picturesFrom(value: unknown): PictureLike[] {
  if (!Array.isArray(value)) return []
  return value.filter((p): p is PictureLike => p != null && typeof p === 'object')
}

/** Primeira URL de imagem utilizável para exibir no card/lista. */
export function getProductImageUrl(product: ProductDto): string | null {
  const resource = product.resource
  if (resource == null) return null

  const rootImages = picturesFrom(resource.images)
  for (const pic of rootImages) {
    const url = pickUrl(pic)
    if (url) return url
  }

  const ml = resource.mercado_livre as Record<string, unknown> | undefined
  if (ml != null) {
    for (const pic of picturesFrom(ml.pictures)) {
      const url = pickUrl(pic)
      if (url) return url
    }

    const raw = ml.raw as Record<string, unknown> | undefined
    if (raw != null) {
      for (const pic of picturesFrom(raw.pictures)) {
        const url = pickUrl(pic)
        if (url) return url
      }
      const thumbnail = raw.thumbnail
      if (typeof thumbnail === 'string' && thumbnail.trim()) return thumbnail.trim()
    }

    const thumbnail = ml.thumbnail
    if (typeof thumbnail === 'string' && thumbnail.trim()) return thumbnail.trim()
  }

  return null
}
