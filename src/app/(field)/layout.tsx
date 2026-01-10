"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { ArrowLeft, LogOut, Menu, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function FieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center gap-3 px-4">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Navigasi</h2>
                    <p className="text-sm text-muted-foreground">Aksi cepat untuk petugas lapangan</p>
                  </div>
                  <div className="space-y-2">
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link href="/field/today">Jadwal Hari Ini</Link>
                    </Button>
                    <Button asChild variant="ghost" className="w-full justify-start">
                      <Link href="/dashboard">Kembali ke Dashboard</Link>
                    </Button>
                  </div>
                  {session?.user && (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Keluar
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/dashboard" className="hidden sm:block">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Kembali ke dashboard</span>
              </Button>
            </Link>
          </div>
          <div className="flex flex-1 flex-col">
            <h1 className="text-base font-semibold sm:text-lg">Laporan Hari Ini</h1>
            <p className="text-xs text-muted-foreground">
              {session?.user?.divisionName || "Semua Divisi"}
            </p>
          </div>
          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <UserCircle2 className="h-5 w-5" />
                  <div className="hidden flex-col items-start sm:flex">
                    <span className="text-sm font-medium leading-none">{session.user.name}</span>
                    <span className="text-xs text-muted-foreground leading-none">
                      @{session.user.username}
                    </span>
                  </div>
                  <Badge variant="outline" className="hidden sm:inline-flex">
                    {session.user.role === "ANGGOTA" ? "Anggota" : session.user.role}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{session.user.name}</p>
                    <p className="text-xs text-muted-foreground">@{session.user.username}</p>
                    {session.user.divisionName && (
                      <Badge variant="secondary" className="mt-1 w-fit">
                        {session.user.divisionName}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto max-w-2xl p-4">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 py-4 text-center text-xs text-muted-foreground">
        Monitoring Program Kerja © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
