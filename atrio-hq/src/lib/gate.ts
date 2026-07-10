/** Hash del passcode compartido (para no guardar el secreto en crudo en la cookie). */
export async function gateHash(pass: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pass));
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export const GATE_COOKIE = "atrio_gate";
