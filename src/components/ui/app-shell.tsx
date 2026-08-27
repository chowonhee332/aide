"use client"

import * as React from "react"
import { ArrowLeft, LayoutTemplate, Menu, Search, User, X } from "@/components/ui/material-icon"
import { Button } from "@/components/ui/button"
import { Navigation, type NavigationItem } from "@/components/ui/navigation"
import { cn } from "@/lib/utils"

const defaultItems: NavigationItem[] = [
  { id: "home", label: "홈", icon: <LayoutTemplate /> },
  { id: "projects", label: "프로젝트" },
  { id: "settings", label: "설정" },
]

function AppHeader({ brand = "Aide", items = defaultItems, activeId = "home", actions, showActions = true, position = "static", className }: { brand?: React.ReactNode; items?: NavigationItem[]; activeId?: string; actions?: React.ReactNode; showActions?: boolean; position?: "static" | "sticky"; className?: string }) {
  return <header data-slot="app-header" data-position={position} className={cn("flex min-h-[var(--aui-header-height)] w-full items-center gap-[var(--aui-space-4)] bg-[var(--aui-surface)] px-[var(--aui-space-4)] md:px-[var(--aui-space-6)]", position === "sticky" && "sticky top-0 z-30 shadow-[var(--aui-shadow-subtle)]", className)}>
    <Button variant="ghost" size="icon-touch" aria-label="메뉴 열기" className="md:hidden"><Menu /></Button>
    <strong className="shrink-0 text-base font-bold text-[var(--aui-text)]">{brand}</strong>
    <Navigation items={items} activeId={activeId} variant="top" label="전역 탐색" className="hidden min-w-0 flex-1 border-0 md:flex" />
    {showActions&&<div className="ml-auto flex shrink-0 items-center gap-[var(--aui-space-1)]">{actions ?? <><Button variant="ghost" size="icon-touch" aria-label="검색"><Search /></Button><Button variant="ghost" size="icon-touch" aria-label="내 정보"><User /></Button></>}</div>}
  </header>
}

function GlobalNavigation({ items = defaultItems, activeId = "home", alignment = "start", className }: { items?: NavigationItem[]; activeId?: string; alignment?: "start" | "center" | "end"; className?: string }) {
  return <Navigation items={items} activeId={activeId} variant="top" label="전역 탐색" className={cn(alignment === "center" && "justify-center", alignment === "end" && "justify-end", className)} />
}

function LocalNavigation({ title = "Workspace", items = defaultItems, activeId = "projects", width = "default", className }: { title?: React.ReactNode; items?: NavigationItem[]; activeId?: string; width?: "compact" | "default" | "wide"; className?: string }) {
  return <aside data-slot="local-navigation" data-width={width} className={cn("grid w-full gap-[var(--aui-space-3)] bg-[var(--aui-surface)] p-[var(--aui-space-3)]", width === "compact" && "max-w-48", width === "default" && "max-w-60", width === "wide" && "max-w-80", className)}><strong className="px-[var(--aui-space-3)] text-xs font-semibold text-[var(--aui-text-assistive)]">{title}</strong><Navigation items={items} activeId={activeId} variant="side" label="로컬 탐색" /></aside>
}

function BottomAppBar({ items = defaultItems, activeId = "home", itemCount = 3, position = "static", className }: { items?: NavigationItem[]; activeId?: string; itemCount?: number; position?: "static" | "fixed"; className?: string }) {
  return <div data-slot="bottom-app-bar" data-position={position} className={cn("w-full bg-[var(--aui-surface)] pb-[env(safe-area-inset-bottom)]", position === "fixed" && "sticky bottom-0 z-30 shadow-[0_-1px_8px_var(--aui-shadow-line)]", className)}><Navigation items={items.slice(0, Math.min(5, Math.max(3, itemCount)))} activeId={activeId} variant="bottom" label="하단 앱 탐색" /></div>
}

function AppFooter({ brand = "Aide", description = "일관된 제품 경험을 만드는 디자인 시스템", links = ["이용약관", "개인정보처리방침", "문의"], layout = "split", emphasis = "muted", className }: { brand?: React.ReactNode; description?: React.ReactNode; links?: string[]; layout?: "stack" | "split"; emphasis?: "plain" | "muted"; className?: string }) {
  return <footer data-slot="app-footer" data-layout={layout} className={cn("grid w-full gap-[var(--aui-space-4)] px-[var(--aui-space-5)] py-[var(--aui-space-6)] text-sm text-[var(--aui-text-muted)]", emphasis === "muted" ? "bg-[var(--aui-surface-muted)]" : "bg-[var(--aui-surface)]", layout === "split" && "md:grid-cols-[1fr_auto] md:items-end", className)}><div><strong className="block text-[var(--aui-text)]">{brand}</strong><p className="mt-[var(--aui-space-2)]">{description}</p></div><nav aria-label="푸터 탐색" className="flex flex-wrap gap-x-[var(--aui-space-4)] gap-y-[var(--aui-space-2)]">{links.map((link)=><a key={link} href="#" className="rounded-[var(--aui-radius-sm)] outline-none hover:text-[var(--aui-text)] focus-visible:shadow-[var(--aui-shadow-focus)]">{link}</a>)}</nav></footer>
}

