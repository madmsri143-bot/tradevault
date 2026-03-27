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
        <h3 className="text-xl font-bold text-white mb-6">Payment History</h3>
        <div className="bg-[#0B0F14] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
            <CreditCard size={20} className="text-zinc-500" />
          </div>
          <h4 className="text-white font-medium mb-1">No payment history</h4>
          <p className="text-sm text-zinc-500">You haven&apos;t made any payments yet. Your trial is currently active.</p>
        </div>
      </div>
    );
  }

  const generateReceiptPDF = (payment: PaymentConfig) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("TRADEVAULT", 20, 20);
    
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
        [`TradeVault ${payment.plan.replace("pro_", "").toUpperCase()} Subscription`, payment.plan === "pro_yearly" ? "$21.00" : "$3.00"]
      ],
      theme: "striped",
      headStyles: { fillColor: [0, 255, 178], textColor: [0,0,0] }
    });
    
    doc.save(`TradeVault_Receipt_${payment.payment_id}.pdf`);
  };

  // Sort history newest first
  const sortedHistory = [...history].sort((a, b) => b.date - a.date);

  return (
    <div className="mt-12">
      <h3 className="text-xl font-bold text-white mb-6">Payment History</h3>
      
      <div className="bg-[#0B0F14] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-black/40 border-b border-white/5">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold tracking-widest">Date</th>
                <th scope="col" className="px-6 py-4 font-semibold tracking-widest">Amount</th>
                <th scope="col" className="px-6 py-4 font-semibold tracking-widest">Plan</th>
                <th scope="col" className="px-6 py-4 font-semibold tracking-widest">Receipt</th>
                <th scope="col" className="px-6 py-4 font-semibold tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedHistory.map((payment, index) => (
                <tr key={payment.payment_id || index} className="hover:bg-white/[0.02] transition-colors group cursor-default">
                  <td className="px-6 py-4 font-medium text-zinc-300">
                    {format(new Date(payment.date), "MMM dd, yyyy")}
                  </td>
                  <td className="px-6 py-4 text-white font-bold">
                    {payment.plan === "pro_yearly" ? "$21" : "$3"}
                  </td>
                  <td className="px-6 py-4 text-zinc-400 capitalize">
                    {payment.plan.replace("pro_", "")}
                  </td>
                  <td className="px-6 py-4 text-zinc-500 font-mono text-xs flex items-center gap-2 group-hover:text-zinc-300 transition-colors">
                    <button onClick={() => generateReceiptPDF(payment)} className="flex items-center gap-1 hover:text-[#00FFB2] transition-colors p-1" title="Download Receipt PDF">
                      <Download size={14} />
                      <span className="truncate w-24">{payment.payment_id !== "mock" ? payment.payment_id : "TRIAL_ACTV"}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
