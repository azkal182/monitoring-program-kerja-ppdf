"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { divisionSchema, type DivisionInput } from "@/lib/validations/division";
import { useCreateDivision, useUpdateDivision, type Division } from "@/hooks/use-divisions";
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

interface DivisionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  division?: Division | null;
}

export function DivisionFormDialog({
  open,
  onOpenChange,
  division,
}: DivisionFormDialogProps) {
  const isEditing = !!division;
  const createMutation = useCreateDivision();
  const updateMutation = useUpdateDivision();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<DivisionInput>({
    resolver: zodResolver(divisionSchema),
    defaultValues: {
      name: division?.name || "",
      description: division?.description || "",
      phoneNumber: division?.phoneNumber || "",
    },
  });

  // Reset form when division changes
  useEffect(() => {
    if (division) {
      form.reset({
        name: division.name,
        description: division.description || "",
        phoneNumber: division.phoneNumber || "",
      });
    } else {
      form.reset({ name: "", description: "", phoneNumber: "" });
    }
  }, [division, form]);

  async function onSubmit(data: DivisionInput) {
    setIsLoading(true);
    try {
      if (isEditing && division) {
        await updateMutation.mutateAsync({ ...data, id: division.id });
        toast.success("Divisi berhasil diperbarui");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Divisi berhasil ditambahkan");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Divisi" : "Tambah Divisi Baru"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Perbarui informasi divisi"
              : "Isi form berikut untuk menambah divisi baru"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Divisi</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Keamanan" {...field} />
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
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Deskripsi singkat divisi..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor Telepon (Opsional)</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="Contoh: 0812-3456-7890"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                  "Tambah Divisi"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
