import { useState, useCallback } from "react";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info" | "success";
}

export const useConfirmation = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: "" });
  const [resolveFn, setResolveFn] = useState<(value: boolean) => void>(
    () => () => {},
  );

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setOpen(true);
    return new Promise((resolve) => {
      setResolveFn(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    resolveFn(true);
    setOpen(false);
  }, [resolveFn]);

  const handleCancel = useCallback(() => {
    resolveFn(false);
    setOpen(false);
  }, [resolveFn]);

  return {
    confirm,
    loading,
    setLoading,
    dialogProps: {
      open,
      onOpenChange: setOpen,
      loading,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
      ...options,
    },
  };
};
