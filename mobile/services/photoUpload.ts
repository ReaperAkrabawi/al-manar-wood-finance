import type { User } from 'firebase/auth';

const WORKER_URL = process.env.EXPO_PUBLIC_UPLOAD_WORKER_URL;

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function uploadPhotoFromBase64(
  workspaceId: string,
  entryType: 'income' | 'purchases',
  entryId: string,
  base64: string,
  user: User,
): Promise<string> {
  if (!WORKER_URL) {
    throw new Error('Photo upload worker is not configured');
  }

  const idToken = await user.getIdToken();
  const bytes = base64ToBytes(base64);

  const response = await fetch(`${WORKER_URL.replace(/\/$/, '')}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'image/jpeg',
      'X-Workspace-Id': workspaceId,
      'X-Entry-Type': entryType,
      'X-Entry-Id': entryId,
    },
    body: bytes as unknown as BodyInit,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Upload failed (${response.status})`);
  }

  const data = (await response.json()) as { url: string };
  return data.url;
}

export async function deletePhoto(
  workspaceId: string,
  entryType: 'income' | 'purchases',
  entryId: string,
  user: User,
): Promise<void> {
  if (!WORKER_URL) return;

  const idToken = await user.getIdToken();
  await fetch(`${WORKER_URL.replace(/\/$/, '')}/photo`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workspaceId, entryType, entryId }),
  });
}

export function isPhotoUploadConfigured(): boolean {
  return Boolean(WORKER_URL);
}
