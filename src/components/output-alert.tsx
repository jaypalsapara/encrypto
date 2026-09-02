import { cn } from "@/lib/utils"
import { Check, Copy } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "./ui/alert"
import { Button } from "./ui/button"

export default function OutputAlert({
  value,
  isError = false,
}: {
  value: string
  isError: boolean
}) {
  const [copied, setCopied] = useState<boolean>(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const alertRef = useRef<HTMLDivElement | null>(null)

  // Handle Copy
  const handleCopy = () => {
    if (!value) return
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
    })
  }

  useEffect(() => {
    if (!alertRef.current) return

    alertRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }, [])

  useEffect(() => {
    if (copied) {
      timerRef.current = setTimeout(() => setCopied(false), 1800)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [copied])

  return (
    <Alert className="p-4 scroll-mt-16" ref={alertRef}>
      <AlertTitle
        className={cn(" text-green-700 font-mono", {
          "text-destructive": isError,
        })}
      >
        {isError ? "Error" : "Output"}
      </AlertTitle>
      <AlertDescription
        className={cn("text-foreground break-all", {
          "text-destructive": isError,
        })}
      >
        {value}
      </AlertDescription>
      <AlertAction className="top-2.5">
        {!isError && (
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
  )
}
