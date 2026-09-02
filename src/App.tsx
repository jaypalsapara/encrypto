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
import { decrypt, encrypt } from "@/lib/encrypto"
import { Lock, LockOpen, ShieldCheck } from "lucide-react"
import { useState, useTransition } from "react"
import * as z from "zod"
import OutputAlert from "./components/output-alert"
import useZodValidator from "./hooks/use-zod-validator"

const schema = z.object({
  input: z.string().min(1, "The text is required."),
  password: z.string().min(6, "The password must be at least 6 characters."),
})

export function App() {
  const [input, setInput] = useState<string>("")
  const [output, setOutput] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [isOutputError, setIsOutputError] = useState<boolean>(false)
  const [isPending, startTransition] = useTransition()
  const { errors, validate } = useZodValidator()

  // Handle Encrypt
  const handleEncrypt = () => {
    if (!validate(schema.safeParse({ input, password }))) return

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

  // Handle Decrypt
  const handleDecrypt = () => {
    if (!validate(schema.safeParse({ input, password }))) return

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

  // Handle Clear
  const handleClear = () => {
    setInput("")
    setPassword("")
    setOutput("")
  }

  return (
    <div className="flex min-h-svh flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="px-4 lg:border-x mx-auto lg:max-w-4xl w-full h-14 flex items-center border-b sticky top-0 bg-neutral-50 dark:bg-neutral-950">
        <div className="flex items-center gap-2 mr-auto">
          <Lock className="stroke-3 size-4.5" />
          <p className="text-lg tracking-tight font-bold leading-none">
            Encrypto
          </p>
        </div>
        <div>
          <a
            href="https://github.com/jaypalsapara/encrypto"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </header>
      <main className="flex flex-col lg:border-x max-w-4xl mx-auto grow px-4 w-full py-16">
        <div className="flex flex-col items-center justify-center gap-2">
          <h1 className="max-w-[14ch] text-center text-6xl md:text-8xl leading-none font-bold tracking-tighter text-balance">
            Encrypt Your Private Text
          </h1>
          <p className="mt-4 max-w-[55ch] text-center text-base">
            Secure sensitive text with AES-256 encryption. Enter your password,
            encrypt or decrypt your text, and keep your data private—directly in
            your browser.
          </p>
        </div>
        <div className="mt-16">
          <Tabs defaultValue="encrypt" className="mx-auto w-full max-w-xl">
            <TabsList className={"w-full"}>
              <TabsTrigger value="encrypt">
                <Lock /> Encrypt
              </TabsTrigger>
              <TabsTrigger value="decrypt">
                <LockOpen /> Decrypt
              </TabsTrigger>
            </TabsList>
            <TabsContent value="encrypt" className={"flex flex-col gap-2"}>
              <Card>
                <CardContent>
                  <FieldGroup>
                    <FieldSet>
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor="plaintext">
                            Plain text
                          </FieldLabel>
                          <Textarea
                            id="plaintext"
                            placeholder="Enter your text to encrypt..."
                            className="min-h-24 max-h-80"
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
                          <FieldLabel key={"password"}>Password</FieldLabel>
                          <PasswordInput
                            id="password"
                            placeholder="Enter strong password"
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
                    className={"grow"}
                    onClick={handleEncrypt}
                    disabled={isPending}
                  >
                    Encrypt
                  </Button>
                  <Button variant={"outline"} onClick={handleClear}>
                    Clear
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="decrypt" className={"flex flex-col gap-2"}>
              <Card>
                <CardContent>
                  <FieldGroup>
                    <FieldSet>
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor="encryptedtext">
                            Encrypted text
                          </FieldLabel>
                          <Textarea
                            id="encryptedtext"
                            placeholder="Paste encrypted text here..."
                            className="min-h-24 max-h-80"
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
                          <FieldLabel key={"password"}>Password</FieldLabel>
                          <PasswordInput
                            id="password"
                            placeholder="Enter strong password"
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
                    className={"grow"}
                    onClick={handleDecrypt}
                    disabled={isPending}
                  >
                    Decrypt
                  </Button>
                  <Button variant={"outline"} onClick={handleClear}>
                    Clear
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
          <div className="mx-auto w-full max-w-xl mt-4">
            {isPending && (
              <div className="flex items-center gap-2 justify-center">
                <p className="shimmer text-muted-foreground text-sm">
                  Processing...
                </p>
              </div>
            )}
            {output && !isPending && (
              <OutputAlert value={output} isError={isOutputError} />
            )}
          </div>
          <div className="flex justify-center w-full mt-4">
            <p className="max-w-[60ch] text-center text-xs text-muted-foreground text-pretty">
              <ShieldCheck className="inline size-3.75 -mt-0.75 mr-1" />
              Your text is encrypted and decrypted entirely in your browser
              using AES-256. No uploads, no server-side processing, no stored
              passwords.
            </p>
          </div>
        </div>
      </main>
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
