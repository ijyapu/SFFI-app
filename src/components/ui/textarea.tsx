"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, onChange, ...props }: React.ComponentProps<"textarea">) {
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (e.target.value.length > 0) {
      e.target.value = e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)
    }
    onChange?.(e)
  }

  return (
    <textarea
      data-slot="textarea"
      autoCapitalize="sentences"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      onChange={handleChange}
      {...props}
    />
  )
}

export { Textarea }
