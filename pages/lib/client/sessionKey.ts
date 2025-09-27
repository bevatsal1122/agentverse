// Browser-only helper to persist a session key locally.
// In PROD: store on server with encryption / KMS, not localStorage.

export function getOrCreateSessionKeyHex(): `0x${string}` {
  if (typeof window === "undefined") throw new Error("client only");

  const EXISTING = localStorage.getItem("sessionKeyHex");
  if (EXISTING?.startsWith("0x") && EXISTING.length === 66) {
    return EXISTING as `0x${string}`;
  }

  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const hex =
    "0x" +
    Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  localStorage.setItem("sessionKeyHex", hex);
  return hex as `0x${string}`;
}

export function loadSessionKeyHex(): `0x${string}` | null {
  if (typeof window === "undefined") return null;
  const k = localStorage.getItem("sessionKeyHex");
  return k?.startsWith("0x") && k.length === 66 ? (k as `0x${string}`) : null;
}
