"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { X, AlertTriangle, CheckCircle, Info } from "lucide-react";

type ModalVariant = "danger" | "safe" | "info";

interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant: ModalVariant;
  onConfirm: () => void;
  onCancel: () => void;
  isAlert: boolean;
}

interface ModalContextType {
  confirm: (options: { title?: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: ModalVariant }) => Promise<boolean>;
  alert: (options: { title?: string; message: string; variant?: ModalVariant }) => Promise<void>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ModalConfig>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    variant: "danger",
    onConfirm: () => {},
    onCancel: () => {},
    isAlert: false
  });

  const confirm = (options: { title?: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: ModalVariant }) => {
    return new Promise<boolean>((resolve) => {
      setConfig({
        isOpen: true,
        title: options.title || "Confirm Action",
        message: options.message,
        confirmLabel: options.confirmLabel || "Confirm",
        cancelLabel: options.cancelLabel || "Cancel",
        variant: options.variant || "danger",
        isAlert: false,
        onConfirm: () => {
          setConfig(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfig(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  const alert = (options: { title?: string; message: string; variant?: ModalVariant }) => {
    return new Promise<void>((resolve) => {
      setConfig({
        isOpen: true,
        title: options.title || "Notice",
        message: options.message,
        confirmLabel: "OK",
        variant: options.variant || "info",
        isAlert: true,
        onConfirm: () => {
          setConfig(prev => ({ ...prev, isOpen: false }));
          resolve();
        },
        onCancel: () => {
          setConfig(prev => ({ ...prev, isOpen: false }));
          resolve();
        }
      });
    });
  };

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}
      {config.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[4px] animate-in fade-in duration-200" onClick={config.onCancel} />
          <div className="relative w-[300px] max-w-[320px] p-[16px] bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-200 flex flex-col text-center">
            <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white mb-[6px]">{config.title}</h3>
            {config.message && (
              <p className="text-[12px] text-zinc-900 dark:text-white opacity-70 mb-[14px] leading-snug px-1">{config.message}</p>
            )}
            <div className="flex w-full gap-[8px] mt-[10px]">
              {!config.isAlert && (
                <button onClick={config.onCancel} className="flex-1 h-[32px] px-[12px] py-0 rounded-[6px] bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-[13px] text-zinc-900 dark:text-zinc-300 font-medium transition-colors">
                  {config.cancelLabel}
                </button>
              )}
              <button 
                onClick={config.onConfirm}
                className={`flex-1 h-[32px] px-[12px] py-0 rounded-[6px] text-white text-[13px] font-medium transition-colors ${
                  config.variant === "danger" ? "bg-red-500/80 hover:bg-red-500/90" :
                  config.variant === "safe" ? "bg-emerald-600 hover:bg-emerald-500" :
                  "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                {config.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within ModalProvider");
  return context;
};
