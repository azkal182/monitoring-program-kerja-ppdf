"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { deadlineSchema } from "@/lib/validations/deadline";
import {
  useCreateDeadline,
  useUpdateDeadline,
  type Deadline,
  type DeadlineInput,
} from "@/hooks/use-deadlines";
import { useDivisions } from "@/hooks/use-divisions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DeadlineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deadline?: Deadline | null;
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  return value.split("T")[0];
}

export function DeadlineFormDialog({
  open,
  onOpenChange,
  deadline,
}: DeadlineFormDialogProps) {
  const isEditing = !!deadline;
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const createMutation = useCreateDeadline();
  const updateMutation = useUpdateDeadline();
  const { data: divisions } = useDivisions();
  const [isLoading, setIsLoading] = useState(false);

  // Tentukan nilai awal select divisi
  function getInitialDivisionSelect(dl?: Deadline | null): string {
    if (!dl) return "all";
    if (dl.customDivision) return "custom";
    if (dl.divisionId) return dl.divisionId;
    return "all";
  }

  const [divisionSelect, setDivisionSelect] = useState<string>(() =>
    getInitialDivisionSelect(deadline)
  );

  const form = useForm<DeadlineInput>({
    resolver: zodResolver(deadlineSchema),
    defaultValues: {
      title: deadline?.title || "",
      description: deadline?.description || "",
      dueDate: toDateInput(deadline?.dueDate) || "",
      divisionId: deadline?.divisionId || null,
      customDivision: deadline?.customDivision || null,
    },
  });

  useEffect(() => {
    if (deadline) {
      const sel = getInitialDivisionSelect(deadline);
      setDivisionSelect(sel);
      form.reset({
        title: deadline.title,
        description: deadline.description || "",
        dueDate: toDateInput(deadline.dueDate),
        divisionId: deadline.divisionId || null,
        customDivision: deadline.customDivision || null,
      });
    } else {
      setDivisionSelect("all");
      form.reset({
        title: "",
        description: "",
        dueDate: "",
        divisionId: isAdmin ? null : session?.user?.divisionId ?? null,
        customDivision: null,
      });
    }
  }, [deadline, form, isAdmin, session?.user?.divisionId]);

  function handleDivisionSelectChange(value: string) {
    setDivisionSelect(value);
    if (value === "all") {
      form.setValue("divisionId", null);
      form.setValue("customDivision", null);
    } else if (value === "custom") {
      form.setValue("divisionId", null);
      form.setValue("customDivision", "");
    } else {
      form.setValue("divisionId", value);
      form.setValue("customDivision", null);
    }
  }

  async function onSubmit(data: DeadlineInput) {
    setIsLoading(true);
    try {
      const payload = deadlineSchema.parse({
        ...data,
        divisionId: isAdmin ? data.divisionId || null : session?.user?.divisionId,
        customDivision: divisionSelect === "custom" ? (data.customDivision || null) : null,
      });

      if (isEditing && deadline) {
        await updateMutation.mutateAsync({ ...payload, id: deadline.id });
        toast.success("Deadline berhasil diperbarui");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Deadline berhasil ditambahkan");
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Deadline" : "Tambah Deadline"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Perbarui informasi deadline"
              : "Isi form berikut untuk menambah deadline baru"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Judul</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Laporan Bulanan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal Deadline</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi (Opsional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Catatan atau detail deadline..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isAdmin && (
              <FormItem>
                <FormLabel>Divisi (Opsional)</FormLabel>
                <Select
                  value={divisionSelect}
                  onValueChange={handleDivisionSelectChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih divisi" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">Umum (Semua Divisi)</SelectItem>
                    {divisions?.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
            {isAdmin && divisionSelect === "custom" && (
              <FormField
                control={form.control}
                name="customDivision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Divisi Custom</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Masukkan nama divisi..."
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : isEditing ? (
                  "Simpan Perubahan"
                ) : (
                  "Tambah Deadline"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
