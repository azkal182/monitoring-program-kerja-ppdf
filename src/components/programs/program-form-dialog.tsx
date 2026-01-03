"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ScheduleType } from "@prisma/client";

import { programSchema, type ProgramInput } from "@/lib/validations/program";
import { useCreateProgram, useUpdateProgram, type Program } from "@/hooks/use-programs";
import { useDivisions } from "@/hooks/use-divisions";
import { getDayName } from "@/lib/utils";
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
  FormDescription,
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
import { Badge } from "@/components/ui/badge";

interface ProgramFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program?: Program | null;
}

const scheduleTypeOptions = [
  { value: ScheduleType.DAILY, label: "Harian" },
  { value: ScheduleType.WEEKLY, label: "Mingguan" },
  { value: ScheduleType.MONTHLY, label: "Bulanan" },
  { value: ScheduleType.CUSTOM, label: "Kustom" },
];

const days = [
  { value: 0, label: "Minggu" },
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
];

export function ProgramFormDialog({
  open,
  onOpenChange,
  program,
}: ProgramFormDialogProps) {
  const isEditing = !!program;
  const createMutation = useCreateProgram();
  const updateMutation = useUpdateProgram();
  const { data: divisions } = useDivisions();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProgramInput>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: "",
      description: "",
      scheduleType: ScheduleType.DAILY,
      scheduleDays: [1, 2, 3, 4, 5, 6, 0],
      scheduleTime: "07:00",
      minPhotos: 1,
      isActive: true,
      divisionId: "",
    },
  });

  useEffect(() => {
    if (program) {
      form.reset({
        name: program.name,
        description: program.description || "",
        scheduleType: program.scheduleType,
        scheduleDays: program.scheduleDays,
        scheduleTime: program.scheduleTime || "07:00",
        minPhotos: program.minPhotos,
        isActive: program.isActive,
        divisionId: program.divisionId,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        scheduleType: ScheduleType.DAILY,
        scheduleDays: [1, 2, 3, 4, 5, 6, 0],
        scheduleTime: "07:00",
        minPhotos: 1,
        isActive: true,
        divisionId: "",
      });
    }
  }, [program, form]);

  async function onSubmit(data: ProgramInput) {
    setIsLoading(true);
    try {
      if (isEditing && program) {
        await updateMutation.mutateAsync({ ...data, id: program.id });
        toast.success("Program berhasil diperbarui");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Program berhasil ditambahkan");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

  const selectedDays = form.watch("scheduleDays");

  function toggleDay(dayValue: number) {
    const current = form.getValues("scheduleDays");
    if (current.includes(dayValue)) {
      form.setValue(
        "scheduleDays",
        current.filter((d) => d !== dayValue),
        { shouldValidate: true }
      );
    } else {
      form.setValue("scheduleDays", [...current, dayValue].sort(), {
        shouldValidate: true,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Program Kerja" : "Tambah Program Kerja"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Perbarui informasi program kerja"
              : "Isi form untuk menambah program kerja baru"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Program</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Patroli Pagi" {...field} />
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
                    <Textarea placeholder="Deskripsi program..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="divisionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Divisi</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih divisi" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {divisions?.map((division) => (
                        <SelectItem key={division.id} value={division.id}>
                          {division.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Jadwal</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {scheduleTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduleTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Waktu</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="scheduleDays"
              render={() => (
                <FormItem>
                  <FormLabel>Hari Terjadwal</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {days.map((day) => (
                      <Badge
                        key={day.value}
                        variant={
                          selectedDays.includes(day.value)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => toggleDay(day.value)}
                      >
                        {day.label.slice(0, 3)}
                      </Badge>
                    ))}
                  </div>
                  <FormDescription>
                    Klik untuk memilih/batal hari
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minPhotos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimal Foto</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "true")}
                      value={field.value ? "true" : "false"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Aktif</SelectItem>
                        <SelectItem value="false">Nonaktif</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                  "Simpan"
                ) : (
                  "Tambah"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
