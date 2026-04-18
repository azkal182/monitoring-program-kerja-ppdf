"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info" | "success";
};

type ConfirmationContextType = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmationContext = createContext<ConfirmationContextType | null>(null);

export const ConfirmationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: "" });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    resolverRef.current?.(true);
    resolverRef.current = null;
    setOpen(false);
  };

  const handleCancel = () => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setOpen(false);
  };

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        {...options}
      />
    </ConfirmationContext.Provider>
  );
};

export const useConfirmation = () => {
  const ctx = useContext(ConfirmationContext);
  if (!ctx)
    throw new Error(
      "useConfirmation harus dipakai di dalam ConfirmationProvider",
    );
  return ctx;
};
