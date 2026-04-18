"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "../ui/field";
import { Input } from "../ui/input";

import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { PeriodPicker } from "../periode-picker";
import { useCreateQuarter } from "@/hooks/quarter";
import { toast } from "sonner";

interface DivisionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const kuartalFormSchema = z.object({
  name: z.string().min(1, "Nama kuartal wajib diisi"),
  period: z.string().min(1, "Periode wajib dipilih"),
});

const KuartalFormDialog = ({ open, onOpenChange }: DivisionFormDialogProps) => {
  const [loading, setLoading] = useState(false);
  const createMutation = useCreateQuarter();
  const form = useForm<z.infer<typeof kuartalFormSchema>>({
    defaultValues: {
      name: "",
      period: "",
    },
  });

  const handleSubmit = (data: z.infer<typeof kuartalFormSchema>) => {
    console.log("Form data:", data);
    setLoading(true);
    try {
      createMutation.mutate(data, {
        onSuccess: () => {
          setLoading(false);
          onOpenChange(false);
          toast.success("Kuartal berhasil ditambahkan");
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Form Kuartal</DialogTitle>
          <DialogDescription>
            Isi informasi kuartal di bawah ini.
          </DialogDescription>
        </DialogHeader>
        <div className="grid py-4">
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid w-full gap-4"
            id="kuartal-form"
          >
            <FieldSet>
              <FieldGroup>
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="name">
                        Nama Kuartal / Semester
                      </FieldLabel>
                      <Input
                        id="name"
                        autoComplete="off"
                        placeholder="Kuartal 1 (2025-2026) / Semester 1 (2025-2026)"
                        {...field}
                      />
                      {form.formState.errors.name && (
                        <FieldError>
                          {form.formState.errors.name.message}
                        </FieldError>
                      )}
                    </Field>
                  )}
                />

                <PeriodPicker
                  name="period"
                  control={form.control}
                  label="Periode"
                  placeholder="Pilih periode"
                  errorMessage={form.formState.errors.period?.message}
                />
              </FieldGroup>
            </FieldSet>
          </form>
        </div>
        <DialogFooter>
          <Button disabled={loading} type="submit" form="kuartal-form">
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default KuartalFormDialog;
