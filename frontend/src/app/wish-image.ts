export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export function imageFileError(file: { type: string; size: number }): string | null {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return 'Elige una imagen JPG, PNG o WebP.';
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return 'La imagen debe ocupar como máximo 5 MB.';
  return null;
}

// Decode locally, resize and re-encode: never load a product URL or render SVG.
export async function prepareWishImage(file: File): Promise<string> {
  const error = imageFileError(file);
  if (error) throw new Error(error);
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40_000_000) throw new Error('La imagen es demasiado grande o no es válida.');
    const ratio = Math.min(1,1200 / Math.max(bitmap.width,bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1,Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1,Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la imagen.');
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/webp',0.82);
  } finally { bitmap.close(); }
}
