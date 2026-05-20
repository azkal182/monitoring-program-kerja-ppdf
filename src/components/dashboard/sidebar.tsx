"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  Users,
  ClipboardList,
  Calendar,
  CalendarClock,
  BarChart3,
  LogOut,
  ChevronDown,
  Bell,
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
import { Badge } from "@/components/ui/badge";

type NavigationItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  roles?: Array<"ADMIN" | "KOORDINATOR" | "ANGGOTA">;
  badge?: string;
};

type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

const navigationGroups: NavigationGroup[] = [
  {
    title: "Utama",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      {
        name: "Monitoring V2",
        href: "/dashboard/monitoring-v2",
        icon: BarChart3,
        badge: "New",
      },
      {
        name: "Laporan Hari Ini",
        href: "/dashboard/today",
        icon: ClipboardList,
        roles: ["KOORDINATOR"],
      },
    ],
  },
  {
    title: "Manajemen",
    items: [
      {
        name: "Departemen",
        href: "/dashboard/divisions",
        icon: Building2,
        adminOnly: true,
      },
      {
        name: "Pengguna",
        href: "/dashboard/users",
        icon: Users,
        adminOnly: true,
      },
      {
        name: "Program Kerja",
        href: "/dashboard/programs",
        icon: ClipboardList,
      },
    ],
  },
  {
    title: "Operasional",
    items: [
      { name: "Jadwal", href: "/dashboard/schedules", icon: Calendar },
      { name: "Kalender", href: "/dashboard/calendar", icon: Calendar },
      { name: "Deadline", href: "/dashboard/deadlines", icon: CalendarClock },
      { name: "Tugas", href: "/dashboard/tasks", icon: CalendarClock },
      { name: "Agenda", href: "/dashboard/agendas", icon: CalendarClock },

      {
        name: "Notifikasi",
        href: "/dashboard/push-notifications",
        icon: Bell,
        adminOnly: true,
      },
    ],
  },
  {
    title: "Monitoring",
    items: [
      {
        name: "Monitoring Lama",
        href: "/dashboard/monitoring",
        icon: BarChart3,
      },
    ],
  },
];

function NavItems({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const role = session?.user?.role;

  return (
    <nav className={cn("space-y-6", className)}>
      {navigationGroups.map((group) => {
        const visibleItems = group.items.filter((item) => {
          const passesAdminOnly = !item.adminOnly || isAdmin;
          const passesRoleFilter =
            !item.roles || (role ? item.roles.includes(role) : false);
          return passesAdminOnly && passesRoleFilter;
        });

        if (visibleItems.length === 0) return null;

        return (
          <div key={group.title} className="space-y-2">
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </h3>
            <div className="space-y-1">
              {visibleItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href + "/")) ||
                  (item.href === "/dashboard" &&
                    (pathname === "/dashboard" || pathname === "/dashboard/"));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClick}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/40"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full transition-all",
                        isActive
                          ? "bg-primary opacity-100"
                          : "bg-transparent opacity-0 group-hover:opacity-40 group-hover:bg-muted-foreground",
                      )}
                    />
                    <item.icon className="h-5 w-5" />
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

interface DashboardUserMenuProps {
  align?: "start" | "center" | "end";
  buttonClassName?: string;
}

export function DashboardUserMenu({
  align = "end",
  buttonClassName,
}: DashboardUserMenuProps) {
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
        <Button
          variant="ghost"
          className={cn("w-full justify-start gap-3 px-3", buttonClassName)}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col items-start text-left">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">
              @{session?.user?.username}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
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

interface DashboardSidebarProps {
  variant?: "desktop" | "sheet";
  onNavigate?: () => void;
}

function SidebarContent({
  onNavigate,
  userMenuAlign,
}: {
  onNavigate?: () => void;
  userMenuAlign?: "start" | "center" | "end";
}) {
  return (
    <>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <NavItems onClick={onNavigate} />
      </div>
      <div className="border-t bg-card/80 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <DashboardUserMenu align={userMenuAlign} />
      </div>
    </>
  );
}

export function DashboardSidebar({
  variant = "desktop",
  onNavigate,
}: DashboardSidebarProps) {
  if (variant === "sheet") {
    return (
      <div className="flex h-full flex-col bg-card">
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <ClipboardList className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">KHIDMAH</span>
          </Link>
        </div>
        <SidebarContent onNavigate={onNavigate} userMenuAlign="start" />
      </div>
    );
  }

  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-card shadow-sm xl:sticky xl:top-0 xl:flex">
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <ClipboardList className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">Khidmah</span>
        </Link>
      </div>
      <SidebarContent onNavigate={onNavigate} userMenuAlign="end" />
    </aside>
  );
}
