import crypto from "crypto";

export function getOrCreateSessionKeyHex(userId: string): `0x${string}` {
  if (!mem[userId]) {
    mem[userId] = ("0x" +
      crypto.randomBytes(32).toString("hex")) as `0x${string}`;
  }
  return mem[userId];
}

export function getSessionKeyHex(userId: string): `0x${string}` | null {
  return mem[userId] ?? null;
}

// Replace with DB/secrets manager in production
const mem: Record<string, `0x${string}`> = {};
export function saveSessionKey(userId: string, key: `0x${string}`) {
  mem[userId] = key;
}
export function loadSessionKey(userId: string): `0x${string}` | null {
  return mem[userId] ?? null;
}
