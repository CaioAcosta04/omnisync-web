// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { pictureFromStoredImage, toMercadoLivrePictures } from './productPictures'

describe('productPictures', () => {
  it('normalizes a JPEG whose stored MIME and extension say PNG', () => {
    const jpegHeader = Uint8Array.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ])
    const encoded = btoa(String.fromCharCode(...jpegHeader))

    const picture = pictureFromStoredImage({
      url: `data:image/png;base64,${encoded}`,
      file_name: 'garrafa.png',
    })

    expect(picture).not.toBeNull()
    expect(picture).toMatchObject({
      contentType: 'image/jpeg',
      fileName: 'garrafa.jpg',
      base64: `data:image/jpeg;base64,${encoded}`,
    })
    expect(toMercadoLivrePictures([picture!])).toEqual([
      {
        base64: `data:image/jpeg;base64,${encoded}`,
        content_type: 'image/jpeg',
        file_name: 'garrafa.jpg',
      },
    ])
  })
})
