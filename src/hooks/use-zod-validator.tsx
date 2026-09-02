import { useState } from "react"
import type { ZodSafeParseResult } from "zod"

export default function useZodValidator() {
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Validate safe and return boolean
  const validate = (parse: ZodSafeParseResult<unknown>): boolean => {
    if (!parse.success) {
      const errorBag: Record<string, string> = {}

      parse.error.issues.forEach((issue) => {
        const field = issue.path[0]

        if (typeof field === "string") {
          errorBag[field] ??= issue.message
        }
      })

      setErrors(errorBag)

      return false
    } else {
      clear()

      return true
    }
  }

  // Clear errors
  const clear = () => {
    setErrors({})
  }

  return { errors, validate, clear }
}
