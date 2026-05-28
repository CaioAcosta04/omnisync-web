import { useState } from 'react'
import { FiImage } from 'react-icons/fi'

type ProductImageThumbProps = {
  src: string | null | undefined
  alt: string
  size?: number
}

export function ProductImageThumb({ src, alt, size = 40 }: ProductImageThumbProps) {
  const [failed, setFailed] = useState(false)
  const showImage = src != null && src.length > 0 && !failed

  return (
    <div
      style={{
        ...styles.wrap,
        width: size,
        height: size,
        minWidth: size,
      }}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          style={styles.img}
        />
      ) : (
        <FiImage size={Math.round(size * 0.45)} color="#9ca3af" aria-hidden />
      )}
    </div>
  )
}

const styles = {
  wrap: {
    borderRadius: '10px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden' as const,
  },
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block',
  },
} as const
