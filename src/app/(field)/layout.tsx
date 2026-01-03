"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        <div className="container flex h-14 items-center gap-4 px-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Laporan Hari Ini</h1>
            <p className="text-xs text-muted-foreground">
              {session?.user?.divisionName || "Semua Divisi"}
            </p>
          </div>
          {session?.user && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              {session.user.name?.split(" ")[0]}
            </Badge>
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
