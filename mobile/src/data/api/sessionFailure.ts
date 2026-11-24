/** Credential rejection is not evidence that the current session JWT expired. */
export function shouldInvalidateSession(status: number | string, url: string | undefined, hasToken: boolean, demo: boolean): boolean {
  if (!hasToken || demo) return false;
  const route = (url ?? '').split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/i, '').replace(/\/+$/, '');
  if (/(?:^|\/)admin(?:\/|$)/.test(route)) return false;
  if (/(?:^|\/)auth\/(?:login|register|social(?:\/(?:complete|nonce))?|forgot-password|reset-password)$/.test(route)) return false;
  return status === 401 || (status === 404 && /(?:^|\/)auth\/me$/.test(route));
}
