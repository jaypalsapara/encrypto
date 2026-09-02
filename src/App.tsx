import PasswordInput from "@/components/password-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { DecryptedFile } from "@/lib/encrypto"
import { decrypt, decryptFile, encrypt, encryptFile } from "@/lib/encrypto"
import {
  FileDown,
  FileUp,
  Lock,
  LockOpen,
  Moon,
  ShieldCheck,
  Sun,
  Type,
  X,
} from "lucide-react"
import { useRef, useState, useTransition } from "react"
import * as z from "zod"
import OutputAlert from "./components/output-alert"
import { getSystemTheme, useTheme } from "./components/theme-provider"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "./components/ui/alert"
import { Skeleton } from "./components/ui/skeleton"
import useZodValidator from "./hooks/use-zod-validator"

// ── Validation schemas ────────────────────────────────────────────────────────
const textSchema = z.object({
  input: z.string().min(1, "The text is required."),
  password: z.string().min(6, "The password must be at least 6 characters."),
})

const fileSchema = z.object({
  password: z.string().min(6, "The password must be at least 6 characters."),
})

// ── Helpers ───────────────────────────────────────────────────────────────────
const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

// ── Component ─────────────────────────────────────────────────────────────────
export function App() {
  const [tab, setTab] = useState<"text" | "file">("text")
  const appearance = useTheme()

  // ── Text tab state ──────────────────────────────────────────────────────────
  const [input, setInput] = useState<string>("")
  const [output, setOutput] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [isOutputError, setIsOutputError] = useState<boolean>(false)
  const [isPending, startTransition] = useTransition()
  const { errors, validate } = useZodValidator()

  // ── File tab state ──────────────────────────────────────────────────────────
  const [filePassword, setFilePassword] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileStatus, setFileStatus] = useState<string>("")
  const [isFileError, setIsFileError] = useState<boolean>(false)
  const [isFilePending, startFileTransition] = useTransition()
  const { errors: fileErrors, validate: fileValidate } = useZodValidator()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // ── Text handlers ───────────────────────────────────────────────────────────
  const handleEncrypt = () => {
    if (!validate(textSchema.safeParse({ input, password }))) return
    startTransition(async () => {
      try {
        setOutput(await encrypt(input, password))
        setIsOutputError(false)
      } catch {
        setOutput("Encryption failed")
        setIsOutputError(true)
      }
    })
  }

  const handleDecrypt = () => {
    if (!validate(textSchema.safeParse({ input, password }))) return
    startTransition(async () => {
      try {
        setOutput(await decrypt(input, password))
        setIsOutputError(false)
      } catch {
        setOutput("Invalid key or encrypted text")
        setIsOutputError(true)
      }
    })
  }

  const handleClear = () => {
    setInput("")
    setPassword("")
    setOutput("")
  }

  // ── File handlers ───────────────────────────────────────────────────────────
  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file)
    setFileStatus("")
    setIsFileError(false)
  }

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleFileEncrypt = () => {
    if (!fileValidate(fileSchema.safeParse({ password: filePassword }))) return
    if (!selectedFile) {
      setFileStatus("Please select a file to encrypt.")
      setIsFileError(true)
      return
    }
    startFileTransition(async () => {
      try {
        const blob = await encryptFile(selectedFile, filePassword)
        triggerDownload(blob, selectedFile.name + ".enc")
        setFileStatus(`"${selectedFile.name}" encrypted and downloaded.`)
        setIsFileError(false)
      } catch {
        setFileStatus("Encryption failed. Please try again.")
        setIsFileError(true)
      }
    })
  }

  const handleFileDecrypt = () => {
    if (!fileValidate(fileSchema.safeParse({ password: filePassword }))) return
    if (!selectedFile) {
      setFileStatus("Please select an encrypted file to decrypt.")
      setIsFileError(true)
      return
    }
    startFileTransition(async () => {
      try {
        const result: DecryptedFile = await decryptFile(
          selectedFile,
          filePassword
        )
        triggerDownload(result.blob, result.name)
        setFileStatus(`"${result.name}" decrypted and downloaded.`)
        setIsFileError(false)
      } catch {
        setFileStatus("Decryption failed. Wrong password or invalid file.")
        setIsFileError(true)
      }
    })
  }

  const handleFileClear = () => {
    setSelectedFile(null)
    setFilePassword("")
    setFileStatus("")
    setIsFileError(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const currentTheme =
    appearance.theme === "system" ? getSystemTheme() : appearance.theme

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-svh flex-col bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="px-4 lg:border-x mx-auto lg:max-w-4xl w-full h-14 flex items-center border-b sticky top-0 bg-neutral-50 dark:bg-neutral-950">
        <div className="flex items-center gap-2 mr-auto">
          <Lock className="stroke-3 size-4.5" />
          <p className="text-lg tracking-tight font-bold leading-none">
            Encrypto
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant={"ghost"}
            size={"icon"}
            onClick={() => {
              const nextTheme =
                appearance.theme === "dark"
                  ? "light"
                  : appearance.theme === "light"
                    ? "dark"
                    : getSystemTheme() === "dark"
                      ? "light"
                      : "dark"
              appearance.setTheme(nextTheme)
            }}
          >
            {currentTheme === "dark" ? <Moon /> : <Sun />}
          </Button>
          <a
            href="https://github.com/jaypalsapara/encrypto"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-col lg:border-x max-w-4xl mx-auto grow px-4 w-full py-16">
        <div className="flex flex-col items-center justify-center gap-2">
          <h1 className="max-w-[18ch] text-center text-6xl md:text-8xl leading-none font-bold tracking-tighter text-balance">
            Encrypt Your Private Data
          </h1>
          <p className="mt-4 max-w-[55ch] text-center text-base">
            Secure text or files with AES-256 encryption. Everything happens
            directly in your browser—no uploads, no servers, no stored
            passwords.
          </p>
        </div>

        <div className="mt-12">
          <Tabs
            defaultValue="text"
            onValueChange={setTab}
            className="mx-auto w-full max-w-xl"
          >
            <TabsList className="w-full">
              <TabsTrigger value="text">
                <Type /> Text
              </TabsTrigger>
              <TabsTrigger value="file">
                <FileUp /> File
              </TabsTrigger>
            </TabsList>

            {/* ── Text tab ── */}
            <TabsContent value="text" className="flex flex-col gap-2">
              <Card>
                <CardContent>
                  <FieldGroup>
                    <FieldSet>
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor="plaintext">Text</FieldLabel>
                          <Textarea
                            id="plaintext"
                            placeholder="Enter plain text to encrypt, or paste encrypted text to decrypt…"
                            className="min-h-36 max-h-80"
                            aria-invalid={!!errors.input}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                          />
                          <FieldError>{errors.input}</FieldError>
                        </Field>
                      </FieldGroup>
                    </FieldSet>
                    <FieldSet>
                      <FieldGroup>
                        <Field>
                          <FieldLabel>Password</FieldLabel>
                          <PasswordInput
                            id="password"
                            placeholder="Enter strong password"
                            aria-invalid={!!errors.password}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          <FieldError>{errors.password}</FieldError>
                        </Field>
                      </FieldGroup>
                    </FieldSet>
                  </FieldGroup>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button
                    className="grow"
                    onClick={handleEncrypt}
                    disabled={isPending}
                  >
                    <Lock className="size-4" /> Encrypt
                  </Button>
                  <Button
                    variant="outline"
                    className="grow"
                    onClick={handleDecrypt}
                    disabled={isPending}
                  >
                    <LockOpen className="size-4" /> Decrypt
                  </Button>
                  <Button variant="outline" onClick={handleClear}>
                    Clear
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* ── File tab ── */}
            <TabsContent value="file" className="flex flex-col gap-2">
              <Card>
                <CardContent>
                  <FieldGroup>
                    <FieldSet>
                      <FieldGroup>
                        <Field>
                          <FieldLabel>File</FieldLabel>
                          {selectedFile ? (
                            /* Selected file pill */
                            <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                              <FileUp className="size-4 shrink-0 text-muted-foreground" />
                              <span className="truncate flex-1">
                                {selectedFile.name}
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatBytes(selectedFile.size)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleFileSelect(null)}
                                className="shrink-0 rounded hover:text-foreground text-muted-foreground"
                                aria-label="Remove file"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            /* Drop zone */
                            <div
                              onDragOver={(e) => {
                                e.preventDefault()
                                setIsDragging(true)
                              }}
                              onDragLeave={() => setIsDragging(false)}
                              onDrop={handleFileDrop}
                              onClick={() => fileInputRef.current?.click()}
                              className={[
                                "flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed cursor-pointer py-8 px-4 text-center transition-colors min-h-36",
                                isDragging
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50 hover:bg-neutral-100 dark:hover:bg-neutral-900",
                              ].join(" ")}
                            >
                              <FileDown className="size-6 text-muted-foreground" />
                              <p className="text-sm font-medium">
                                Drop a file here or{" "}
                                <span className="text-primary underline underline-offset-2">
                                  browse
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Any file type supported
                              </p>
                            </div>
                          )}
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={(e) =>
                              handleFileSelect(e.target.files?.[0] ?? null)
                            }
                          />
                        </Field>
                      </FieldGroup>
                    </FieldSet>
                    <FieldSet>
                      <FieldGroup>
                        <Field>
                          <FieldLabel>Password</FieldLabel>
                          <PasswordInput
                            id="file-password"
                            placeholder="Enter strong password"
                            value={filePassword}
                            aria-invalid={!!fileErrors.password}
                            onChange={(e) => setFilePassword(e.target.value)}
                          />
                          <FieldError>{fileErrors.password}</FieldError>
                        </Field>
                      </FieldGroup>
                    </FieldSet>
                  </FieldGroup>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button
                    className="grow"
                    onClick={handleFileEncrypt}
                    disabled={isFilePending}
                  >
                    <Lock className="size-4" /> Encrypt & Download
                  </Button>
                  <Button
                    variant="outline"
                    className="grow"
                    onClick={handleFileDecrypt}
                    disabled={isFilePending}
                  >
                    <LockOpen className="size-4" /> Decrypt & Download
                  </Button>
                  <Button variant="outline" onClick={handleFileClear}>
                    Clear
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Status area */}
          <div className="mx-auto w-full max-w-xl mt-4">
            {(isPending || isFilePending) && (
              <Alert className="p-4">
                <AlertTitle>
                  <Skeleton className="h-4 max-w-[6ch]" />
                </AlertTitle>
                <AlertDescription className="space-y-1 mt-1">
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4" />
                </AlertDescription>
                <AlertAction className="top-2.5"></AlertAction>
              </Alert>
            )}
            {output && !isPending && tab === "text" && (
              <OutputAlert value={output} isError={isOutputError} />
            )}
            {fileStatus && !isFilePending && tab === "file" && (
              <OutputAlert value={fileStatus} isError={isFileError} />
            )}
          </div>

          {/* Trust note */}
          <div className="flex justify-center w-full mt-4">
            <p className="max-w-[60ch] text-center text-xs text-muted-foreground text-pretty">
              <ShieldCheck className="inline size-3.75 -mt-0.75 mr-1" />
              All encryption and decryption happens entirely in your browser
              using AES-256. No uploads, no server-side processing, no stored
              passwords.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t h-14 px-4 flex items-center text-muted-foreground lg:max-w-4xl mx-auto w-full lg:border-x justify-center">
        <p className="text-sm text-center">
          Brought by{" "}
          <a
            href="https://jaypalsapara.in"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Jaypal Sapara
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
