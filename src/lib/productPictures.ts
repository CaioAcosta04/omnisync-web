import type { ProductDto } from '../types/product'

const URL_REGEX = /^https?:\/\/.+/
const MAX_PICTURES = 10
const MAX_FILE_BYTES = 5 * 1024 * 1024

type ImageFormat = {
  contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
  extension: 'jpg' | 'png' | 'webp' | 'gif'
}

const JPEG_FORMAT: ImageFormat = { contentType: 'image/jpeg', extension: 'jpg' }
const PNG_FORMAT: ImageFormat = { contentType: 'image/png', extension: 'png' }
const WEBP_FORMAT: ImageFormat = { contentType: 'image/webp', extension: 'webp' }
const GIF_FORMAT: ImageFormat = { contentType: 'image/gif', extension: 'gif' }

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

function detectImageFormatFromBytes(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return JPEG_FORMAT
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return PNG_FORMAT
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return WEBP_FORMAT
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return GIF_FORMAT
  }

  return null
}

function formatFromContentType(contentType: string | undefined): ImageFormat | null {
  switch (contentType?.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return JPEG_FORMAT
    case 'image/png':
      return PNG_FORMAT
    case 'image/webp':
      return WEBP_FORMAT
    case 'image/gif':
      return GIF_FORMAT
    default:
      return null
  }
}

function extractBase64Payload(value: string): string {
  const commaIndex = value.indexOf(',')
  return value.startsWith('data:') && commaIndex >= 0 ? value.slice(commaIndex + 1) : value
}

function detectImageFormatFromBase64(value: string): ImageFormat | null {
  const prefix = extractBase64Payload(value).replace(/\s/g, '').slice(0, 32)
  if (!prefix) return null

  try {
    const decoded = atob(prefix.padEnd(Math.ceil(prefix.length / 4) * 4, '='))
    return detectImageFormatFromBytes(
      Uint8Array.from(decoded, (character) => character.charCodeAt(0))
    )
  } catch {
    return null
  }
}

function normalizeImageFileName(fileName: string | undefined, format: ImageFormat): string {
  const fallbackName = 'imagem-produto'
  const trimmed = fileName?.trim()
  const nameWithoutExtension = trimmed?.replace(/\.[^./\\]+$/, '')
  const baseName = nameWithoutExtension || fallbackName
  return `${baseName}.${format.extension}`
}

function normalizeDataUri(value: string, format: ImageFormat): string {
  return `data:${format.contentType};base64,${extractBase64Payload(value.trim())}`
}

function pictureFromDataUri(dataUri: string, fileName?: string): ProductPictureEntry {
  const trimmed = dataUri.trim()
  const match = /^data:([^;]+);base64,/i.exec(trimmed)
  const format = detectImageFormatFromBase64(trimmed)
    ?? formatFromContentType(match?.[1])
    ?? JPEG_FORMAT
  return {
    id: crypto.randomUUID(),
    previewUrl: normalizeDataUri(trimmed, format),
    base64: normalizeDataUri(trimmed, format),
    contentType: format.contentType,
    fileName: normalizeImageFileName(fileName, format),
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
    const declaredContentType =
      typeof img.content_type === 'string'
        ? img.content_type
        : typeof img.contentType === 'string'
          ? img.contentType
          : 'image/jpeg'
    const format = detectImageFormatFromBase64(rawBase64)
      ?? formatFromContentType(declaredContentType)
      ?? JPEG_FORMAT
    const previewUrl = normalizeDataUri(rawBase64, format)
    const fileName =
      typeof img.file_name === 'string'
        ? img.file_name
        : typeof img.fileName === 'string'
          ? img.fileName
          : undefined
    return {
      id: crypto.randomUUID(),
      previewUrl,
      base64: previewUrl,
      contentType: format.contentType,
      fileName: normalizeImageFileName(fileName, format),
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
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Imagem muito grande. Máximo 5 MB por arquivo.')
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const format = detectImageFormatFromBytes(header)
  if (!format) {
    throw new Error('Formato não suportado. Use JPEG, PNG, WebP ou GIF.')
  }

  const normalizedImage = new Blob([file], { type: format.contentType })
  const dataUri = await readFileAsDataUrl(normalizedImage)
  await assertImageMeetsMlRequirements(dataUri, file.name)

  return {
    id: crypto.randomUUID(),
    previewUrl: dataUri,
    base64: dataUri,
    contentType: format.contentType,
    fileName: normalizeImageFileName(file.name, format),
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

function readFileAsDataUrl(file: Blob): Promise<string> {
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
