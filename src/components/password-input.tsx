import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"
import { Eye, EyeOff } from "lucide-react"
import { useState, type ComponentProps } from "react"

export default function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [show, setShow] = useState<boolean>(false)

  return (
    <InputGroup className={cn(className)}>
      <InputGroupInput
        type={show ? "text" : "password"}
        placeholder="Search..."
        {...props}
      />
      <InputGroupAddon align={"inline-end"}>
        <InputGroupButton tabIndex={-1} onClick={() => setShow((old) => !old)}>
          {!show ? <EyeOff /> : <Eye />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
