import { useState } from "react";
import { Headset, Send, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTrial } from "@/components/TrialGuard";
import Modal from "@/components/ui/Modal";

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    subject: "",
    message: ""
  });

  const { user } = useAuth();
  const { planName } = useTrial();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user?.displayName || "TradeVault User",
          email: user?.email || "Unknown",
          plan: planName || "Unknown",
          subject: formData.subject,
          message: formData.message
        })
      });

      if (!res.ok) throw new Error("Failed to send message");
      
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setFormData({ subject: "", message: "" });
      }, 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to send support request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-[#11161D] border border-white/10 rounded-full flex items-center justify-center text-white shadow-xl hover:bg-zinc-800 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all group relative animate-in zoom-in"
        >
          <span className="absolute inset-0 rounded-full group-hover:bg-[#00FFB2]/5 transition-colors" />
          <Headset size={24} className="group-hover:text-[#00FFB2] transition-colors relative z-10" />
        </button>
      )}

      {/* Support Chat Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title="Contact Support" 
        icon={<Headset size={20} className="text-[#00FFB2]" />}
        maxWidth="md"
        className="border-[#00FFB2]/20 shadow-[0_0_50px_rgba(0,255,178,0.15)]"
      >
        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-[#00FFB2]/10 rounded-full flex items-center justify-center mb-4 border border-[#00FFB2]/20">
              <CheckCircle size={32} className="text-[#00FFB2]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Message Sent!</h3>
            <p className="text-sm text-zinc-400">Our support team will get back to your registered email shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-zinc-400 mb-6">
              Experiencing issues or have a question? Send us a secure message.
            </p>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#00FFB2] mb-1.5 ml-1">Subject</label>
              <input 
                type="text" 
                required
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="e.g. Need help with integrations"
                className="w-full bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00FFB2]/50 focus:bg-zinc-950 transition-all font-medium placeholder:text-zinc-600 focus:ring-1 focus:ring-[#00FFB2]/20"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#00FFB2] mb-1.5 ml-1">Message</label>
              <textarea 
                required
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="Describe your issue in detail..."
                className="w-full bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00FFB2]/50 focus:bg-zinc-950 transition-all resize-none font-medium placeholder:text-zinc-600 focus:ring-1 focus:ring-[#00FFB2]/20"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 bg-[#00FFB2] text-black font-black py-3.5 rounded-xl hover:shadow-[0_0_20px_rgba(0,255,178,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:-translate-y-0 flex items-center justify-center gap-2"
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
