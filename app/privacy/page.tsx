import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-[#EAEAEA] p-8 md:p-16 max-w-4xl mx-auto selection:bg-emerald-500/30 animate-in fade-in duration-500">
      <div className="mb-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:text-amber-400 pb-2 transition-colors">
          <ArrowLeft size={16} /> Back to App
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold text-[#EAEAEA] mt-4 mb-2 tracking-tight">Privacy Policy</h1>
        <p className="text-[#A0A0A0] font-medium">Last Updated: March 2026</p>
      </div>

      <div className="space-y-10 text-base leading-relaxed">
        <section>
          <h2 className="text-2xl font-semibold text-amber-400 mb-3">1. What We Collect</h2>
          <p>We only collect the absolute minimum data required to keep the application functioning seamlessly for you:</p>
          <ul className="list-disc pl-6 mt-4 space-y-3 text-[#A0A0A0]">
            <li><strong className="text-zinc-200">Account Data:</strong> Your name, username, email address, and profile picture (via your preferred Authentication method).</li>
            <li><strong className="text-zinc-200">Trading Data:</strong> The trades you meticulously log, personal journal notes, targets, and any visual chart images you upload.</li>
            <li><strong className="text-zinc-200">Technical Data:</strong> Basic functional cookies and local storage items (like theme preference and cookie consent) strictly required to run the app.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-amber-400 mb-3">2. How We Store Your Data</h2>
          <p>Your trading setup and private journal entries are completely isolated. All data is securely transmitted and encrypted at rest using enterprise-grade cloud services. We do not peek at your trades manually, and your financial data stays securely tied to your highly unique user ID.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-amber-400 mb-3">3. We Do Not Sell Your Data</h2>
          <p className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-100">
            We strongly believe your trading journal is your private domain. We do not run intrusive ads, we do not use third-party behavioral trackers, and <strong>we will never sell your personal information or trading history</strong> to data brokers or hedge funds.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-amber-400 mb-3">4. Communications</h2>
          <p>We may occasionally send you essential account emails (like password resets or critical security alerts). We respect your inbox and will not spam you with marketing newsletters without your explicit consent.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-amber-400 mb-3">5. Data Deletion</h2>
          <p>You have the absolute right to be forgotten. You can securely wipe all your trades and journal entries from our servers instantly via the "Reset Application" option in your settings page. To permanently delete your entire account, simply reach out via our primary contact methods.</p>
        </section>
      </div>
    </div>
  );
}
