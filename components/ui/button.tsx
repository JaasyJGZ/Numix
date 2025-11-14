"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-button",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow hover:opacity-90 transform hover:scale-[1.02] active:scale-[0.98]",
        destructive:
      "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 transform hover:scale-[1.02] active:scale-[0.98]",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground transform hover:scale-[1.02] active:scale-[0.98]",
        secondary:
          "bg-background-soft text-white shadow-sm hover:bg-background-softer transform hover:scale-[1.02] active:scale-[0.98]",
        ghost: "hover:bg-primary/10 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
        custom: "transition-colors",
      },
      size: {
        default: "h-12 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-14 rounded-xl px-8",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    // Add ripple effect
    const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
      const button = e.currentTarget
      const ripple = document.createElement("span")
      const rect = button.getBoundingClientRect()

      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      ripple.style.width = ripple.style.height = `${size}px`
      ripple.style.left = `${x}px`
      ripple.style.top = `${y}px`
      ripple.style.position = "absolute" // Asegurar posición absoluta
      ripple.className = "ripple"
      ripple.setAttribute("aria-hidden", "true") // Ocultar para lectores de pantalla

      button.appendChild(ripple)

      setTimeout(() => {
        ripple.classList.add("active")

        setTimeout(() => {
          ripple.remove()
        }, 700)
      }, 10)

      // Call original onClick if exists
      if (props.onClick) {
        props.onClick(e)
      }
    }

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          variant !== "custom" ? "btn-ripple overflow-hidden" : "",
          "relative", // Añadir posicionamiento relativo
          variant === "ghost" ? "z-10" : "", // Añadir z-index para botones ghost
        )}
        ref={ref}
        {...props}
        onClick={variant !== "custom" ? handleRipple : props.onClick}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }

