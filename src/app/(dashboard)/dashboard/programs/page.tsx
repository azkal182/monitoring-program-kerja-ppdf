"use client";

import { useState } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, ClipboardList, Clock, Camera } from "lucide-react";
import { toast } from "sonner";

import { usePrograms, useDeleteProgram, type Program } from "@/hooks/use-programs";
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
import { ProgramFormDialog } from "@/components/programs/program-form-dialog";

const scheduleTypeLabels = {
  DAILY: "Harian",
  WEEKLY: "Mingguan",
  MONTHLY: "Bulanan",
  CUSTOM: "Kustom",
};

export default function ProgramsPage() {
  const { data: programs, isLoading } = usePrograms();
  const deleteMutation = useDeleteProgram();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

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
      toast.error(error instanceof Error ? error.message : "Gagal menghapus program");
    }
  }

  function formatDays(days: number[]): string {
    if (days.length === 7) return "Setiap hari";
    if (days.length === 6 && !days.includes(0)) return "Senin - Sabtu";
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return "Senin - Jumat";
    return days.map((d) => getDayName(d).slice(0, 3)).join(", ");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Program Kerja</h1>
          <p className="text-muted-foreground">
            Kelola program kerja setiap divisi
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Program
        </Button>
      </div>

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
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program</TableHead>
                      <TableHead>Divisi</TableHead>
                      <TableHead>Jadwal</TableHead>
                      <TableHead className="text-center">Foto</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs?.map((program) => (
                      <TableRow key={program.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{program.name}</div>
                            {program.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {program.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{program.division.name}</Badge>
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
                          <div className="flex items-center justify-center gap-1">
                            <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{program.minPhotos}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={program.isActive ? "default" : "secondary"}>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 md:hidden">
                {programs?.map((program) => (
                  <div key={program.id} className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-base font-semibold leading-tight">{program.name}</p>
                        {program.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {program.description}
                          </p>
                        )}
                        <Badge variant="outline">{program.division.name}</Badge>
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
                        <span>{program.scheduleTime || "Tidak dijadwalkan"}</span>
                      </div>
                      <div className="text-xs">
                        {formatDays(program.scheduleDays)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        <span>Minimal {program.minPhotos} foto</span>
                      </div>
                      <Badge variant={program.isActive ? "default" : "secondary"} className="w-fit">
                        {program.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
