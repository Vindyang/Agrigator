"use client"

import { Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const NAV = [
  {
    label: "Monitoring",
    items: [
      { href: "/", label: "Dashboard" },
      { href: "/weather", label: "Weather Reports" },
      { href: "/pests", label: "Pest Alerts" },
    ],
  },
  {
    label: "Farm Tools",
    items: [
      { href: "/prices", label: "Wholesale Prices" },
      { href: "/calendar", label: "Crop Calendar" },
      { href: "/news", label: "News Feed" },
      { href: "/notes", label: "Farm Notes" },
    ],
  },
] as const

export function AppSidebar() {
  const pathname = usePathname()
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href))

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="h-14 justify-center border-b border-hairline px-5">
        <div className="flex items-center gap-2.5">
          <span className="size-3 bg-paddy" aria-hidden />
          <span className="font-display text-[17px] font-semibold tracking-tight">
            AgriSentinel
          </span>
        </div>
      </SidebarHeader>

      <div className="border-b border-hairline px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-2">Region</p>
        <p className="mt-1 text-sm font-medium">Jawa Timur</p>
      </div>

      <SidebarContent className="px-3 py-5">
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <Link
                        href={item.href}
                        className={
                          "block border-l-2 px-2 py-1.5 text-sm transition-colors " +
                          (active
                            ? "border-paddy bg-paper-2 font-semibold text-ink"
                            : "border-transparent text-ink-2 hover:bg-paper-2 hover:text-ink")
                        }
                      >
                        {item.label}
                      </Link>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <div className="border-t border-hairline px-3 py-3">
        <Link
          href="/settings"
          className={
            "flex items-center gap-2 px-2 py-1.5 text-sm transition-colors " +
            (isActive("/settings") ? "font-semibold text-ink" : "text-ink-2 hover:text-ink")
          }
        >
          <Settings className="size-4" />
          Settings
        </Link>
      </div>

      <SidebarFooter className="flex-row items-center gap-3 border-t border-hairline p-4">
        <div className="flex size-8 items-center justify-center border border-hairline text-[11px] font-semibold tabular">
          SK
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold leading-tight">Sujatmiko K.</p>
          <p className="text-[10px] uppercase tracking-wider text-ink-2">Extension Officer</p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
