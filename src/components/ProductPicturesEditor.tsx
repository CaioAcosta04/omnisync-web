import { useRef, useState } from 'react'
import { FiImage, FiPlus, FiTrash2, FiUpload } from 'react-icons/fi'
import {
  createEmptyPicture,
  isPictureComplete,
  PICTURE_ACCEPT,
  pictureFromFile,
  pictureFromUrl,
  type ProductPictureEntry,
} from '../lib/productPictures'

type ProductPicturesEditorProps = {
  entries: ProductPictureEntry[]
  onChange: (entries: ProductPictureEntry[]) => void
  error?: string
  required?: boolean
}

export function ProductPicturesEditor({
  entries,
  onChange,
  error,
  required = false,
}: ProductPicturesEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const updateEntry = (id: string, patch: Partial<ProductPictureEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  const removeEntry = (id: string) => {
    if (entries.length === 1) {
      onChange([createEmptyPicture()])
      return
    }
    onChange(entries.filter((e) => e.id !== id))
  }

  const addEntry = () => onChange([...entries, createEmptyPicture()])

  const handleFiles = async (files: FileList | null) => {
    if (files == null || files.length === 0) return
    setUploadError(null)
    try {
      const uploaded: ProductPictureEntry[] = []
      for (const file of Array.from(files)) {
        uploaded.push(await pictureFromFile(file))
      }
      const withoutEmpty = entries.filter(isPictureComplete)
      onChange([...withoutEmpty, ...uploaded])
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Erro ao carregar imagem.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleUrlBlur = (entry: ProductPictureEntry, rawUrl: string) => {
    const trimmed = rawUrl.trim()
    if (!trimmed) {
      updateEntry(entry.id, {
        previewUrl: '',
        sourceUrl: undefined,
        base64: undefined,
        contentType: undefined,
        fileName: undefined,
      })
      return
    }
    const parsed = pictureFromUrl(trimmed)
    if (parsed) {
      updateEntry(entry.id, {
        previewUrl: parsed.previewUrl,
        sourceUrl: parsed.sourceUrl,
        base64: undefined,
        contentType: undefined,
        fileName: undefined,
      })
    } else {
      updateEntry(entry.id, { previewUrl: trimmed })
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.toolbar}>
        <button
          type="button"
          style={styles.uploadBtn}
          onClick={() => fileInputRef.current?.click()}
        >
          <FiUpload size={14} />
          Enviar imagem
        </button>
        <button type="button" style={styles.addUrlBtn} onClick={addEntry}>
          <FiPlus size={14} />
          Adicionar URL
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={PICTURE_ACCEPT}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      <p style={styles.hint}>
        JPEG, PNG, WebP ou GIF — até 5 MB. O backend envia para o Mercado Livre automaticamente.
      </p>

      {uploadError ? (
        <p style={styles.inlineError} role="alert">
          {uploadError}
        </p>
      ) : null}

      <div style={styles.list}>
        {entries.map((entry) => (
          <div key={entry.id} style={styles.row}>
            <div style={styles.thumb}>
              {isPictureComplete(entry) ? (
                <img src={entry.previewUrl} alt="" style={styles.thumbImg} />
              ) : (
                <FiImage size={20} color="#9ca3af" />
              )}
            </div>
            <div style={styles.urlWrap}>
              <input
                type="url"
                placeholder="https://... (opcional se fez upload)"
                value={entry.sourceUrl ?? (entry.base64 ? '' : entry.previewUrl)}
                onChange={(e) => updateEntry(entry.id, { previewUrl: e.target.value, sourceUrl: e.target.value })}
                onBlur={(e) => handleUrlBlur(entry, e.target.value)}
                style={styles.input}
              />
              {entry.fileName ? (
                <span style={styles.fileTag}>{entry.fileName}</span>
              ) : null}
            </div>
            <button
              type="button"
              style={styles.removeBtn}
              onClick={() => removeEntry(entry.id)}
              aria-label="Remover foto"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {error ? (
        <span style={styles.errorMsg}>
          {error}
          {required ? '' : ''}
        </span>
      ) : null}
    </div>
  )
}

const styles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  uploadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  addUrlBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px dashed #d1d5db',
    backgroundColor: 'transparent',
    color: '#374151',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  hint: {
    margin: 0,
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.4,
  },
  inlineError: {
    margin: 0,
    fontSize: '12px',
    color: '#991b1b',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  thumb: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden' as const,
    flexShrink: 0,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  urlWrap: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontFamily: 'inherit',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  },
  fileTag: {
    fontSize: '11px',
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  removeBtn: {
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
  errorMsg: {
    fontSize: '12px',
    color: '#dc2626',
    fontWeight: 500,
  },
} as const
