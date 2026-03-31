import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-900 dark:text-[#EAEAEA] p-8 md:p-16 max-w-4xl mx-auto selection:bg-[#D4AF37]/30 animate-in fade-in duration-500">
      <div className="mb-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#D4AF37]/80 pb-2 transition-colors">
          <ArrowLeft size={16} /> Back to App
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-[#EAEAEA] mt-4 mb-2 tracking-tight">Terms of Service</h1>
        <p className="text-zinc-600 dark:text-[#A0A0A0] font-medium">Last Updated: March 2026</p>
      </div>

      <div className="space-y-10 text-base leading-relaxed">
        <section>
          <h2 className="text-2xl font-semibold text-[#D4AF37] mb-3">1. Welcome to JournalBud</h2>
          <p>By using JournalBud, you agree to these simple terms. Our underlying goal is to provide a reliable, lightning-fast tool for you to log, analyze, and review your personal trading performance seamlessly.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#D4AF37] mb-3">2. Not Financial Advice</h2>
          <div className="p-5 bg-[#FF4D6D]/10 border border-[#FF4D6D]/20 rounded-2xl text-[#FF4D6D]/90">
            <strong className="text-[#FF4D6D] block mb-1">Important Disclaimer:</strong> 
            JournalBud is strictly a data-logging and personal analytics tool. We do not provide financial, investment, or trading advice of any kind. Any metrics or targets tracked in this app are for your record-keeping only. Trading involves significant risk, and you are solely responsible for your own financial decisions.
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#D4AF37] mb-3">3. Your Data & Authentication</h2>
          <p>We use robust authentication systems to securely manage your login credentials. Your trading data, journal entries, and uploaded images are stored securely utilizing industry-standard cloud infrastructure. You retain full ownership of your data at all times and can export or delete it entirely directly from your account settings.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#D4AF37] mb-3">4. Acceptable Use</h2>
          <p>Please use the platform responsibly. Do not attempt to reverse-engineer the underlying application, overload our servers with bot traffic, or use the service for illegal activities. We reserve the right to suspend accounts that intentionally violate these basic rules.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#D4AF37] mb-3">5. Service Availability</h2>
          <p>While we strive for 99.9% uptime and a premium experience, JournalBud is provided "as is" without strict warranties. We are not legally liable for any trading losses incurred during potential service downtimes, backend migrations, or data synchronization delays.</p>
        </section>
      </div>
    </div>
  );
}
