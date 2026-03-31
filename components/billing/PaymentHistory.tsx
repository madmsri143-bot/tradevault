"use client";

import { CreditCard, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface PaymentConfig {
  payment_id: string;
  order_id: string;
  plan: string;
  date: number;
}

interface PaymentHistoryProps {
  history: PaymentConfig[];
}

export default function PaymentHistory({ history }: PaymentHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <div className="mt-12">
        <h3 className="text-xl font-bold text-[#E5E7EB] mb-6">Payment History</h3>
        <div className="bg-black/40 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
            <CreditCard size={20} className="text-zinc-600 dark:text-[#A0A0A0]" />
          </div>
          <h4 className="text-zinc-900 dark:text-[#EAEAEA] font-bold mb-1 uppercase tracking-widest text-sm">No payment history</h4>
          <p className="text-sm text-zinc-600 dark:text-[#A0A0A0] max-w-xs">You haven&apos;t made any payments yet. Your trial is currently active.</p>
        </div>
      </div>
    );
  }

  const generateReceiptPDF = (payment: PaymentConfig) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("JOURNALBUD", 20, 20);
    
    // SubHeader
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("PAYMENT RECEIPT", 20, 30);
    
    // Meta Information
    doc.setFontSize(10);
    doc.text(`Date: ${format(new Date(payment.date), "MMMM dd, yyyy")}`, 20, 45);
    doc.text(`Transaction ID: ${payment.payment_id}`, 20, 52);
    doc.text(`Status: PAID`, 20, 59);
    
    autoTable(doc, {
      startY: 70,
      head: [["Description", "Amount"]],
      body: [
        [`JournalBud ${payment.plan.replace("pro_", "").toUpperCase()} Subscription`, payment.plan === "pro_yearly" ? "$19.99" : "$2.99"]
      ],
      theme: "striped",
      headStyles: { fillColor: [212, 175, 55], textColor: [0,0,0] }
    });
    
    doc.save(`JournalBud_Receipt_${payment.payment_id}.pdf`);
  };

  // Sort history newest first
  const sortedHistory = [...history].sort((a, b) => b.date - a.date);

  return (
    <div className="mt-12">
      <h3 className="text-xl font-bold text-zinc-900 dark:text-[#EAEAEA] mb-6">Payment History</h3>
      
      <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-600 dark:text-[#A0A0A0] uppercase bg-black/60 border-b border-white/5">
              <tr>
                <th scope="col" className="px-6 py-4 font-bold tracking-[0.2em]">Date</th>
                <th scope="col" className="px-6 py-4 font-bold tracking-[0.2em]">Amount</th>
                <th scope="col" className="px-6 py-4 font-bold tracking-[0.2em]">Plan</th>
                <th scope="col" className="px-6 py-4 font-bold tracking-[0.2em]">Receipt</th>
                <th scope="col" className="px-6 py-4 font-bold tracking-[0.2em] text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedHistory.map((payment, index) => (
                <tr key={payment.payment_id || index} className="hover:bg-white/[0.02] transition-colors group cursor-default">
                  <td className="px-6 py-4 font-medium text-[#E5E7EB]">
                    {format(new Date(payment.date), "MMM dd, yyyy")}
                  </td>
                  <td className="px-6 py-4 text-[#E5E7EB] font-bold">
                    {payment.plan === "pro_yearly" ? "$19.99" : "$2.99"}
                  </td>
                  <td className="px-6 py-4 text-[#9CA3AF] capitalize">
                    {payment.plan.replace("pro_", "")}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-[#A0A0A0] font-mono text-xs flex items-center gap-2 group-hover:text-zinc-900 dark:text-[#EAEAEA] transition-colors">
                    <button onClick={() => generateReceiptPDF(payment)} className="flex items-center gap-1 hover:text-[#D4AF37] transition-colors p-1" title="Download Receipt PDF">
                      <Download size={14} />
                      <span className="truncate w-24">{payment.payment_id !== "mock" ? payment.payment_id : "TRIAL_ACTV"}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                      Paid
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
