"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PhotoCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (imageData: string, caption: string) => Promise<void>;
}

export function PhotoCaptureDialog({
  open,
  onOpenChange,
  onCapture,
}: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("Tidak dapat mengakses kamera. Silakan gunakan upload file.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      stopCamera();
      setCapturedImage(null);
      setCaption("");
      setCameraError(null);
    } else {
      startCamera();
    }
    onOpenChange(newOpen);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      setCapturedImage(imageData);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCapturedImage(result);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!capturedImage) return;

    // Tutup dialog segera agar progress bar di halaman terlihat
    handleOpenChange(false);

    try {
      await onCapture(capturedImage, caption);
    } catch {
      // Error sudah ditangani di hook (ditampilkan via UploadProgress)
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ambil Foto</DialogTitle>
          <DialogDescription>
            Ambil foto bukti pelaksanaan program
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera / Preview */}
          <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted p-4 text-center text-sm text-muted-foreground">
                    {cameraError}
                  </div>
                )}
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured"
                className="h-full w-full object-cover"
              />
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Caption input */}
          {capturedImage && (
            <Input
              placeholder="Tambah keterangan (opsional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {!capturedImage ? (
            <>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => fileInputRef.current?.click()}
              >
                Pilih File
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={capturePhoto}
                disabled={!stream}
              >
                <Camera className="mr-2 h-4 w-4" />
                Ambil Foto
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={retakePhoto}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Ambil Ulang
              </Button>
              <Button onClick={handleSubmit}>
                <Check className="mr-2 h-4 w-4" />
                Simpan
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
