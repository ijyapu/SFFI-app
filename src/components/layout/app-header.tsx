"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { NAV_GROUPS } from "@/components/layout/nav-config";
import { NotificationBell } from "@/components/layout/notification-bell";

const UserButton = dynamic(
  () => import("@clerk/nextjs").then((m) => ({ default: m.UserButton })),
  { ssr: false }
);

function useBreadcrumb() {
  const pathname = usePathname();
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (
        item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname.startsWith(item.href)
      ) {
        return { group: group.label, page: item.title };
      }
    }
  }
  return { group: null, page: "Page" };
}

export function AppHeader() {
  const { group, page } = useBreadcrumb();

  return (
    <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm">
        {group && (
          <>
            <span className="text-muted-foreground">{group}</span>
            <span className="text-muted-foreground">/</span>
          </>
        )}
        <span className="font-medium">{page}</span>
      </nav>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <UserButton />
      </div>
    </header>
  );
}
