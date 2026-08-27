import * as React from "react"
import { Avatar } from "@/components/ui/asset"
import { cn } from "@/lib/utils"

function AvatarGroup({ names, max = 4, className }: { names: string[]; max?: number; className?: string }) {
  const shown = names.slice(0, max)
  const overflow = names.length - shown.length
  return <div data-slot="avatar-group" className={cn("flex items-center", className)}>
    {shown.map((name) => <span key={name} className="-ml-2 rounded-[var(--aui-radius-pill)] ring-2 ring-[var(--aui-surface)] first:ml-0"><Avatar fallback={name.slice(0, 1)} alt={name}/></span>)}
    {overflow > 0 && <span className="-ml-2 grid size-[var(--aui-component-avatar-default-size)] place-items-center rounded-[var(--aui-radius-pill)] bg-[var(--aui-fill)] text-xs font-semibold text-[var(--aui-text-neutral)] ring-2 ring-[var(--aui-surface)]">+{overflow}</span>}
    <span className="sr-only">{names.length}명</span>
  </div>
}
export { AvatarGroup }
