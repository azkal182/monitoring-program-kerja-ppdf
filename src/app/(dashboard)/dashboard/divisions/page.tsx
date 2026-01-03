"use client";

import { useState } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

import { useDivisions, useDeleteDivision, type Division } from "@/hooks/use-divisions";
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
  const { data: divisions, isLoading } = useDivisions();
  const deleteMutation = useDeleteDivision();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);

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
      toast.error(error instanceof Error ? error.message : "Gagal menghapus divisi");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Divisi</h1>
          <p className="text-muted-foreground">
            Kelola divisi/unit kerja di pondok
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Divisi
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Divisi</CardTitle>
          <CardDescription>
            Semua divisi yang terdaftar di sistem
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
                Tambah divisi pertama
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-center">Anggota</TableHead>
                  <TableHead className="text-center">Program</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {divisions?.map((division) => (
                  <TableRow key={division.id}>
                    <TableCell className="font-medium">{division.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {division.description || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{division._count?.users || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{division._count?.programs || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(division)}>
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
