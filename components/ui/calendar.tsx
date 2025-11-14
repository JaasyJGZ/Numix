import * as React from "react"

import { cn } from "@/lib/utils"

type CalendarProps = React.HTMLAttributes<HTMLDivElement> & {
  mode?: "single" | "multiple" | "range"
  selected?: Date | Date[] | undefined
  onSelect?: (date: Date | undefined) => void
  initialFocus?: boolean
}

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  ({ className, mode = "single", selected, onSelect, initialFocus, ...props }, ref) => {
    return (
      <div className={cn("p-3 bg-background-soft rounded-md", className)} {...props} ref={ref}>
        Calendar (Placeholder)
      </div>
    )
  },
)
Calendar.displayName = "Calendar"

export { Calendar }

