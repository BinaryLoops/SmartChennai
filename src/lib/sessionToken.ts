/**
 * Anonymous session token utility.
 * Generates a cryptographically random token, persists in localStorage.
 * NOT a user fingerprint — purely a random anonymous session identifier.
 */
const TOKEN_KEY = "sc_session_token";

export function getOrCreateSessionToken(): string {
  if (typeof window === "undefined") return "";
  
  let token = localStorage.getItem(TOKEN_KEY);
  if (token && token.length >= 32) return token;

  // Generate a new cryptographically random token
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  token = Array.from(array, b => b.toString(16).padStart(2, "0")).join("");
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}
