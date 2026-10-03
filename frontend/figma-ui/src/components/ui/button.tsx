import type { ComponentProps } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva("button", {
  variants: {
    variant: {
      default: "button-primary",
      outline: "button-outline",
      ghost: "button-ghost",
    },
    size: { default: "button-default", icon: "button-icon", sm: "button-sm" },
  },
  defaultVariants: { variant: "default", size: "default" },
})

type Props = ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
  asChild?: boolean
}

export default function Button({
  className,
  variant,
  size,
  asChild,
  type = "button",
  ...props
}: Props) {
  const Component = asChild ? Slot : "button"
  return (
    <Component
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
