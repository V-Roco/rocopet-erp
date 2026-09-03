// Achica y comprime una imagen en el navegador antes de subirla. Las fotos
// de celular pueden pesar 10-15MB en crudo, pero en el sistema solo se
// muestran como miniatura — no tiene sentido guardarlas ni subirlas a
// resolución completa.
export async function compressImage(file: File, maxDimension = 1024, quality = 0.8): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    // Los GIF (posiblemente animados) se suben tal cual, sin recomprimir.
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}
