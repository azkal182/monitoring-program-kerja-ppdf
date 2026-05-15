"use client";

import { useState } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { useUsers, useDeleteUser, type User } from "@/hooks/use-users";
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
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { PageContent } from "@/components/dashboard/page-content";

const roleLabels = {
  ADMIN: { label: "Admin", variant: "default" as const },
  KOORDINATOR: { label: "Koordinator", variant: "secondary" as const },
  ANGGOTA: { label: "Anggota", variant: "outline" as const },
};

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: users, isLoading } = useUsers({
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const deleteMutation = useDeleteUser();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const hasNextPage = (users?.length ?? 0) === pageSize;
  const hasPrevPage = page > 1;

  function handleEdit(user: User) {
    setSelectedUser(user);
    setDialogOpen(true);
  }

  function handleCreate() {
    setSelectedUser(null);
    setDialogOpen(true);
  }

  async function handleDelete(user: User) {
    if (!confirm(`Hapus pengguna "${user.name}"?`)) return;

    try {
      await deleteMutation.mutateAsync(user.id);
      toast.success("Pengguna berhasil dihapus");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus pengguna");
    }
  }

  return (
    <PageContent
      title="Pengguna"
      description="Kelola pengguna sistem"
      actions={
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Tambah Pengguna
        </Button>
      }
    >

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengguna</CardTitle>
          <CardDescription>
            Semua pengguna yang terdaftar di sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : users?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Belum ada pengguna</p>
              <Button onClick={handleCreate} variant="link">
                Tambah pengguna pertama
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Divisi</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">@{user.username}</TableCell>
                        <TableCell>
                          <Badge variant={roleLabels[user.role].variant}>
                            {roleLabels[user.role].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.division?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(user)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(user)}
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
                {users?.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-lg border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold leading-tight">{user.name}</p>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(user)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant={roleLabels[user.role].variant}>
                        {roleLabels[user.role].label}
                      </Badge>
                      <span className="text-muted-foreground">
                        {user.division?.name || "Tidak ada divisi"}
                      </span>
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

      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
      />
    </PageContent>
  );
}
