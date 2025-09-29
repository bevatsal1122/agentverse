/**
 * Session key management utilities
 */

const SESSION_KEY_STORAGE_KEY = 'agentverse_session_key';

/**
 * Generates a random session key hex string
 */
function generateSessionKeyHex(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return '0x' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Gets or creates a session key hex string
 * If no session key exists, creates a new one and stores it
 */
export function getOrCreateSessionKeyHex(): string {
  if (typeof window === 'undefined') {
    // Server-side, return a mock key
    return '0x' + '0'.repeat(64);
  }
  
  let sessionKey = localStorage.getItem(SESSION_KEY_STORAGE_KEY);
  
  if (!sessionKey) {
    sessionKey = generateSessionKeyHex();
    localStorage.setItem(SESSION_KEY_STORAGE_KEY, sessionKey);
    console.log('Generated new session key:', sessionKey);
  }
  
  return sessionKey;
}

/**
 * Loads an existing session key hex string from storage
 * Returns null if no session key exists
 */
export function loadSessionKeyHex(): string | null {
  if (typeof window === 'undefined') {
    // Server-side, return null
    return null;
  }
  
  return localStorage.getItem(SESSION_KEY_STORAGE_KEY);
}


