"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ClipboardList,
  Clock,
  Camera,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import { useDivisions } from "@/hooks/use-divisions";
import {
  usePrograms,
  useDeleteProgram,
  type Program,
} from "@/hooks/use-programs";
import { getDayName } from "@/lib/utils";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProgramFormDialog } from "@/components/programs/program-form-dialog";
import { PageContent } from "@/components/dashboard/page-content";

const scheduleTypeLabels = {
  DAILY: "Harian",
  WEEKLY: "Mingguan",
  MONTHLY: "Bulanan",
  CUSTOM: "Kustom",
};

export default function ProgramsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: divisions } = useDivisions();
  const { data: programs, isLoading } = usePrograms(
    selectedDivisionId !== "all"
      ? {
          divisionId: selectedDivisionId,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }
      : { limit: pageSize, offset: (page - 1) * pageSize }
  );
  const deleteMutation = useDeleteProgram();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const hasNextPage = (programs?.length ?? 0) === pageSize;
  const hasPrevPage = page > 1;

  function handleEdit(program: Program) {
    setSelectedProgram(program);
    setDialogOpen(true);
  }

  function handleCreate() {
    setSelectedProgram(null);
    setDialogOpen(true);
  }

  async function handleDelete(program: Program) {
    if (!confirm(`Hapus program "${program.name}"?`)) return;

    try {
      await deleteMutation.mutateAsync(program.id);
      toast.success("Program berhasil dihapus");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus program"
      );
    }
  }

  function formatDays(days: number[]): string {
    if (days.length === 7) return "Setiap hari";
    if (days.length === 6 && !days.includes(0)) return "Senin - Sabtu";
    if (days.length === 5 && !days.includes(0) && !days.includes(6))
      return "Senin - Jumat";
    return days.map((d) => getDayName(d).slice(0, 3)).join(", ");
  }

  return (
    <PageContent
      title="Program Kerja"
      description="Kelola program kerja setiap Departemen/Asrama"
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {isAdmin && (
            <Select
              value={selectedDivisionId}
              onValueChange={(value) => {
                setSelectedDivisionId(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Semua Divisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Departemen</SelectItem>
                {divisions?.map((division) => (
                  <SelectItem key={division.id} value={division.id}>
                    {division.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Program
          </Button>
        </div>
      }
    >

      <Card>
        <CardHeader>
          <CardTitle>Daftar Program</CardTitle>
          <CardDescription>
            Semua program kerja yang terdaftar di sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : programs?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Belum ada program kerja</p>
              <Button onClick={handleCreate} variant="link">
                Tambah program pertama
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[320px] max-w-[320px]">Program</TableHead>
                      <TableHead>Divisi</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Jadwal</TableHead>
                      <TableHead className="text-center">Bukti</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs?.map((program) => (
                      <TableRow key={program.id}>
                        <TableCell className="w-[320px] max-w-[320px]">
                          <div className="max-w-[320px]">
                            <div className="font-medium">{program.name}</div>
                            {program.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {program.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {program.division.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {scheduleTypeLabels[program.scheduleType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{program.scheduleTime || "-"}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatDays(program.scheduleDays)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 text-sm">
                            {program.requirementType === "PHOTO" ? (
                              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span>
                              {program.minUploads}{" "}
                              {program.requirementType === "PHOTO"
                                ? "foto"
                                : "dokumen"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={program.isActive ? "default" : "secondary"}
                          >
                            {program.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEdit(program)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(program)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>

              <div className="grid gap-3 lg:hidden">
                {programs?.map((program) => (
                  <div
                    key={program.id}
                    className="rounded-lg border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-base font-semibold leading-tight">
                          {program.name}
                        </p>
                        {program.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {program.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {program.division.name}
                          </Badge>
                          <Badge variant="secondary">
                            {scheduleTypeLabels[program.scheduleType]}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(program)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(program)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {program.scheduleTime || "Tidak dijadwalkan"}
                        </span>
                      </div>
                      <div className="text-xs">
                        {formatDays(program.scheduleDays)}
                      </div>
                      <div className="flex items-center gap-2">
                        {program.requirementType === "PHOTO" ? (
                          <Camera className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                        <span>
                          Minimal {program.minUploads}{" "}
                          {program.requirementType === "PHOTO"
                            ? "foto"
                            : "dokumen"}
                        </span>
                      </div>
                      <Badge
                        variant={program.isActive ? "default" : "secondary"}
                        className="w-fit"
                      >
                        {program.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Halaman {page}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={!hasPrevPage}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={!hasNextPage}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ProgramFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        program={selectedProgram}
      />
    </PageContent>
  );
}