function TopNavigation({ type = "root", title = "페이지 제목", subtitle, onBack, onClose, actions, className }: { type?: "root" | "standard"; title?: React.ReactNode; subtitle?: React.ReactNode; onBack?: () => void; onClose?: () => void; actions?: React.ReactNode; className?: string }) {
  return <header data-slot="top-navigation" data-type={type} className={cn("sticky top-0 z-30 grid min-h-[var(--aui-header-height)] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[var(--aui-space-2)] bg-[var(--aui-surface)] px-[var(--aui-space-4)]", className)}>
    <div>{type === "standard"&&<Button variant="ghost" size="icon-touch" aria-label={onClose ? "닫기" : "뒤로가기"} onClick={onClose ?? onBack}>{onClose ? <X/> : <ArrowLeft/>}</Button>}</div>
    <div className={cn("min-w-0", type === "standard" && "text-center")}><strong className="block truncate text-base text-[var(--aui-text)]">{title}</strong>{subtitle&&<span className="block truncate text-xs text-[var(--aui-text-muted)]">{subtitle}</span>}</div>
    <div className="flex justify-end gap-[var(--aui-space-1)]">{actions ?? <Button variant="ghost" size="icon-touch" aria-label="검색"><Search/></Button>}</div>
  </header>
}

function SideNavigation(props: React.ComponentProps<typeof LocalNavigation>) {
  return <LocalNavigation {...props}/>
}

function SidePanel({ title = "Inspector", children, side = "right", width = "default", className }: { title?: React.ReactNode; children?: React.ReactNode; side?: "left" | "right"; width?: "compact" | "default" | "wide"; className?: string }) {
  return <aside data-slot="side-panel" data-side={side} data-width={width} className={cn("grid min-h-64 w-full grid-rows-[auto_1fr] bg-[var(--aui-surface)] shadow-[var(--aui-shadow-subtle)]", width === "compact" && "max-w-60", width === "default" && "max-w-72", width === "wide" && "max-w-96", className)}><header className="flex min-h-[var(--aui-control-prominent)] items-center border-b border-[var(--aui-border-subtle)] px-[var(--aui-space-4)] font-semibold">{title}</header><div className="p-[var(--aui-space-4)] text-sm text-[var(--aui-text-muted)]">{children}</div></aside>
}

function PageHeader({ eyebrow, title = "페이지 제목", description, actions, className }: { eyebrow?: React.ReactNode; title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return <header data-slot="page-header" className={cn("grid gap-[var(--aui-space-3)] py-[var(--aui-space-5)] md:grid-cols-[minmax(0,1fr)_auto] md:items-end", className)}><div>{eyebrow&&<span className="text-xs font-semibold text-[var(--aui-primary)]">{eyebrow}</span>}<h1 className="m-0 mt-[var(--aui-space-1)] text-3xl font-bold text-[var(--aui-text)]">{title}</h1>{description&&<p className="mt-[var(--aui-space-2)] max-w-2xl text-sm leading-6 text-[var(--aui-text-muted)]">{description}</p>}</div>{actions&&<div className="flex flex-wrap gap-[var(--aui-space-2)]">{actions}</div>}</header>
}

function SectionHeader({ title = "섹션 제목", description, trailing, level = "h2", className }: { title?: React.ReactNode; description?: React.ReactNode; trailing?: React.ReactNode; level?: "h2" | "h3"; className?: string }) {
  const Heading = level
  return <header data-slot="section-header" className={cn("flex min-h-[var(--aui-control-prominent)] items-start justify-between gap-[var(--aui-space-4)] py-[var(--aui-space-3)]", className)}><div><Heading className="m-0 text-lg font-bold text-[var(--aui-text)]">{title}</Heading>{description&&<p className="mt-[var(--aui-space-1)] text-sm text-[var(--aui-text-muted)]">{description}</p>}</div>{trailing&&<div className="shrink-0">{trailing}</div>}</header>
}

function WorkspaceShell({ header, navigation, inspector, children, className }: { header?: React.ReactNode; navigation?: React.ReactNode; inspector?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return <div data-slot="workspace-shell" className={cn("grid min-h-80 w-full grid-rows-[auto_1fr] overflow-hidden bg-[var(--aui-page)]", className)}>{header}<div className="grid min-h-0 md:grid-cols-[auto_minmax(0,1fr)_auto]">{navigation}<main className="min-w-0 p-[var(--aui-space-5)]">{children}</main>{inspector}</div></div>
}

export { AppHeader, GlobalNavigation, LocalNavigation, BottomAppBar, AppFooter, TopNavigation, SideNavigation, SidePanel, PageHeader, SectionHeader, WorkspaceShell }
