import * as React from "react"
import { cn } from "@/lib/utils"

function Prose({ className, ...props }: React.ComponentProps<"article">) { return <article data-slot="prose" className={cn("max-w-[var(--aui-readable-max)] text-sm leading-7 text-[var(--aui-text-neutral)] [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[var(--aui-text)] [&_p]:my-3", className)} {...props}/> }
function TextHighlight({ className, ...props }: React.ComponentProps<"mark">) { return <mark data-slot="text-highlight" className={cn("rounded px-1 py-0.5 bg-[var(--aui-primary-soft)] text-[var(--aui-primary-heavy)]", className)} {...props}/> }
export { Prose, TextHighlight }
