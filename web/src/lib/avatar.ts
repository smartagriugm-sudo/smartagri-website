// Profile picture crop maths, kept free of Supabase so it can be tested on its own.
// Storage and saving live in lib/profile.ts.

export interface AvatarCrop {
  /** 1 = the image just covers the circle; up to MAX_AVATAR_ZOOM. */
  zoom: number
  /** Offset of the image centre from the circle centre, as a fraction of the circle size. */
  x: number
  y: number
}

export const DEFAULT_CROP: AvatarCrop = { zoom: 1, x: 0, y: 0 }
export const MAX_AVATAR_ZOOM = 4
export const AVATAR_OUTPUT = 512
export const MAX_AVATAR_BYTES = 10 * 1024 * 1024

export function cropFromUrl(url: string | null | undefined): AvatarCrop {
  if (!url) return DEFAULT_CROP
  try {
    const q = new URL(url).searchParams
    const zoom = Number(q.get('z'))
    const x = Number(q.get('x'))
    const y = Number(q.get('y'))
    if (!Number.isFinite(zoom) || zoom < 1) return DEFAULT_CROP
    return { zoom: Math.min(zoom, MAX_AVATAR_ZOOM), x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 }
  } catch {
    return DEFAULT_CROP
  }
}

/**
 * Keep the image covering the circle: the offset may not exceed half the
 * overflow on each axis. w/h are the image's natural size; offsets are
 * fractions of the circle size.
 */
export function clampCrop(crop: AvatarCrop, w: number, h: number): AvatarCrop {
  const zoom = Math.min(Math.max(crop.zoom, 1), MAX_AVATAR_ZOOM)
  const cover = 1 / Math.min(w, h) // circle size 1
  const maxX = Math.max(0, (w * cover * zoom - 1) / 2)
  const maxY = Math.max(0, (h * cover * zoom - 1) / 2)
  const clamp = (v: number, m: number) => Math.min(Math.max(v, -m), m)
  return { zoom, x: clamp(crop.x, maxX), y: clamp(crop.y, maxY) }
}

/** Draw the cropped square on a canvas; returns a WebP blob. */
export async function renderAvatar(img: HTMLImageElement, crop: AvatarCrop, size = AVATAR_OUTPUT): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  const scale = (size / Math.min(img.naturalWidth, img.naturalHeight)) * crop.zoom
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, size / 2 + crop.x * size - w / 2, size / 2 + crop.y * size - h / 2, w, h)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9))
  if (!blob) throw new Error('Could not create the image')
  return blob
}
