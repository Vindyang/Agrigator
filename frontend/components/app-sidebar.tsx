import * as React from "react"

import { SearchForm } from "@/components/search-form"
import { VersionSwitcher } from "@/components/version-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const data: {
  versions: string[]
  navMain: { title: string; url: string; items: { title: string; url: string; isActive?: boolean }[] }[]
} = {
  versions: ["1.0.0"],
  navMain: [
    {
      title: "Overview",
      url: "#",
      items: [
        { title: "Dashboard", url: "#", isActive: true },
      ],
    },
    {
      title: "Monitoring",
      url: "#",
      items: [
        { title: "Weather Reports", url: "#" },
        { title: "Pest Alerts", url: "#" },
      ],
    },
    {
      title: "Farm Tools",
      url: "#",
      items: [
        { title: "Wholesale Prices", url: "#" },
        { title: "Crop Calendar", url: "#" },
        { title: "News Feed", url: "#" },
        { title: "Farm Notes", url: "#" },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <VersionSwitcher
          versions={data.versions}
          defaultVersion={data.versions[0]}
          name="AgriGuard"
        />
        <SearchForm />
      </SidebarHeader>
      <SidebarContent>
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive}>
                      <a href={item.url}>{item.title}</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
