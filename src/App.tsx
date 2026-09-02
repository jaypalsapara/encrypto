import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUp, ShieldCheck, Type } from "lucide-react"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import { Activity } from "react"
import FileEncryptor from "./components/file-encryptor"
import Footer from "./components/footer"
import Header from "./components/header"
import TextEncryptor from "./components/text-encryptor"

const tabs = ["text", "file"] as const

export function App() {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(tabs).withDefault("text")
  )
  return (
    <div className="flex min-h-svh flex-col bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <Header />

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
            defaultValue={tab}
            value={tab}
            onValueChange={(val) => setTab(val)}
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

            <Activity mode={tab === "text" ? "visible" : "hidden"}>
              <TextEncryptor />
            </Activity>
            <Activity mode={tab === "file" ? "visible" : "hidden"}>
              <FileEncryptor />
            </Activity>
          </Tabs>

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
      <Footer />
    </div>
  )
}

export default App
