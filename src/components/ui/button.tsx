import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-[var(--casa-blue)] focus-visible:ring-[var(--casa-blue)]/20 focus-visible:ring-[3px] focus-visible:ring-offset-0 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        prism: "casa-button-prism text-white hover:bg-[var(--casa-ink-deep-hover)]",
        "outline-prism": "casa-button-outline border-[color:var(--casa-sand)] text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)]",
        "marketing-sun": "group h-12 px-6 text-sm font-bold rounded-full bg-[var(--casa-sun)] text-[var(--casa-ink-deep)] shadow-[var(--shadow-card)] ring-1 ring-white/15 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_28px_52px_-28px_rgba(255,255,255,0.72)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--casa-sun)]",
        "marketing-dark": "group h-12 px-6 text-sm font-bold rounded-full bg-[var(--casa-ink-deep)] text-white shadow-[var(--shadow-modal)] transition-all hover:-translate-y-0.5 hover:bg-[var(--casa-ink-deep-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--casa-blue)]",
        "marketing-outline": "group h-12 px-6 text-sm font-bold rounded-full border border-white/24 bg-white/8 text-white transition-colors hover:bg-white hover:text-[var(--casa-ink-deep)]",
        "marketing-light": "group h-12 px-6 text-sm font-bold rounded-full border border-[color:var(--casa-sand)] bg-white text-[var(--casa-ink)] transition-colors hover:border-[var(--casa-blue)]/35 hover:text-[var(--casa-accent-text)]"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-lg px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    /*
     * The four `marketing-*` variants are designed at 48px. Their own `h-12`
     * cannot deliver that: cva emits `variant` classes before `size` classes,
     * so tailwind-merge resolved the conflict in favour of the size default
     * `h-9` and they rendered at 38px — 10px short and under the 44px touch
     * minimum. compoundVariants are emitted AFTER both, so the height wins here.
     * Passing an explicit size still overrides it, which is the intended escape
     * hatch. See docs/PREMIUM_UI_REVIEW_2026-08-16.md §1.3.
     */
    compoundVariants: [
      { variant: "marketing-sun", size: "default", className: "h-12" },
      { variant: "marketing-dark", size: "default", className: "h-12" },
      { variant: "marketing-outline", size: "default", className: "h-12" },
      { variant: "marketing-light", size: "default", className: "h-12" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
