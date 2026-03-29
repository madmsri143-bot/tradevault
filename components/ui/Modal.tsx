import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  className?: string;
}

export default function Modal({ isOpen, onClose, title, icon, children, maxWidth = "md", className = "" }: ModalProps) {
  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    full: "max-w-[95%] sm:max-w-[90%]"
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`bg-[#111827] border border-[#111827] w-full ${maxWidthClasses[maxWidth]} rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] ${className}`}>
        
        {/* Header - Optional */}
        {(title || icon) && (
          <div className="p-5 border-b border-[#111827] flex items-center justify-between bg-[#111827]/50 shrink-0 rounded-t-2xl">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-[#111827]">
                  {icon}
                </div>
              )}
              {title && <h2 className="text-xl font-bold text-[#E5E7EB] tracking-tight">{title}</h2>}
            </div>
            <button 
              onClick={onClose} 
              className="w-10 h-10 flex items-center justify-center text-[#9CA3AF] hover:text-[#E5E7EB] bg-white/5 rounded-full hover:bg-white/10 transition-colors shrink-0"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        )}
        
        {/* Close Button if no explicit header */}
        {!(title || icon) && (
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center text-[#9CA3AF] hover:text-[#E5E7EB] bg-black/20 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        )}

        <div className="overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
