const URL_REGEX = /^https?:\/\/.+/
const MAX_PICTURES = 10
const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

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

export async function pictureFromFile(file: File): Promise<ProductPictureEntry> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error('Formato não suportado. Use JPEG, PNG, WebP ou GIF.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Imagem muito grande. Máximo 5 MB por arquivo.')
  }

  const dataUri = await readFileAsDataUrl(file)
  return {
    id: crypto.randomUUID(),
    previewUrl: dataUri,
    base64: dataUri,
    contentType: file.type,
    fileName: file.name,
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
