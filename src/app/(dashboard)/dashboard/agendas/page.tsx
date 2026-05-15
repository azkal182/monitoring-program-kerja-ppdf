"use client";

import { useConfirmation } from "@/app/confirmation-context";
import AgendaFormDialog from "@/components/agendas/agenda-form-dialog";
import KuartalFormDialog from "@/components/agendas/kuartal-form-dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuarter } from "@/hooks/quarter";
import {
  useAgendas,
  useDeleteAgenda,
  useMarkAgendaDone,
} from "@/hooks/use-agenda";
import { AgendaInput } from "@/lib/validations/agenda";
import { format, parse } from "date-fns";
import {
  CalendarDays,
  Check,
  Pencil,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { PageContent } from "@/components/dashboard/page-content";

const AgendasPage = () => {
  const { confirm } = useConfirmation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [agendaDialogOpen, setAgendaDialogOpen] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState<
    (AgendaInput & { id: string }) | null
  >(null);

  const { data: session } = useSession();
  const { data: quarters } = useQuarter();
  const { data: agendas } = useAgendas();

  const { mutate: deleteAgenda } = useDeleteAgenda();
  const { mutate: markAsDone } = useMarkAgendaDone();
  const isAdmin = session?.user?.role === "ADMIN";

  const [selectedQuarterId, setSelectedQuarterId] = useState<
    string | undefined
  >();

  const currentQuarterId = selectedQuarterId ?? quarters?.[0]?.id;

  const selectedQuarter = quarters?.find((q) => q.id === currentQuarterId);

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: `Hapus agenda "${name}"?`,
      description: "Data tidak dapat dikembalikan.",
      confirmLabel: "Ya, Hapus",
      variant: "danger",
    });

    if (!confirmed) return;

    deleteAgenda(id, {
      onSuccess: () => {
        toast.success(`Agenda "${name}" berhasil dihapus`);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Gagal menghapus");
      },
    });
  };

  const handleDone = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: `Tandai agenda "${name}" sebagai selesai?`,
      description: "Aksi ini dapat diubah kembali jika diperlukan.",
      confirmLabel: "Ya, Tandai Selesai",
      variant: "success",
    });

    if (!confirmed) return;

    markAsDone(id, {
      onSuccess: () => {
        toast.success(`Agenda "${name}" ditandai selesai`);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Gagal update");
      },
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = (agenda: any) => {
    setSelectedAgenda(agenda);
    setAgendaDialogOpen(true);
  };

  return (
    <PageContent
      title="Agenda"
      description="Pantau agenda yang harus diselesaikan sebelum tanggal tertentu."
      actions={
        isAdmin ? (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => setDialogOpen(true)}
            >
              <Plus />
              Kuartal
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => setAgendaDialogOpen(true)}
            >
              <Plus />
              Agenda
            </Button>
          </div>
        ) : null
      }
    >

      <Card className="shadow-sm">
        <CardHeader className="space-y-3">
          <div>
            <CardTitle>Daftar Agenda Nasional</CardTitle>
            <CardDescription>
              Filter Agenda berdasarkan Kuartal.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Kuartal</span>
                <Select
                  value={currentQuarterId}
                  onValueChange={(value) => setSelectedQuarterId(value)}
                >
                  <SelectTrigger className="h-9 w-55">
                    <SelectValue placeholder="Pilih Kuartal" />
                  </SelectTrigger>
                  <SelectContent>
                    {quarters?.map((quarter) => (
                      <SelectItem key={quarter.id} value={quarter.id}>
                        {quarter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* ───── Desktop: Table ───── */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Agenda</TableHead>
                  <TableHead>PJ Umum</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agendas?.map((agenda, index) => (
                  <TableRow key={agenda.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="capitalize font-medium">
                      {agenda.name}
                    </TableCell>
                    <TableCell>{agenda.personResponsible}</TableCell>
                    <TableCell>
                      {format(
                        parse(agenda.date, "yyyy-MM-dd", new Date()),
                        "dd MMMM yyyy",
                      )}
                    </TableCell>
                    <TableCell>
                      {agenda.completed ? (
                        <Badge variant="default">Selesai</Badge>
                      ) : (
                        <Badge variant="destructive">Belum</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleEdit(agenda)}
                          disabled={!isAdmin}
                          variant="outline"
                          size="icon-sm"
                        >
                          <Pencil />
                          {/* Edit */}
                        </Button>
                        <Button
                          onClick={() => handleDelete(agenda.id, agenda.name)}
                          disabled={!isAdmin}
                          variant="outline"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 />
                          {/* Hapus */}
                        </Button>
                        <Button
                          onClick={() => handleDone(agenda.id, agenda.name)}
                          disabled={!isAdmin}
                          variant="outline"
                          size="icon-sm"
                          className="text-primary hover:text-primary"
                        >
                          <Check />
                          {/* Selesai */}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>

          {/* ───── Mobile: Cards ───── */}
          <div className="flex flex-col gap-3 lg:hidden">
            {agendas?.map((agenda, index) => (
              <div
                key={agenda.id}
                className="rounded-xl border bg-card p-4 shadow-sm space-y-3"
              >
                {/* Header baris: nomor + nama agenda */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="shrink-0">
                      #{index + 1}
                    </Badge>
                    <span className="font-semibold capitalize leading-snug">
                      {agenda.name}
                    </span>
                  </div>
                </div>

                {/* Detail */}
                <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 shrink-0" />
                    <span>{agenda.personResponsible}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>
                      {format(
                        parse(agenda.date, "yyyy-MM-dd", new Date()),
                        "dd MMMM yyyy",
                      )}
                    </span>
                  </div>
                </div>

                {/* Aksi */}
                {isAdmin && (
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Button
                      onClick={() => handleEdit(agenda)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(agenda.id, agenda.name)}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Hapus
                    </Button>
                    <Button
                      onClick={() => handleDone(agenda.id, agenda.name)}
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
            ))}

            {/* Empty state */}
            {(!agendas || agendas.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Belum ada agenda.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Kuartal Form Dialog */}
      <KuartalFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* Agenda Form Dialog - Fitur ini masih dalam pengembangan */}
      <AgendaFormDialog
        open={agendaDialogOpen}
        onOpenChange={(open) => {
          setAgendaDialogOpen(open);

          // reset selected agenda saat dialog ditutup
          if (!open) {
            setSelectedAgenda(null);
          }
        }}
        quarter={selectedQuarter}
        agenda={selectedAgenda ?? undefined}
      />
    </PageContent>
  );
};

export default AgendasPage;
