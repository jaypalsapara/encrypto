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
import useZodValidator from "@/hooks/use-zod-validator"
import type { DecryptedFile } from "@/lib/encrypto"
import { decryptFile, encryptFile } from "@/lib/encrypto"
import { cn, formatBytes, triggerDownload } from "@/lib/utils"
import { Check, FileDown, FileUp, Lock, LockOpen, Save, X } from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"
import * as z from "zod"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "./ui/alert"
import { Skeleton } from "./ui/skeleton"

const fileSchema = z.object({
  password: z.string().min(6, "The password must be at least 6 characters."),
})

export default function FileEncryptor() {
  const [outputFile, setOutputFile] = useState<Blob | null>(null)
  const [outputFileName, setOutputFileName] = useState<string>("")
  const [filePassword, setFilePassword] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileStatus, setFileStatus] = useState<string>("")
  const [isFileError, setIsFileError] = useState<boolean>(false)
  const [isFilePending, startFileTransition] = useTransition()
  const [saved, setSaved] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState(false)
  const { errors: fileErrors, validate: fileValidate } = useZodValidator()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const alertRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastOutput = useRef<Blob | null>(null)

  useEffect(() => {
    if (saved) {
      timerRef.current = setTimeout(() => setSaved(false), 1800)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [saved])

  useEffect(() => {
    if (!alertRef.current) return
    if (isFilePending) return
    if (lastOutput.current === outputFile) return

    lastOutput.current = outputFile

    alertRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }, [isFilePending, outputFile])

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
        setOutputFile(blob)
        setOutputFileName(selectedFile.name + ".enc")
        setFileStatus(`"${selectedFile.name}" encrypted.`)
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
        setOutputFile(result.blob)
        setOutputFileName(result.name)
        setFileStatus(`"${result.name}" decrypted.`)
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

  const handleSave = () => {
    if (!outputFile) return

    triggerDownload(outputFile, outputFileName)

    setSaved(true)
  }
  return (
    <div className="flex flex-col">
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
                    accept="*/*"
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
        <CardFooter className="gap-2 items-stretch md:items-center flex-col md:flex-row">
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
          <Button variant="ghost" onClick={handleFileClear}>
            Clear
          </Button>
        </CardFooter>
      </Card>
      <div className="mx-auto w-full max-w-xl mt-4">
        {isFilePending && (
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
        {fileStatus && !isFilePending && (
          <Alert className="p-4 scroll-mt-16" ref={alertRef}>
            <AlertTitle
              className={cn(" text-green-700 font-mono", {
                "text-destructive": isFileError,
              })}
            >
              {isFileError ? "Error" : "Output"}
            </AlertTitle>
            <AlertDescription
              className={cn("text-foreground break-all", {
                "text-destructive": isFileError,
              })}
            >
              {fileStatus}
            </AlertDescription>
            <AlertAction className="top-2.5">
              {!isFileError && (
                <Button variant="outline" size={"sm"} onClick={handleSave}>
                  {saved ? (
                    <>
                      <Check /> Saved
                    </>
                  ) : (
                    <>
                      <Save /> Save
                    </>
                  )}
                </Button>
              )}
            </AlertAction>
          </Alert>
        )}
      </div>
    </div>
  )
}
