"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Building2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import {
  useDivisions,
  useDeleteDivision,
  type Division,
} from "@/hooks/use-divisions";
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
import { DivisionFormDialog } from "@/components/divisions/division-form-dialog";

export default function DivisionsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: divisions, isLoading } = useDivisions({
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const deleteMutation = useDeleteDivision();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(
    null
  );
  const hasNextPage = (divisions?.length ?? 0) === pageSize;
  const hasPrevPage = page > 1;

  useEffect(() => {
    if (!isLoading && (divisions?.length ?? 0) === 0 && page > 1) {
      setPage((prev) => Math.max(prev - 1, 1));
    }
  }, [divisions, isLoading, page]);

  function handleEdit(division: Division) {
    setSelectedDivision(division);
    setDialogOpen(true);
  }

  function handleCreate() {
    setSelectedDivision(null);
    setDialogOpen(true);
  }

  async function handleDelete(division: Division) {
    if (!confirm(`Hapus divisi "${division.name}"?`)) return;

    try {
      await deleteMutation.mutateAsync(division.id);
      toast.success("Divisi berhasil dihapus");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus divisi"
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Departemen</h1>
          <p className="text-muted-foreground">
            Kelola Departemen/Asrama kerja di pondok
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Departemen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Departemen/Asrama</CardTitle>
          <CardDescription>
            Semua Departemen/Asrama yang terdaftar di sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : divisions?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Belum ada divisi</p>
              <Button onClick={handleCreate} variant="link">
                Tambah Departemen pertama
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      {/* <TableHead className="text-center">Anggota</TableHead> */}
                      <TableHead className="text-center">Program</TableHead>
                      <TableHead className="w-10">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {divisions?.map((division) => (
                      <TableRow key={division.id}>
                        <TableCell className="font-medium">
                          <div className="space-y-0.5">
                            <div>{division.name}</div>
                            {division.phoneNumber && (
                              <div className="text-xs text-muted-foreground">
                                {division.phoneNumber}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[360px]">
                          {division.description ? (
                            <p
                              className="line-clamp-2 break-words"
                              title={division.description}
                            >
                              {division.description}
                            </p>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        {/* <TableCell className="text-center">
                          <Badge variant="secondary">
                            {division._count?.users || 0}
                          </Badge>
                        </TableCell> */}
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {division._count?.programs || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/divisions/${division.id}`}
                                  className="flex items-center"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Detail
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(division)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(division)}
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
                {divisions?.map((division) => (
                  <div
                    key={division.id}
                    className="rounded-lg border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-base font-semibold leading-tight">
                          {division.name}
                        </p>
                        {division.phoneNumber && (
                          <p className="text-xs text-muted-foreground">
                            {division.phoneNumber}
                          </p>
                        )}
                        {division.description && (
                          <p
                            className="text-sm text-muted-foreground line-clamp-2 break-words"
                            title={division.description}
                          >
                            {division.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-sm">
                          <Badge variant="secondary">
                            {division._count?.users || 0} anggota
                          </Badge>
                          <Badge variant="outline">
                            {division._count?.programs || 0} program
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
                          <DropdownMenuItem
                            onClick={() => handleEdit(division)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(division)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <Link href={`/dashboard/divisions/${division.id}`}>
                          Detail
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(division)}
                      >
                        Edit
                      </Button>
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

      <DivisionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        division={selectedDivision}
      />
    </div>
  );
}
