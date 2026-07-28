import Image, { type ImageProps } from "next/image"
import * as React from "react"
import { User } from "@/components/ui/material-icon"
import { cn } from "@/lib/utils"

type Shape = "square" | "rounded" | "card" | "circle" | "clean"
const shapes = { square: "rounded-none", rounded: "rounded-[var(--aui-radius-control)]", card: "rounded-[var(--aui-radius-card)]", circle: "rounded-full", clean: "" }

function Asset({ className, shape = "rounded", fit = "cover", alt, ...props }: ImageProps & { shape?: Shape; fit?: "cover" | "contain" | "fill" }) {
  return <span data-slot="asset" className={cn("relative block overflow-hidden bg-[var(--aui-fill)]", shapes[shape], className)}><Image alt={alt} className={cn("object-cover", fit === "contain"&&"object-contain", fit === "fill"&&"object-fill")} {...props}/></span>
}

function Avatar({ src, alt = "", fallback, size = "md", className }: { src?: string; alt?: string; fallback?: React.ReactNode; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "size-[var(--aui-component-avatar-compact-size)]", md: "size-[var(--aui-component-avatar-default-size)]", lg: "size-[var(--aui-component-avatar-prominent-size)]" }
  return <span data-slot="avatar" className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--aui-primary-soft)] font-semibold text-[var(--aui-primary-heavy)]", sizes[size], className)}>{src?<Image src={src} alt={alt} fill sizes={size === "sm" ? "32px" : size === "md" ? "40px" : "48px"} className="object-cover"/>:fallback??<User aria-hidden className="size-1/2"/>}</span>
}
export { Asset, Avatar }
