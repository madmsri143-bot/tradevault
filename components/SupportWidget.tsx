"use client";

import { useState, useEffect } from "react";
import { Headset, Send, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTrial } from "@/components/TrialGuard";
import Modal from "@/components/ui/Modal";

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { user } = useAuth();
  const { planName } = useTrial();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (user && isOpen) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.displayName || "",
        email: prev.email || user.email || ""
      }));
    }
  }, [user, isOpen]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("openSupportModal", handleOpen);
    return () => window.removeEventListener("openSupportModal", handleOpen);
  }, []);

  // Image attachment temporarily disabled for text-only pipeline

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (formData.message.trim().length > 1000) {
      setErrorMsg("Message must be under 1000 characters.");
      return;
    }
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim()) {
      setErrorMsg("All fields are required.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          plan: planName || "Unknown",
          subject: formData.subject,
          message: formData.message
        })
      });

      if (!res.ok) {
        const resData = await res.json().catch(() => ({}));
        throw new Error(resData.error || "Failed to send message");
      }
      
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setFormData({ name: user?.displayName || "", email: user?.email || "", subject: "", message: "" });
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Button removed, now triggered centrally via Sidebar */}

      {/* Support Chat Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title="Contact Support" 
        icon={<Headset size={20} className="text-[#D4AF37]" />}
        maxWidth="md"
        className="border-[#D4AF37]/20 shadow-[0_0_50px_rgba(201,166,70,0.15)]"
      >
        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mb-4 border border-[#D4AF37]/20">
              <CheckCircle size={32} className="text-[#D4AF37]" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-[#EAEAEA] mb-2">Message sent successfully</h3>
            <p className="text-sm text-zinc-600 dark:text-[#A0A0A0]">Our support team will get back to your registered email shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-[#A0A0A0] mb-6">
              Experiencing issues or have a question? Send us a secure message.
            </p>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold text-center">
                {errorMsg}
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-1.5 ml-1">Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Your Name"
                  className="w-full bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-[#EAEAEA] focus:outline-none focus:border-[#D4AF37]/50 focus:bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md transition-all font-medium placeholder:text-zinc-600 focus:ring-1 focus:ring-[#D4AF37]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-1.5 ml-1">Email</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="your@email.com"
                  className="w-full bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-[#EAEAEA] focus:outline-none focus:border-[#D4AF37]/50 focus:bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md transition-all font-medium placeholder:text-zinc-600 focus:ring-1 focus:ring-[#D4AF37]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-1.5 ml-1">Subject</label>
              <input 
                type="text" 
                required
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="e.g. Need help with integrations"
                className="w-full bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-[#EAEAEA] focus:outline-none focus:border-[#D4AF37]/50 focus:bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md transition-all font-medium placeholder:text-zinc-600 focus:ring-1 focus:ring-[#D4AF37]/20"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-1.5 ml-1 pr-1">
                <label className="block text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Message</label>
                <span className={`text-[10px] font-bold ${formData.message.length > 1000 ? 'text-red-600 dark:text-red-400' : 'text-zinc-600 dark:text-[#A0A0A0]'}`}>
                  {formData.message.length} / 1000
                </span>
              </div>
              <textarea 
                required
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="Describe your issue in detail..."
                className="w-full bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-[#EAEAEA] focus:outline-none focus:border-[#D4AF37]/50 focus:bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md transition-all resize-none font-medium placeholder:text-zinc-600 focus:ring-1 focus:ring-[#D4AF37]/20"
              />
            </div>

            {/* Image attachment temporarily disabled for text-only pipeline */}
            
            <button 
              type="submit" 
              disabled={loading || formData.message.length === 0 || formData.message.length > 1000}
              className="w-full mt-2 bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 font-black py-3.5 rounded-2xl hover:shadow-[0_0_10px_rgba(201,166,70,0.15)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:-translate-y-0 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> Send Support Request</>}
            </button>
            <p className="text-center text-[10px] text-zinc-600 uppercase tracking-widest font-bold mt-4">
              Protected by SSL Encryption
            </p>
          </form>
        )}
      </Modal>
    </div>
  );
}
