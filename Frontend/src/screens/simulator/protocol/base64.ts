/**
 * Base64 <-> Uint8Array sem depender do `Buffer` do Node — este código roda
 * no navegador (é o que fala com o broker MQTT via WebSocket), então usa só
 * `btoa`/`atob`, que todo browser já tem.
 */

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
