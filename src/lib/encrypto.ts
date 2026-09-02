const encoder = new TextEncoder()
const decoder = new TextDecoder()

// ── Layout constants ──────────────────────────────────────────────────────────
// Changing any of these values makes previously-encrypted data unreadable.
const SALT_BYTES = 32 // 32 B salt (was 16 — more entropy for KDF)
const IV_BYTES = 12 // 12 B IV   (AES-GCM spec requirement)
const HEADER_BYTES = SALT_BYTES + IV_BYTES // 44 B total header

// ── Key derivation ────────────────────────────────────────────────────────────
const deriveKey = async (
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> => {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  )

  // Guarantee we hand SubtleCrypto a proper, unshared ArrayBuffer
  const saltBuffer = salt.buffer.slice(
    salt.byteOffset,
    salt.byteOffset + salt.byteLength
  ) as ArrayBuffer

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      // OWASP 2023 recommendation: ≥ 600 000 rounds for PBKDF2-SHA-512
      // SHA-512 is slower on GPU than SHA-256, raising brute-force cost.
      iterations: 600_000,
      hash: "SHA-512",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

// ── Encoding helpers ──────────────────────────────────────────────────────────
const toBase64 = (bytes: Uint8Array): string =>
  // Spread avoids the slow per-char string concatenation loop
  btoa(String.fromCharCode(...bytes))

const fromBase64 = (base64: string): Uint8Array => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Encrypts `text` with a password-derived AES-256-GCM key.
 *
 * Output format (base64-encoded):
 *   [ salt (32 B) | iv (12 B) | ciphertext + GCM tag (variable) ]
 */
export const encrypt = async (text: string, key: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))

  const cryptoKey = await deriveKey(key, salt)

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    cryptoKey,
    encoder.encode(text)
  )

  const cipherBytes = new Uint8Array(encrypted)
  const result = new Uint8Array(HEADER_BYTES + cipherBytes.length)

  result.set(salt, 0)
  result.set(iv, SALT_BYTES)
  result.set(cipherBytes, HEADER_BYTES)

  return toBase64(result)
}

/**
 * Decrypts a base64 string produced by `encrypt`.
 * Throws if the data is malformed or the key is wrong.
 */
export const decrypt = async (
  encryptedText: string,
  key: string
): Promise<string> => {
  const data = fromBase64(encryptedText)

  // Minimum valid length = header + 1 byte of ciphertext + 16 B GCM tag
  if (data.length < HEADER_BYTES + 17) {
    throw new Error("Invalid encrypted data: payload too short")
  }

  // Offsets derived from constants — stays correct if SALT_BYTES/IV_BYTES change
  const salt = data.slice(0, SALT_BYTES)
  const iv = data.slice(SALT_BYTES, HEADER_BYTES)
  const ciphertext = data.slice(HEADER_BYTES)

  const cryptoKey = await deriveKey(key, salt)

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    cryptoKey,
    ciphertext.buffer as ArrayBuffer
  )

  return decoder.decode(decrypted)
}
