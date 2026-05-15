"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, X, CalendarIcon } from "lucide-react";
import { ScheduleType } from "@/generated/prisma/enums";

import { z } from "zod";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { programSchema } from "@/lib/validations/program";
import {
  useCreateProgram,
  useUpdateProgram,
  type Program,
  type RequirementType,
} from "@/hooks/use-programs";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ProgramFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program?: Program | null;
}

type ProgramFormValues = z.input<typeof programSchema>;

const scheduleTypeOptions = [
  { value: ScheduleType.DAILY, label: "Harian", description: "Jalankan setiap hari yang dipilih" },
  { value: ScheduleType.WEEKLY, label: "Mingguan", description: "Jalankan pada hari tertentu dalam minggu" },
  { value: ScheduleType.MONTHLY, label: "Bulanan", description: "Jalankan pada tanggal tertentu setiap bulan" },
  { value: ScheduleType.CUSTOM, label: "Kustom", description: "Pilih tanggal-tanggal spesifik" },
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

const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);

const blankFormValues = (
  defaultRequirement: RequirementType,
  defaultDivisionId = ""
): ProgramFormValues => ({
  name: "",
  description: "",
  scheduleType: ScheduleType.DAILY,
  scheduleDays: [1, 2, 3, 4, 5, 6, 0],
  scheduleMonthDays: [],
  customDates: [],
  scheduleTime: "07:00",
  requirementType: defaultRequirement,
  minUploads: 1,
  isActive: true,
  divisionId: defaultDivisionId,
});

export function ProgramFormDialog({ open, onOpenChange, program }: ProgramFormDialogProps) {
  const isEditing = !!program;
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const ownDivisionId = session?.user?.divisionId ?? "";
  const createMutation = useCreateProgram();
  const updateMutation = useUpdateProgram();
  const { data: divisions } = useDivisions();
  const availableDivisions = isAdmin
    ? divisions
    : divisions?.filter((division) => division.id === ownDivisionId);
  const [isLoading, setIsLoading] = useState(false);

  const defaultRequirement: RequirementType = "PHOTO";

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: blankFormValues(defaultRequirement),
  });

  const scheduleType = form.watch("scheduleType");
  const selectedDays = (form.watch("scheduleDays") ?? []) as number[];
  const selectedMonthDays = (form.watch("scheduleMonthDays") ?? []) as number[];
  const customDates = (form.watch("customDates") ?? []) as string[];
  const requirementType = form.watch("requirementType");

  useEffect(() => {
    if (program) {
      form.reset({
        name: program.name,
        description: program.description || "",
        scheduleType: program.scheduleType,
        scheduleDays: program.scheduleDays ?? [],
        scheduleMonthDays: program.scheduleMonthDays ?? [],
        customDates: (program.customDates ?? []).map((d) =>
          typeof d === "string" ? d.split("T")[0] : new Date(d).toISOString().split("T")[0]
        ),
        scheduleTime: program.scheduleTime || "07:00",
        requirementType: program.requirementType || defaultRequirement,
        minUploads: program.minUploads ?? 1,
        isActive: program.isActive,
        divisionId: program.divisionId,
      });
    } else {
      form.reset(
        blankFormValues(
          defaultRequirement,
          isAdmin ? "" : ownDivisionId
        )
      );
    }
  }, [program, form, defaultRequirement, isAdmin, ownDivisionId]);

  async function onSubmit(data: ProgramFormValues) {
    setIsLoading(true);
    try {
      const payload = programSchema.parse(data);

      if (isEditing && program) {
        await updateMutation.mutateAsync({ ...payload, id: program.id });
        toast.success("Program berhasil diperbarui");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Program berhasil ditambahkan");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleDay(dayValue: number) {
    const current = (form.getValues("scheduleDays") ?? []) as number[];
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

  function toggleMonthDay(day: number) {
    const current = (form.getValues("scheduleMonthDays") ?? []) as number[];
    if (current.includes(day)) {
      form.setValue(
        "scheduleMonthDays",
        current.filter((d) => d !== day),
        { shouldValidate: true }
      );
    } else {
      form.setValue("scheduleMonthDays", [...current, day].sort((a, b) => a - b), {
        shouldValidate: true,
      });
    }
  }

  function addCustomDate(date: Date | undefined) {
    if (!date) return;
    const dateStr = format(date, "yyyy-MM-dd");
    const current = (form.getValues("customDates") ?? []) as string[];
    if (!current.includes(dateStr)) {
      form.setValue("customDates", [...current, dateStr].sort(), {
        shouldValidate: true,
      });
    }
  }

  function removeCustomDate(dateStr: string) {
    const current = (form.getValues("customDates") ?? []) as string[];
    form.setValue(
      "customDates",
      current.filter((d) => d !== dateStr),
      { shouldValidate: true }
    );
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!isAdmin}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih divisi" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableDivisions?.map((division) => (
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
                    <FormDescription className="text-xs">
                      {scheduleTypeOptions.find(o => o.value === field.value)?.description}
                    </FormDescription>
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

            {/* DAILY / WEEKLY: Show day picker */}
            {(scheduleType === ScheduleType.DAILY || scheduleType === ScheduleType.WEEKLY) && (
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
            )}

            {/* MONTHLY: Show month day picker */}
            {scheduleType === ScheduleType.MONTHLY && (
              <FormField
                control={form.control}
                name="scheduleMonthDays"
                render={() => (
                  <FormItem>
                    <FormLabel>Tanggal Dalam Bulan</FormLabel>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border rounded-md">
                      {monthDays.map((day) => (
                        <Badge
                          key={day}
                          variant={
                            selectedMonthDays.includes(day)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer w-8 justify-center"
                          onClick={() => toggleMonthDay(day)}
                        >
                          {day}
                        </Badge>
                      ))}
                    </div>
                    <FormDescription>
                      Pilih tanggal 1-31 untuk jadwal bulanan
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* CUSTOM: Show date picker */}
            {scheduleType === ScheduleType.CUSTOM && (
              <FormField
                control={form.control}
                name="customDates"
                render={() => (
                  <FormItem>
                    <FormLabel>Tanggal Kustom</FormLabel>
                    <div className="space-y-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            <Plus className="mr-2 h-4 w-4" />
                            Tambah Tanggal
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            onSelect={addCustomDate}
                            locale={id}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {customDates.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 border rounded-md max-h-32 overflow-y-auto">
                          {customDates.map((dateStr) => (
                            <Badge
                              key={dateStr}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => removeCustomDate(dateStr)}
                            >
                              {format(new Date(dateStr), "dd MMM yyyy", { locale: id })}
                              <X className="ml-1 h-3 w-3" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <FormDescription>
                      Klik tanggal untuk menghapus
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requirementType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Bukti</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PHOTO">Foto</SelectItem>
                        <SelectItem value="DOCUMENT">Dokumen</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      {field.value === "PHOTO"
                        ? "Anggota harus mengunggah foto sebagai bukti"
                        : "Anggota harus mengunggah file dokumen (PDF/Office) sebagai bukti"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minUploads"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Minimal {requirementType === "PHOTO" ? "Foto" : "Dokumen"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Tentukan jumlah bukti minimal yang harus diunggah anggota
                    </FormDescription>
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
