export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}

export function genInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
