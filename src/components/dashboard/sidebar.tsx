"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  Users,
  ClipboardList,
  Calendar,
  BarChart3,
  LogOut,
  ChevronDown,
  Menu,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Divisi", href: "/dashboard/divisions", icon: Building2, adminOnly: true },
  { name: "Pengguna", href: "/dashboard/users", icon: Users, adminOnly: true },
  { name: "Program Kerja", href: "/dashboard/programs", icon: ClipboardList },
  { name: "Jadwal", href: "/dashboard/schedules", icon: Calendar },
  { name: "Monitoring", href: "/dashboard/monitoring", icon: BarChart3 },
];

function NavItems({ className, onClick }: { className?: string; onClick?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <nav className={cn("space-y-1", className)}>
      {navigation
        .filter((item) => !item.adminOnly || isAdmin)
        .map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) ||
            (item.href === "/dashboard" && (pathname === "/dashboard" || pathname === "/dashboard/"));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClick}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/40"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full transition-all",
                  isActive ? "bg-primary opacity-100" : "bg-transparent opacity-0 group-hover:opacity-40 group-hover:bg-muted-foreground"
                )}
              />
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
    </nav>
  );
}

function UserMenu() {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) return null;

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = {
    ADMIN: "Admin",
    KOORDINATOR: "Koordinator",
    ANGGOTA: "Anggota",
  }[user.role];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-3 px-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col items-start text-left">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">@{session?.user?.username}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name}</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {roleLabel}
              </Badge>
              {user.divisionName && (
                <span className="text-xs text-muted-foreground">
                  {user.divisionName}
                </span>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardSidebar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <ClipboardList className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Monitoring</span>
          </Link>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <NavItems />
        </div>
        <div className="border-t p-4">
          <UserMenu />
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-card px-4 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-16 items-center border-b px-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <ClipboardList className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold">Monitoring</span>
              </Link>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-4">
              <NavItems onClick={() => setMobileOpen(false)} />
            </div>
            <div className="border-t p-4">
              <UserMenu />
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="font-semibold">Monitoring</span>
        </Link>
        <div className="ml-auto">
          {session?.user && (
            <Badge variant="outline">{session.user.divisionName || session.user.role}</Badge>
          )}
        </div>
      </header>
    </>
  );
}
