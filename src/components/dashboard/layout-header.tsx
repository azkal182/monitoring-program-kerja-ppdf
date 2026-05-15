"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DashboardSidebar,
  DashboardUserMenu,
} from "@/components/dashboard/sidebar";

interface DashboardLayoutHeaderProps {
  showSearch?: boolean;
}

export function DashboardLayoutHeader({
  showSearch = false,
}: DashboardLayoutHeaderProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="xl:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col p-0">
              <DashboardSidebar
                variant="sheet"
                onNavigate={() => setSheetOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" className="text-lg font-semibold sm:text-xl">
            KHIDMAH
          </Link>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <span className="text-sm text-muted-foreground">{pageTitle}</span>
        </div>

        {showSearch && (
          <div className="hidden flex-1 items-center gap-2 md:flex">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari data..."
              className="w-full border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          <DashboardUserMenu buttonClassName="justify-between md:min-w-[220px]" />
        </div>
      </div>
    </header>
  );
}

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard/divisions")) return "Departemen";
  if (pathname.startsWith("/dashboard/users")) return "Pengguna";
  if (pathname.startsWith("/dashboard/programs")) return "Program Kerja";
  if (pathname.startsWith("/dashboard/schedules")) return "Jadwal";
  if (pathname.startsWith("/dashboard/deadlines")) return "Deadline";
  if (pathname.startsWith("/dashboard/monitoring")) return "Monitoring";
  if (pathname === "/dashboard" || pathname === "/dashboard/") return "Beranda";
  return "Monitoring";
}
