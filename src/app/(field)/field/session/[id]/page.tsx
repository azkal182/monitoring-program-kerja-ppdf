"use client";

import { useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import {
  Camera,
  Clock,
  CheckCircle,
  AlertTriangle,
  Send,
  Loader2,
  Image as ImageIcon,
  X,
  FileText,
  Download,
} from "lucide-react";

import { useSession, useSubmitSession } from "@/hooks/use-sessions";
import { RequirementType } from "@/hooks/use-programs";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { PhotoCaptureDialog } from "@/components/field/photo-capture";
import { Input } from "@/components/ui/input";

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch?.[1] ?? "image/jpeg";
  const binary = atob(data);
  const len = binary.length;
  const array = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new File([array], filename, { type: mime });
}

const submitSchema = z.object({
  status: z.enum(["COMPLETED", "COMPLETED_WITH_ISSUE"]),
  issueNote: z.string().optional(),
});

type SubmitInput = z.infer<typeof submitSchema>;

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const { data: session, isLoading, refetch } = useSession(sessionId);
  const submitMutation = useSubmitSession();

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);
  const [hasIssue, setHasIssue] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");

  const form = useForm<SubmitInput>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      status: "COMPLETED",
      issueNote: "",
    },
  });

  async function handlePhotoCapture(imageData: string, caption: string) {
    const file = dataUrlToFile(imageData, `photo-${Date.now()}.jpg`);
    const formData = new FormData();
    formData.append("file", file);
    if (caption) {
      formData.append("caption", caption);
    }

    const res = await fetch(`/api/sessions/${sessionId}/photos`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to upload photo");
    }

    await refetch();
  }

  async function handleDeletePhoto(photoId: string) {
    if (!confirm("Hapus foto ini?")) return;

    setDeletingPhotoId(photoId);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/photos?photoId=${photoId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete photo");
      }

      toast.success("Foto berhasil dihapus");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal hapus foto");
    } finally {
      setDeletingPhotoId(null);
    }
  }

  async function handleDocumentUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDocument) {
      toast.error("Pilih dokumen terlebih dahulu");
      return;
    }

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedDocument);
      if (documentName.trim()) {
        formData.append("name", documentName.trim());
      }

      const res = await fetch(`/api/sessions/${sessionId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to upload document");
      }

      toast.success("Dokumen berhasil diupload");
      setSelectedDocument(null);
      setDocumentName("");
      (event.currentTarget as HTMLFormElement).reset();
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal upload dokumen");
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    if (!confirm("Hapus dokumen ini?")) return;

    setDeletingDocumentId(documentId);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/documents?documentId=${documentId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete document");
      }

      toast.success("Dokumen berhasil dihapus");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal hapus dokumen");
    } finally {
      setDeletingDocumentId(null);
    }
  }

  async function onSubmit(data: SubmitInput) {
    try {
      if (data.status === "COMPLETED_WITH_ISSUE" && !data.issueNote?.trim()) {
        toast.error("Catatan kendala wajib diisi");
        return;
      }

      await submitMutation.mutateAsync({
        id: sessionId,
        status: data.status,
        issueNote: data.status === "COMPLETED_WITH_ISSUE" ? data.issueNote : undefined,
      });

      toast.success("Sesi berhasil disubmit!");
      setSubmitDialogOpen(false);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal submit sesi");
    }
  }

  function handleOpenSubmit(withIssue: boolean) {
    setHasIssue(withIssue);
    form.setValue("status", withIssue ? "COMPLETED_WITH_ISSUE" : "COMPLETED");
    setSubmitDialogOpen(true);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">Sesi tidak ditemukan</p>
          <Button variant="link" onClick={() => router.push("/field/today")}>
            Kembali
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isSubmitted = session.status !== "DRAFT";
  const requirementType = session.schedule.program.requirementType as RequirementType;
  const minUploads = session.schedule.program.minUploads;
  const photoCount = session.photos.length;
  const documentCount = session.documents.length;
  const proofCount = requirementType === "PHOTO" ? photoCount : documentCount;
  const canSubmit = !isSubmitted && proofCount >= minUploads;

  const requirementLabel = requirementType === "PHOTO" ? "Foto" : "Dokumen";

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{session.schedule.program.name}</CardTitle>
              <CardDescription>
                {session.schedule.program.division.name}
              </CardDescription>
            </div>
            <Badge
              variant={
                session.status === "COMPLETED"
                  ? "default"
                  : session.status === "COMPLETED_WITH_ISSUE"
                  ? "secondary"
                  : session.status === "NOT_EXECUTED"
                  ? "destructive"
                  : "outline"
              }
            >
              {session.status === "DRAFT"
                ? "Draft"
                : session.status === "COMPLETED"
                ? "Selesai"
                : session.status === "COMPLETED_WITH_ISSUE"
                ? "Selesai (Kendala)"
                : "Tidak Terlaksana"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Mulai: {formatTime(session.startedAt)}
              {session.submittedAt && ` • Selesai: ${formatTime(session.submittedAt)}`}
            </span>
          </div>
          {session.issueNote && (
            <div className="rounded-lg bg-orange-50 p-3 text-orange-800">
              <p className="text-xs font-medium mb-1">Kendala:</p>
              <p className="text-sm">{session.issueNote}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {requirementType === "PHOTO" ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Foto Bukti</CardTitle>
              <Badge variant={photoCount >= minUploads ? "default" : "secondary"}>
                {photoCount}/{minUploads} foto
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {session.photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg">
                <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground text-sm">Belum ada foto</p>
                {!isSubmitted && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload minimal {minUploads} foto untuk submit
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {session.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || "Photo"}
                      className="w-full h-full object-cover"
                    />
                    {!isSubmitted && (
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        disabled={deletingPhotoId === photo.id}
                        className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {deletingPhotoId === photo.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </button>
                    )}
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1.5 line-clamp-1">
                        {photo.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isSubmitted && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setPhotoCaptureOpen(true)}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Ambil / Upload Foto
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Dokumen Bukti</CardTitle>
              <Badge variant={documentCount >= minUploads ? "default" : "secondary"}>
                {documentCount}/{minUploads} dokumen
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {session.documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground text-sm">Belum ada dokumen</p>
                {!isSubmitted && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload minimal {minUploads} dokumen untuk submit
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {session.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{doc.filename}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      {!isSubmitted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={deletingDocumentId === doc.id}
                        >
                          {deletingDocumentId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isSubmitted && (
              <form onSubmit={handleDocumentUpload} className="space-y-3">
                <Input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setSelectedDocument(file || null);
                    setDocumentName(file?.name ?? "");
                  }}
                />
                <Input
                  placeholder="Nama dokumen (opsional)"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                />
                <Button type="submit" className="w-full" disabled={!selectedDocument || uploadingDoc}>
                  {uploadingDoc ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mengunggah...
                    </>
                  ) : (
                    "Upload Dokumen"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit Actions */}
      {!isSubmitted && (
        <div className="space-y-2">
          <Button
            className="w-full"
            size="lg"
            onClick={() => handleOpenSubmit(false)}
            disabled={!canSubmit}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Submit - Terlaksana
          </Button>
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => handleOpenSubmit(true)}
            disabled={!canSubmit}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Submit - Ada Kendala
          </Button>
          {!canSubmit && (
            <p className="text-xs text-center text-muted-foreground">
              Upload minimal {minUploads} {requirementLabel.toLowerCase()} untuk dapat submit
            </p>
          )}
        </div>
      )}

      {/* Photo Capture Dialog */}
      {requirementType === "PHOTO" && (
        <PhotoCaptureDialog
          open={photoCaptureOpen}
          onOpenChange={setPhotoCaptureOpen}
          onCapture={handlePhotoCapture}
        />
      )}

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hasIssue ? "Submit dengan Kendala" : "Konfirmasi Submit"}
            </DialogTitle>
            <DialogDescription>
              {hasIssue
                ? "Jelaskan kendala yang terjadi saat pelaksanaan"
                : "Pastikan semua foto sudah diupload sebelum submit"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {hasIssue && (
                <FormField
                  control={form.control}
                  name="issueNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catatan Kendala</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Jelaskan kendala yang terjadi..."
                          rows={4}
                          {...field}
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
                  onClick={() => setSubmitDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
