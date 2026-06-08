import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-cortex-border bg-cortex-card px-3 py-2 text-sm text-cortex-text placeholder:text-cortex-muted focus:outline-none focus:ring-2 focus:ring-cortex-cyan focus:ring-offset-2 focus:ring-offset-cortex-bg disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
