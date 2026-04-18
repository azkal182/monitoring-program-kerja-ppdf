"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, Trash2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfirmationVariant = "danger" | "warning" | "info" | "success";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

const variantConfig: Record<
  ConfirmationVariant,
  {
    icon: React.ElementType;
    iconClass: string;
    confirmClass: string;
  }
> = {
  danger: {
    icon: Trash2,
    iconClass: "text-destructive bg-destructive/10",
    confirmClass: "bg-destructive hover:bg-destructive/90 text-white",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
    confirmClass: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  info: {
    icon: Info,
    iconClass: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
    confirmClass: "",
  },
  success: {
    icon: CheckCircle,
    iconClass: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
    confirmClass: "bg-emerald-500 hover:bg-emerald-600 text-white",
  },
};

export const ConfirmationDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) => {
  const { icon: Icon, iconClass, confirmClass } = variantConfig[variant];

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={cn("rounded-full p-3", iconClass)}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-base">{title}</DialogTitle>
              {description && (
                <DialogDescription className="text-sm">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-2 flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={cn("w-full sm:w-auto", confirmClass)}
          >
            {loading ? "Memproses..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
