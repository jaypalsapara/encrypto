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
import { Textarea } from "@/components/ui/textarea"
import useZodValidator from "@/hooks/use-zod-validator"
import { decrypt, encrypt } from "@/lib/encrypto"
import { cn } from "@/lib/utils"
import { Check, Copy, Lock, LockOpen } from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"
import * as z from "zod"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "./ui/alert"
import { Skeleton } from "./ui/skeleton"

const textSchema = z.object({
  input: z.string().min(1, "The text is required."),
  password: z.string().min(6, "The password must be at least 6 characters."),
})

export default function TextEncryptor() {
  const [input, setInput] = useState<string>("")
  const [output, setOutput] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [isOutputError, setIsOutputError] = useState<boolean>(false)
  const [isPending, startTransition] = useTransition()
  const { errors, validate } = useZodValidator()
  const [copied, setCopied] = useState<boolean>(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const alertRef = useRef<HTMLDivElement | null>(null)
  const lastOutput = useRef<string>("")

  useEffect(() => {
    if (copied) {
      timerRef.current = setTimeout(() => setCopied(false), 1800)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [copied])

  useEffect(() => {
    if (!alertRef.current) return
    if (isPending) return
    if (lastOutput.current === output) return

    lastOutput.current = output

    alertRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }, [isPending, output])

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

  const handleCopy = () => {
    if (!output) return
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
    })
  }

  return (
    <div className="flex flex-col">
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
        <CardFooter className="gap-2 items-stretch md:items-center flex-col md:flex-row">
          <Button className="grow" onClick={handleEncrypt} disabled={isPending}>
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
          <Button variant="ghost" onClick={handleClear}>
            Clear
          </Button>
        </CardFooter>
      </Card>
      <div className="mx-auto w-full max-w-xl mt-4" ref={alertRef}>
        {isPending && (
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
        {output && !isPending && (
          <Alert className="p-4 scroll-mt-16">
            <AlertTitle
              className={cn(" text-green-700 font-mono", {
                "text-destructive": isOutputError,
              })}
            >
              {isOutputError ? "Error" : "Output"}
            </AlertTitle>
            <AlertDescription
              className={cn("text-foreground break-all", {
                "text-destructive": isOutputError,
              })}
            >
              {output}
            </AlertDescription>
            <AlertAction className="top-2.5">
              {!isOutputError && (
                <Button variant="outline" size={"sm"} onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check /> Copied
                    </>
                  ) : (
                    <>
                      <Copy /> Copy
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
