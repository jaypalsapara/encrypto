import { cn } from "@/lib/utils"
import { Lock, Moon, Sun } from "lucide-react"
import { getSystemTheme, useTheme } from "./theme-provider"
import { Button, buttonVariants } from "./ui/button"

export default function Header() {
  const appearance = useTheme()
  const currentTheme =
    appearance.theme === "system" ? getSystemTheme() : appearance.theme
  return (
    <header className="px-4 lg:border-x mx-auto lg:max-w-4xl w-full h-14 flex items-center border-b sticky top-0 bg-neutral-50 dark:bg-neutral-950 z-50">
      <a href="/encrypto" className="flex items-center gap-2 mr-auto">
        <Lock className="stroke-3 size-4.5" />
        <p className="text-lg tracking-tight font-bold leading-none">
          Encrypto
        </p>
      </a>
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
          className={cn(
            buttonVariants({
              variant: "ghost",
            })
          )}
        >
          GitHub
        </a>
      </div>
    </header>
  )
}
