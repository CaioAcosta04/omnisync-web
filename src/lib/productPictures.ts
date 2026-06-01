import type { ProductDto } from '../types/product'

const URL_REGEX = /^https?:\/\/.+/
const MAX_PICTURES = 10
const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

/** Requisito do Mercado Livre: mínimo 500 px em um dos lados (após processamento). */
export const ML_MIN_IMAGE_SIDE_PX = 500
export const ML_RECOMMENDED_IMAGE_PX = 1200

export const ML_IMAGE_HINT =
  `Mínimo ${ML_MIN_IMAGE_SIDE_PX} px no maior lado (recomendado ${ML_RECOMMENDED_IMAGE_PX}×${ML_RECOMMENDED_IMAGE_PX}). Evite bordas brancas grandes — o ML recorta até ~10%.`

export type ProductPictureEntry = {
  id: string
  previewUrl: string
  /** URL http(s) para ML via source */
  sourceUrl?: string
  /** data URI ou base64 puro para upload via backend */
  base64?: string
  contentType?: string
  fileName?: string
}

export type MercadoLivrePicturePayload = {
  source?: string
  base64?: string
  content_type?: string
  file_name?: string
}

export function createEmptyPicture(): ProductPictureEntry {
  return { id: crypto.randomUUID(), previewUrl: '' }
}

export function pictureFromUrl(url: string): ProductPictureEntry | null {
  const trimmed = url.trim()
  if (!URL_REGEX.test(trimmed)) return null
  return {
    id: crypto.randomUUID(),
    previewUrl: trimmed,
    sourceUrl: trimmed,
  }
}

function pictureFromDataUri(dataUri: string, fileName?: string): ProductPictureEntry {
  const trimmed = dataUri.trim()
  const match = /^data:([^;]+);base64,/i.exec(trimmed)
  const contentType = match?.[1] ?? 'image/jpeg'
  return {
    id: crypto.randomUUID(),
    previewUrl: trimmed,
    base64: trimmed,
    contentType,
    fileName: fileName ?? 'imagem-produto.jpg',
  }
}

/** Converte imagem persistida em resource.images para entrada do editor de fotos. */
export function pictureFromStoredImage(img: Record<string, unknown>): ProductPictureEntry | null {
  const url = typeof img.url === 'string' ? img.url.trim() : ''
  if (url) {
    const fromHttp = pictureFromUrl(url)
    if (fromHttp) return fromHttp
    if (url.startsWith('data:')) {
      const fileName =
        typeof img.file_name === 'string'
          ? img.file_name
          : typeof img.fileName === 'string'
            ? img.fileName
            : undefined
      return pictureFromDataUri(url, fileName)
    }
  }

  const rawBase64 = typeof img.base64 === 'string' ? img.base64.trim() : ''
  if (rawBase64) {
    const contentType =
      typeof img.content_type === 'string'
        ? img.content_type
        : typeof img.contentType === 'string'
          ? img.contentType
          : 'image/jpeg'
    const previewUrl = rawBase64.startsWith('data:')
      ? rawBase64
      : `data:${contentType};base64,${rawBase64}`
    return {
      id: crypto.randomUUID(),
      previewUrl,
      base64: previewUrl,
      contentType,
      fileName:
        typeof img.file_name === 'string'
          ? img.file_name
          : typeof img.fileName === 'string'
            ? img.fileName
            : 'imagem-produto.jpg',
    }
  }

  return null
}

/** Imagens já cadastradas no produto, prontas para reutilizar no anúncio ML. */
export function picturesFromProductResource(product: ProductDto): ProductPictureEntry[] {
  const images = product.resource?.images
  if (!Array.isArray(images)) return [createEmptyPicture()]

  const entries: ProductPictureEntry[] = []
  for (const img of images) {
    if (img == null || typeof img !== 'object') continue
    const entry = pictureFromStoredImage(img as Record<string, unknown>)
    if (entry) entries.push(entry)
  }
  return entries.length > 0 ? entries : [createEmptyPicture()]
}

function loadImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      reject(new Error('Não foi possível carregar a imagem para verificar o tamanho.'))
    }
    img.src = src
  })
}

export function validateImageDimensions(width: number, height: number): string | null {
  const longest = Math.max(width, height)
  if (longest < ML_MIN_IMAGE_SIDE_PX) {
    return `A imagem precisa ter pelo menos ${ML_MIN_IMAGE_SIDE_PX} px em um dos lados (enviada: ${width}×${height} px). Recomendado: ${ML_RECOMMENDED_IMAGE_PX}×${ML_RECOMMENDED_IMAGE_PX} px para o Mercado Livre.`
  }
  return null
}

async function assertImageMeetsMlRequirements(src: string, label: string): Promise<void> {
  const { width, height } = await loadImageDimensions(src)
  const error = validateImageDimensions(width, height)
  if (error) {
    throw new Error(`${label}: ${error}`)
  }
}

export async function pictureFromFile(file: File): Promise<ProductPictureEntry> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error('Formato não suportado. Use JPEG, PNG, WebP ou GIF.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Imagem muito grande. Máximo 5 MB por arquivo.')
  }

  const dataUri = await readFileAsDataUrl(file)
  await assertImageMeetsMlRequirements(dataUri, file.name)

  return {
    id: crypto.randomUUID(),
    previewUrl: dataUri,
    base64: dataUri,
    contentType: file.type,
    fileName: file.name,
  }
}

/** Valida dimensões de URL remota (pode falhar por CORS — retorna aviso, não erro fatal). */
export async function validatePictureUrlDimensions(url: string): Promise<string | null> {
  try {
    const { width, height } = await loadImageDimensions(url)
    return validateImageDimensions(width, height)
  } catch {
    return null
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Não foi possível ler a imagem.'))
    }
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

export function isPictureComplete(entry: ProductPictureEntry): boolean {
  return Boolean(entry.sourceUrl?.trim() || entry.base64?.trim())
}

export function validatePictures(
  entries: ProductPictureEntry[],
  required: boolean
): string | null {
  const complete = entries.filter(isPictureComplete)
  if (required && complete.length === 0) {
    return 'Adicione ao menos uma foto (upload ou URL).'
  }
  if (entries.length > MAX_PICTURES) {
    return `Máximo de ${MAX_PICTURES} fotos.`
  }
  for (const entry of entries) {
    if (entry.previewUrl && !isPictureComplete(entry)) {
      return 'Informe uma URL válida (http/https) ou remova a linha vazia.'
    }
  }
  return null
}

export function toMercadoLivrePictures(entries: ProductPictureEntry[]): MercadoLivrePicturePayload[] {
  return entries.filter(isPictureComplete).map((entry) => {
    if (entry.sourceUrl?.trim()) {
      return { source: entry.sourceUrl.trim() }
    }
    return {
      base64: entry.base64!,
      ...(entry.contentType ? { content_type: entry.contentType } : {}),
      ...(entry.fileName ? { file_name: entry.fileName } : {}),
    }
  })
}

export function toResourceImages(entries: ProductPictureEntry[]): Array<{ url: string }> {
  return entries
    .filter(isPictureComplete)
    .map((entry) => ({ url: entry.previewUrl }))
}

export const PICTURE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
