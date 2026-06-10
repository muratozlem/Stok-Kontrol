export function hashPassword(password: string): string {
  const input = password + '_stokapp_salt_2024';
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  let result = '';
  const seed = Math.abs(hash);
  let h1 = seed, h2 = seed ^ 0x6b8b4567, h3 = seed ^ 0x327b23c6, h4 = seed ^ 0x643c9869;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = (h1 ^ c) * 0x01000193;
    h2 = (h2 ^ c) * 0x01000193;
    h3 = (h3 ^ c) * 0x01000193;
    h4 = (h4 ^ c) * 0x01000193;
  }
  for (const p of [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]) {
    result += p.toString(16).padStart(8, '0');
  }
  return result;
}
