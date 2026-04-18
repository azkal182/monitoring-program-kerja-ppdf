"use client";

import { useEffect, useState } from "react";

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
import { toast } from "sonner";
import { AgendaInput, agendaSchema } from "@/lib/validations/agenda";
import { useCreateAgenda, useUpdateAgenda } from "@/hooks/use-agenda";
import { Quarter } from "@/generated/prisma/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon } from "lucide-react";

import { Calendar } from "../ui/calendar";
import { format, parse } from "date-fns";

interface AgendaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quarter?: Quarter;
  agenda?: AgendaInput & { id: string };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const kuartalFormSchema = z.object({
  name: z.string().min(1, "Nama kuartal wajib diisi"),
  period: z.string().min(1, "Periode wajib dipilih"),
});

const AgendaFormDialog = ({
  open,
  onOpenChange,
  quarter,
  agenda,
}: AgendaFormDialogProps) => {
  const [loading, setLoading] = useState(false);
  const isEditing = !!agenda;
  const createMutation = useCreateAgenda();
  const updateAgenda = useUpdateAgenda();
  const form = useForm<AgendaInput>({
    resolver: zodResolver(agendaSchema),
    defaultValues: {
      name: "",
      personResponsible: "",
      date: format(new Date(), "yyyy-MM-dd"),
      quarterId: "",
    },
  });

  useEffect(() => {
    if (quarter?.id) {
      form.setValue("quarterId", quarter.id);
    }
  }, [quarter, form]);

  useEffect(() => {
    if (!open) return;

    if (agenda) {
      // EDIT MODE
      form.reset({
        name: agenda.name,
        personResponsible: agenda.personResponsible,
        date: agenda.date,
        quarterId: agenda.quarterId ?? quarter?.id ?? "",
      });
    } else {
      // CREATE MODE
      form.reset({
        name: "",
        personResponsible: "",
        date: format(new Date(), "yyyy-MM-dd"),
        quarterId: quarter?.id ?? "",
      });
    }
  }, [open, agenda, quarter, form]);

  const handleSubmit = async (data: AgendaInput) => {
    setLoading(true);

    try {
      const payload = {
        ...data,
        date: format(data.date, "yyyy-MM-dd"),
      };

      if (isEditing && agenda) {
        await updateAgenda.mutateAsync({ ...payload, id: agenda.id });
        onOpenChange(false);
        toast.success("Agenda berhasil diupdate");
      } else {
        await createMutation.mutateAsync(payload);
        onOpenChange(false);
        toast.success("Agenda berhasil ditambahkan");
      }
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
          <DialogTitle>Form Agenda - {quarter?.name}</DialogTitle>
          <DialogDescription>
            Isi informasi agenda di bawah ini.
          </DialogDescription>
        </DialogHeader>
        <div className="grid py-4">
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid w-full gap-4"
            id="kuartal-form"
          >
            <FieldSet>
              <FieldGroup className="gap-4">
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <Field className="gap-1">
                      <FieldLabel htmlFor="name">Nama Agenda</FieldLabel>
                      <Input
                        id="name"
                        autoComplete="off"
                        placeholder="Nama agenda"
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

                <Controller
                  name="personResponsible"
                  control={form.control}
                  render={({ field }) => (
                    <Field className="gap-4">
                      <FieldLabel htmlFor="personResponsible">
                        Penanggung Jawab
                      </FieldLabel>
                      <Input
                        id="personResponsible"
                        autoComplete="off"
                        placeholder="Nama penanggung jawab"
                        {...field}
                      />
                      {form.formState.errors.personResponsible && (
                        <FieldError>
                          {form.formState.errors.personResponsible.message}
                        </FieldError>
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="date"
                  control={form.control}
                  render={({ field }) => (
                    <Field className="gap-4">
                      <FieldLabel htmlFor="date">Tanggal</FieldLabel>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(new Date(field.value), "dd-MMM-yyyy")
                            ) : (
                              <span>Pilih tanggal</span>
                            )}
                          </Button>
                        </PopoverTrigger>

                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={
                              field.value
                                ? parse(field.value, "yyyy-MM-dd", new Date())
                                : undefined
                            }
                            onSelect={(date) =>
                              field.onChange(
                                date ? format(date, "yyyy-MM-dd") : "",
                              )
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      {form.formState.errors.date && (
                        <FieldError>
                          {form.formState.errors.date.message}
                        </FieldError>
                      )}
                    </Field>
                  )}
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

export default AgendaFormDialog;
