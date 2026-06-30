"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

function Checkbox({
  className,
  checked,
  onCheckedChange,
  id,
  disabled,
}: {
  className?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  id?: string
  disabled?: boolean
}) {
  return (
    <span className={cn("relative inline-flex items-center justify-center size-4 shrink-0", className)}>
      <input
        type="checkbox"
        id={id}
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed"
      />
      <span
        className={cn(
          "size-4 rounded border border-input bg-background transition-colors flex items-center justify-center",
          checked && "border-primary bg-primary",
          disabled && "opacity-50",
        )}
      >
        {checked && <Check className="size-3 stroke-[3] text-primary-foreground" />}
      </span>
    </span>
  )
}

export { Checkbox }
