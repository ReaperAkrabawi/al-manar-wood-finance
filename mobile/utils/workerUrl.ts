export function getWorkerBaseUrl(): string | undefined {
  const url = process.env.EXPO_PUBLIC_UPLOAD_WORKER_URL?.trim();
  return url || undefined;
}

export function isWorkerConfigured(): boolean {
  return Boolean(getWorkerBaseUrl());
}
