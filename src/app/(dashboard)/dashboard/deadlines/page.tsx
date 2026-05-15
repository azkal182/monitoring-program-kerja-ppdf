"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { CalendarClock, MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  useDeadlines,
  useDeleteDeadline,
  type Deadline,
} from "@/hooks/use-deadlines";
import { useDivisions } from "@/hooks/use-divisions";
import { formatDate } from "@/lib/utils";
import { formatInJakarta, startOfJakartaDayUtc } from "@/lib/timezone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeadlineFormDialog } from "@/components/deadlines/deadline-form-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContent } from "@/components/dashboard/page-content";

function formatMonthKey(date: Date) {
  return formatInJakarta(date, "yyyy-MM");
}

function getDaysRemaining(dueDate: string, today: Date) {
  const due = startOfJakartaDayUtc(dueDate);
  const diffMs = due.getTime() - today.getTime();
  return Math.round(diffMs / 86400000);
}

function renderDeadlineBadge(daysRemaining: number) {
  if (daysRemaining < 0) {
    return <Badge variant="destructive">Lewat</Badge>;
  }
  if (daysRemaining === 0) {
    return <Badge variant="secondary">Hari ini</Badge>;
  }
  if (daysRemaining <= 3) {
    return <Badge variant="outline">H-{daysRemaining}</Badge>;
  }
  return null;
}

export default function DeadlinesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [month, setMonth] = useState(() => formatMonthKey(new Date()));
  const [divisionFilter, setDivisionFilter] = useState<string | undefined>();
  const { data: deadlines, isLoading } = useDeadlines({
    month,
    divisionId: isAdmin ? divisionFilter : undefined,
  });
  const { data: divisions } = useDivisions();
  const deleteMutation = useDeleteDeadline();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null);

  const today = useMemo(() => startOfJakartaDayUtc(), []);

  function handleCreate() {
    setSelectedDeadline(null);
    setDialogOpen(true);
  }

  function handleEdit(deadline: Deadline) {
    setSelectedDeadline(deadline);
    setDialogOpen(true);
  }

  async function handleDelete(deadline: Deadline) {
    if (!confirm(`Hapus deadline "${deadline.title}"?`)) return;
    try {
      await deleteMutation.mutateAsync(deadline.id);
      toast.success("Deadline berhasil dihapus");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus deadline");
    }
  }

  return (
    <PageContent
      title="Deadline"
      description="Pantau target yang harus diselesaikan sebelum tanggal tertentu."
      actions={
        isAdmin ? (
          <Button onClick={handleCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Deadline
          </Button>
        ) : null
      }
    >

      <Card>
        <CardHeader className="space-y-3">
          <div>
            <CardTitle>Daftar Deadline Bulanan</CardTitle>
            <CardDescription>
              Filter deadline berdasarkan bulan dan divisi.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Bulan</span>
              <input
                type="month"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Divisi</span>
                <Select
                  value={divisionFilter ?? "all"}
                  onValueChange={(value) =>
                    setDivisionFilter(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger className="h-9 w-[220px]">
                    <SelectValue placeholder="Semua divisi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua divisi</SelectItem>
                    {divisions?.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : deadlines?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarClock className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Belum ada deadline di bulan ini</p>
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Judul</TableHead>
                      <TableHead>Divisi</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      {isAdmin && <TableHead className="w-10">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deadlines?.map((deadline) => {
                      const daysRemaining = getDaysRemaining(deadline.dueDate, today);
                      return (
                        <TableRow key={deadline.id}>
                          <TableCell className="font-medium">
                            {formatDate(deadline.dueDate)}
                          </TableCell>
                          <TableCell>{deadline.title}</TableCell>
                          <TableCell>
                            {deadline.division?.name ?? "Umum"}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[360px]">
                            {deadline.description ? (
                              <p className="line-clamp-2 break-words" title={deadline.description}>
                                {deadline.description}
                              </p>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{renderDeadlineBadge(daysRemaining)}</TableCell>
                          {isAdmin && (
                            <TableCell className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(deadline)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(deadline)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Hapus
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </div>

              <div className="grid gap-3 lg:hidden">
                {deadlines?.map((deadline) => {
                  const daysRemaining = getDaysRemaining(deadline.dueDate, today);
                  return (
                    <div
                      key={deadline.id}
                      className="rounded-lg border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-base font-semibold leading-tight">
                            {deadline.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(deadline.dueDate)} • {deadline.division?.name ?? "Umum"}
                          </p>
                          {deadline.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 break-words" title={deadline.description}>
                              {deadline.description}
                            </p>
                          )}
                          {renderDeadlineBadge(daysRemaining)}
                        </div>
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(deadline)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(deadline)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DeadlineFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deadline={selectedDeadline}
      />
    </PageContent>
  );
}
