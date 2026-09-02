"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { CalendarClock, MoreHorizontal, Pencil, Trash2, Plus, Check } from "lucide-react";
import { toast } from "sonner";

import {
  useDeadlines,
  useDeleteDeadline,
  useMarkDeadlineDone,
  type Deadline,
} from "@/hooks/use-deadlines";
import { useConfirmation } from "@/contexts/confirmation-context";
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
  const markDoneMutation = useMarkDeadlineDone();
  const { confirm } = useConfirmation();
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

  async function handleDone(deadline: Deadline) {
    const isDone = deadline.completed;
    const actionText = isDone ? "Membatalkan status selesai" : "Menandai selesai";
    
    const confirmed = await confirm({
      title: `${actionText} "${deadline.title}"?`,
      description: isDone 
        ? "Deadline akan kembali berstatus belum selesai."
        : "Deadline akan ditandai sebagai selesai.",
      confirmLabel: "Ya, Lanjutkan",
      variant: isDone ? "danger" : "success",
    });

    if (!confirmed) return;

    try {
      await markDoneMutation.mutateAsync(deadline.id);
      toast.success(isDone ? "Status selesai dibatalkan" : "Deadline ditandai selesai");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengupdate status");
    }
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
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Informasi Deadline</TableHead>
                      <TableHead className="w-32">Tanggal</TableHead>
                      <TableHead className="w-28">Waktu</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      {isAdmin && <TableHead className="w-[140px]">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deadlines?.map((deadline, index) => {
                      const daysRemaining = getDaysRemaining(deadline.dueDate, today);
                      return (
                        <TableRow key={deadline.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5 py-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{deadline.title}</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  {deadline.customDivision ?? deadline.division?.name ?? "Umum"}
                                </Badge>
                              </div>
                              {deadline.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 max-w-[500px]" title={deadline.description}>
                                  {deadline.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {formatDate(deadline.dueDate)}
                          </TableCell>
                          <TableCell>{renderDeadlineBadge(daysRemaining)}</TableCell>
                          <TableCell>
                            {deadline.completed ? (
                              <Badge variant="default">Selesai</Badge>
                            ) : (
                              <Badge variant="destructive">Belum</Badge>
                            )}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => handleEdit(deadline)}
                                  variant="outline"
                                  size="icon-sm"
                                  title="Edit"
                                >
                                  <Pencil />
                                </Button>
                                <Button
                                  onClick={() => handleDelete(deadline)}
                                  variant="outline"
                                  size="icon-sm"
                                  className="text-destructive hover:text-destructive"
                                  title="Hapus"
                                >
                                  <Trash2 />
                                </Button>
                                <Button
                                  onClick={() => handleDone(deadline)}
                                  variant="outline"
                                  size="icon-sm"
                                  className="text-primary hover:text-primary"
                                  title={deadline.completed ? "Batal Selesai" : "Tandai Selesai"}
                                >
                                  <Check />
                                </Button>
                              </div>
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
                {deadlines?.map((deadline, index) => {
                  const daysRemaining = getDaysRemaining(deadline.dueDate, today);
                  return (
                    <div
                      key={deadline.id}
                      className="rounded-lg border bg-card p-4 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 w-full">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="shrink-0">
                              #{index + 1}
                            </Badge>
                            <span className="font-semibold capitalize leading-snug">
                              {deadline.title}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(deadline.dueDate)} • {deadline.customDivision ?? deadline.division?.name ?? "Umum"}
                          </p>
                          {deadline.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 break-words" title={deadline.description}>
                              {deadline.description}
                            </p>
                          )}
                          <div className="flex gap-2 pt-1">
                            {renderDeadlineBadge(daysRemaining)}
                            {deadline.completed ? (
                              <Badge variant="default">Selesai</Badge>
                            ) : (
                              <Badge variant="destructive">Belum</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {isAdmin && (
                        <div className="flex items-center gap-2 pt-1 border-t">
                          <Button
                            onClick={() => handleEdit(deadline)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDelete(deadline)}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Hapus
                          </Button>
                          <Button
                            onClick={() => handleDone(deadline)}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-primary hover:text-primary"
                          >
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            Selesai
                          </Button>
                        </div>
                      )}
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
