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

// ── Internal shared core ──────────────────────────────────────────────────────

/** Reads a File/Blob into a Uint8Array. */
const readFileBytes = (file: File | Blob): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsArrayBuffer(file)
  })

/**
 * Encrypts raw bytes with a password-derived AES-256-GCM key.
 * Returns [ salt (32 B) | iv (12 B) | ciphertext + GCM tag ] — no base64.
 */
const encryptBytes = async (
  plainBytes: Uint8Array,
  password: string
): Promise<Uint8Array> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))

  const cryptoKey = await deriveKey(password, salt)

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    cryptoKey,
    plainBytes.buffer as ArrayBuffer
  )

  const cipherBytes = new Uint8Array(encrypted)
  const result = new Uint8Array(HEADER_BYTES + cipherBytes.length)
  result.set(salt, 0)
  result.set(iv, SALT_BYTES)
  result.set(cipherBytes, HEADER_BYTES)
  return result
}

/** Decrypts [ salt | iv | ciphertext ] bytes. Returns plaintext bytes. */
const decryptBytes = async (
  data: Uint8Array,
  password: string
): Promise<Uint8Array> => {
  // Minimum = header + 1 B payload + 16 B GCM tag
  if (data.length < HEADER_BYTES + 17) {
    throw new Error("Invalid encrypted data: payload too short")
  }

  const salt = data.slice(0, SALT_BYTES)
  const iv = data.slice(SALT_BYTES, HEADER_BYTES)
  const ciphertext = data.slice(HEADER_BYTES)

  const cryptoKey = await deriveKey(password, salt)

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    cryptoKey,
    ciphertext.buffer as ArrayBuffer
  )

  return new Uint8Array(decrypted)
}

// ── Text API ──────────────────────────────────────────────────────────────────

/**
 * Encrypts a UTF-8 string with a password-derived AES-256-GCM key.
 *
 * Output format (base64-encoded):
 *   [ salt (32 B) | iv (12 B) | ciphertext + GCM tag (variable) ]
 */
export const encrypt = async (text: string, key: string): Promise<string> => {
  const result = await encryptBytes(encoder.encode(text), key)
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
  const plainBytes = await decryptBytes(data, key)
  return decoder.decode(plainBytes)
}

// ── File API ──────────────────────────────────────────────────────────────────

/**
 * Encrypts a File using AES-256-GCM.
 *
 * The original filename is embedded in the payload so it is restored on
 * decryption. Returns a raw binary Blob (no base64 overhead).
 *
 * Binary layout inside the ciphertext:
 *   [ nameLen u16-LE (2 B) | name utf-8 | file bytes ]
 */
export const encryptFile = async (
  file: File,
  password: string
): Promise<Blob> => {
  const fileBytes = await readFileBytes(file)
  const nameBytes = encoder.encode(file.name)

  if (nameBytes.length > 0xffff) {
    throw new Error("Filename too long (max 65 535 bytes)")
  }

  // 2-byte little-endian length prefix + name + file content
  const payload = new Uint8Array(2 + nameBytes.length + fileBytes.length)
  payload[0] = nameBytes.length & 0xff
  payload[1] = (nameBytes.length >> 8) & 0xff
  payload.set(nameBytes, 2)
  payload.set(fileBytes, 2 + nameBytes.length)

  const encryptedBytes = await encryptBytes(payload, password)
  // Copy into a new plain ArrayBuffer — the only type Blob accepts in strict TS
  const plainBuffer = new ArrayBuffer(encryptedBytes.byteLength)
  new Uint8Array(plainBuffer).set(encryptedBytes)
  return new Blob([plainBuffer], { type: "application/octet-stream" })
}

export interface DecryptedFile {
  /** The original filename embedded at encryption time. */
  name: string
  /** Decrypted file contents as a Blob, ready for URL.createObjectURL(). */
  blob: Blob
}

/**
 * Decrypts a Blob produced by `encryptFile`.
 * Throws if the data is malformed or the password is wrong.
 */
export const decryptFile = async (
  encryptedBlob: Blob | File,
  password: string
): Promise<DecryptedFile> => {
  const data = await readFileBytes(encryptedBlob as File)
  const plainBytes = await decryptBytes(data, password)

  if (plainBytes.length < 2) {
    throw new Error("Decrypted payload too short to contain a filename")
  }

  const nameLen = plainBytes[0] | (plainBytes[1] << 8)

  if (plainBytes.length < 2 + nameLen) {
    throw new Error("Decrypted payload truncated (filename length mismatch)")
  }

  const name = decoder.decode(plainBytes.slice(2, 2 + nameLen))
  const fileBytes = plainBytes.slice(2 + nameLen)

  return { name, blob: new Blob([fileBytes]) }
}
