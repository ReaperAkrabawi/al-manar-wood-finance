export function stripUndefined<T extends Record<string, unknown>>(data: T): T {
  const out = { ...data };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

export function toFirestoreDoc<T extends Record<string, unknown>>(data: T): T {
  return stripUndefined(data);
}
