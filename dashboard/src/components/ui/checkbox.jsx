import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "../../lib/utils"

const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-cortex-border bg-cortex-card focus:outline-none focus:ring-2 focus:ring-cortex-cyan focus:ring-offset-2 focus:ring-offset-cortex-bg disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-cortex-cyan data-[state=checked]:border-cortex-cyan data-[state=checked]:text-cortex-bg",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3 w-3" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
