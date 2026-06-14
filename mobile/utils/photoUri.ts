export function isPhotoUrl(photo: string): boolean {
  return photo.startsWith('http://') || photo.startsWith('https://');
}

export function resolvePhotoUri(photo?: string): string | undefined {
  if (!photo) return undefined;
  if (isPhotoUrl(photo)) return photo;
  return `data:image/jpeg;base64,${photo}`;
}

export function isBase64Photo(photo?: string): boolean {
  return !!photo && !isPhotoUrl(photo);
}
