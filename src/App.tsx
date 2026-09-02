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
import { Lock, LockOpen } from "lucide-react"
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
    <div className="flex min-h-svh flex-col bg-neutral-50 p-6 dark:bg-neutral-950">
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <h1 className="max-w-[14ch] text-center text-8xl leading-none font-bold tracking-tighter text-balance">
          Encrypt Your Private Text
        </h1>
        <p className="mt-4 max-w-[55ch] text-center text-base">
          Secure sensitive text with AES-256 encryption. Enter your password,
          encrypt or decrypt your text, and keep your data private—directly in
          your browser.
        </p>
      </div>
      <div>
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
                        <FieldLabel htmlFor="plaintext">Plain text</FieldLabel>
                        <Textarea
                          id="plaintext"
                          placeholder="Enter your text to encrypt..."
                          className="min-h-24"
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
                          className="min-h-24"
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
            <div className="flex items-center gap-2">
              <p className="shimmer text-muted-foreground text-sm">
                Processing...
              </p>
            </div>
          )}
          {output && !isPending && (
            <OutputAlert value={output} isError={isOutputError} />
          )}
        </div>
      </div>
    </div>
  )
}

export default App
