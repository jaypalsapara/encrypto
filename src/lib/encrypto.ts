const encoder = new TextEncoder()
const decoder = new TextDecoder()

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

  const saltBuffer = salt.buffer.slice(
    salt.byteOffset,
    salt.byteOffset + salt.byteLength
  ) as ArrayBuffer

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 310_000,
      hash: "SHA-256",
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  )
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = ""

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

const fromBase64 = (base64: string): Uint8Array => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

export const encrypt = async (text: string, key: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const cryptoKey = await deriveKey(key, salt)

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv.buffer,
    },
    cryptoKey,
    encoder.encode(text)
  )

  const encryptedBytes = new Uint8Array(encrypted)

  const result = new Uint8Array(salt.length + iv.length + encryptedBytes.length)

  result.set(salt, 0)
  result.set(iv, salt.length)
  result.set(encryptedBytes, salt.length + iv.length)

  return toBase64(result)
}

export const decrypt = async (
  encryptedText: string,
  key: string
): Promise<string> => {
  const data = fromBase64(encryptedText)

  if (data.length < 29) {
    throw new Error("Invalid encrypted data")
  }

  const salt = data.slice(0, 16)
  const iv = data.slice(16, 28)
  const ciphertext = data.slice(28)

  const cryptoKey = await deriveKey(key, salt)

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv.buffer,
    },
    cryptoKey,
    ciphertext.buffer
  )

  return decoder.decode(decrypted)
}
