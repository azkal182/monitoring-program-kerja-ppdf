"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { AlertCircle, CalendarClock, Check, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuarter } from "@/hooks/quarter";
import { useDivisions } from "@/hooks/use-divisions";
import { CalendarEvent } from "@/hooks/use-calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface AddEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  eventsByDate: Record<string, CalendarEvent[]>;
  onSuccess: () => void;
}

export function AddEventDialog({
  isOpen,
  onClose,
  selectedDate,
  eventsByDate,
  onSuccess,
}: AddEventDialogProps) {
  const [tab, setTab] = useState<"agenda" | "program">("agenda");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formDate, setFormDate] = useState<string>("");
  const [showAllEvents, setShowAllEvents] = useState(false);

  useEffect(() => {
    if (isOpen && selectedDate) {
      setFormDate(format(selectedDate, "yyyy-MM-dd"));
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    // Reset showAllEvents when the date changes
    setShowAllEvents(false);
  }, [formDate]);

  const existingEvents = eventsByDate[formDate] || [];
  const displayedEvents = showAllEvents ? existingEvents : existingEvents.slice(0, 2);
  const hiddenCount = existingEvents.length - 2;

  // Agenda State
  const [agendaName, setAgendaName] = useState("");
  const [personResponsible, setPersonResponsible] = useState("");
  const [quarterId, setQuarterId] = useState("");

  // Program State
  const [programName, setProgramName] = useState("");
  const [description, setDescription] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const { data: quarters, isLoading: isLoadingQuarters } = useQuarter();
  const { data: divisions, isLoading: isLoadingDivisions } = useDivisions();

  const handleClose = () => {
    // Reset forms
    setAgendaName("");
    setPersonResponsible("");
    setQuarterId("");
    setProgramName("");
    setDescription("");
    setDivisionId("");
    setScheduleTime("");
    setError(null);
    setShowAllEvents(false);
    onClose();
  };

  const handleAddAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaName || !personResponsible || !quarterId || !formDate) {
      setError("Mohon lengkapi semua field yang diwajibkan.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await fetch("/api/agendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agendaName,
          personResponsible,
          date: formDate,
          quarterId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal membuat agenda.");
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programName || !divisionId || !formDate) {
      setError("Nama program dan divisi wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const dayOfMonth = parseInt(formDate.split("-")[2], 10);

      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: programName,
          description: description || undefined,
          divisionId,
          scheduleType: "MONTHLY",
          scheduleDays: [],
          scheduleMonthDays: [dayOfMonth],
          customDates: [],
          scheduleTime: scheduleTime || undefined,
          requirementType: "DOCUMENT",
          minUploads: 1,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal membuat program kerja.");
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Jadwal Baru</DialogTitle>
          <DialogDescription>
            Atur tanggal pelaksanaan jadwal di bawah ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="formDate">Tanggal Pelaksanaan</Label>
          <Input 
            id="formDate"
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
          />
        </div>

        {existingEvents.length > 0 && (
          <Alert variant="default" className="bg-amber-500/15 text-amber-600 border-amber-500/30">
            <AlertCircle className="h-4 w-4 stroke-amber-600" />
            <AlertTitle>Peringatan Bentrok ({existingEvents.length} Jadwal)</AlertTitle>
            <AlertDescription className="space-y-2 mt-2">
              <p>Terdapat jadwal lain pada tanggal ini. Anda tetap dapat menyimpannya.</p>
              <ul className="list-disc list-inside text-xs space-y-1 opacity-90">
                {displayedEvents.map((evt, idx) => (
                  <li key={`${evt.programId}-${idx}`}>
                    <strong>{evt.programName}</strong> ({evt.scheduleType === "AGENDA" ? "Agenda" : "Program Bulanan"})
                  </li>
                ))}
              </ul>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllEvents(!showAllEvents)}
                  className="text-xs font-semibold hover:underline mt-1 focus:outline-none"
                >
                  {showAllEvents ? "Sembunyikan" : `+ ${hiddenCount} jadwal lainnya...`}
                </button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="agenda">Agenda Utama</TabsTrigger>
            <TabsTrigger value="program">Program Bulanan</TabsTrigger>
          </TabsList>
          
          <TabsContent value="agenda" className="space-y-4 pt-4">
            <form onSubmit={handleAddAgenda} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agendaName">Nama Agenda <span className="text-destructive">*</span></Label>
                <Input
                  id="agendaName"
                  placeholder="Contoh: Rapat Koordinasi Tahunan"
                  value={agendaName}
                  onChange={(e) => setAgendaName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="personResponsible">Penanggung Jawab <span className="text-destructive">*</span></Label>
                <Input
                  id="personResponsible"
                  placeholder="Contoh: Budi Santoso"
                  value={personResponsible}
                  onChange={(e) => setPersonResponsible(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quarterId">Kuartal <span className="text-destructive">*</span></Label>
                <Select value={quarterId} onValueChange={setQuarterId}>
                  <SelectTrigger disabled={isLoadingQuarters}>
                    <SelectValue placeholder={isLoadingQuarters ? "Memuat..." : "Pilih Kuartal"} />
                  </SelectTrigger>
                  <SelectContent>
                    {quarters?.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="pt-4 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={handleClose}>Batal</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Agenda
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="program" className="space-y-4 pt-4">
            <form onSubmit={handleAddProgram} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="programName">Nama Program <span className="text-destructive">*</span></Label>
                <Input
                  id="programName"
                  placeholder="Contoh: Audit Keuangan Bulanan"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="divisionId">Divisi Pelaksana <span className="text-destructive">*</span></Label>
                <Select value={divisionId} onValueChange={setDivisionId}>
                  <SelectTrigger disabled={isLoadingDivisions}>
                    <SelectValue placeholder={isLoadingDivisions ? "Memuat..." : "Pilih Divisi"} />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi (Opsional)</Label>
                <Textarea
                  id="description"
                  placeholder="Penjelasan singkat program..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="resize-none h-20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleTime">Waktu (Opsional)</Label>
                <Input
                  id="scheduleTime"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={handleClose}>Batal</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Program
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
