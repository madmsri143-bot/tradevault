"use client";

import { useAuth } from "@/lib/AuthContext";
import { useTrial, useTrialWindow } from "@/components/TrialGuard";
import { Download, FileText, Presentation, Loader2 } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useModal } from "@/lib/ModalContext";
import { useState } from "react";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function ExportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { confirm, alert } = useModal();
  const { access } = useTrial();
  const { trialStart, trialEnd, isTrialRestricted } = useTrialWindow();
  const isFree = access === "free";
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportMode, setExportMode] = useState<"all" | "range" | null>(null);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  const getTradeData = async () => {
    if (!user) return [];
    const querySnapshot = await getDocs(collection(db, "users", user.uid, "trades"));
    const trades = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return trades.sort((a: any, b: any) => parseFloat(b.date) - parseFloat(a.date));
  };

  const fetchAndFilterTrades = async () => {
    if (!exportMode) {
      await alert({ title: "Selection Required", message: "Please select Entire History or Specific Date Range.", variant: "info" });
      return null;
    }
    
    if (exportMode === "range" && (!exportFrom || !exportTo)) {
      await alert({ title: "Date Range Required", message: "Please select both From and To dates for the Specific Date Range.", variant: "info" });
      return null;
    }

    const allTrades = await getTradeData();
    let filtered = allTrades;
    
    if (exportMode === "range") {
      const fromD = new Date(exportFrom).setHours(0,0,0,0);
      const toD = new Date(exportTo).setHours(23,59,59,999);
      filtered = allTrades.filter((t: any) => {
        const d = new Date(t.date).getTime();
        return d >= fromD && d <= toD;
      });
    }

    if (isTrialRestricted && trialStart && trialEnd) {
      const trialStartMs = trialStart.getTime();
      const trialEndMs = trialEnd.getTime();
      const beforeFilter = filtered.length;
      filtered = filtered.filter((t: any) => {
        const d = new Date(t.date).getTime();
        return d >= trialStartMs && d <= trialEndMs;
      });
      const skipped = beforeFilter - filtered.length;
      if (skipped > 0 && filtered.length > 0) {
        await alert({ title: "Trial Export", message: `Exporting ${filtered.length} trades within your trial period. ${skipped} trades outside the window were excluded. Upgrade for full history exports.`, variant: "info" });
      }
    }

    if (filtered.length === 0) {
      await alert({ title: "No Trades Found", message: isTrialRestricted ? "No trades found within your trial period. Upgrade for full history exports." : "No trades available for selected range.", variant: "info" });
      return null;
    }
    return filtered;
  };

  const handleExportGated = async () => {
    await confirm({
      title: "Pro Feature",
      message: "Export is available on the Professional Plan. Upgrade to unlock PDF, CSV, and PPTX exports.",
      confirmLabel: "Upgrade to Pro",
      cancelLabel: "Maybe Later",
      variant: "safe"
    }).then((confirmed) => {
      if (confirmed) router.push("/billing");
    });
  };

  const handleExportCSV = async () => {
    if (isFree) { handleExportGated(); return; }
    const trades = await fetchAndFilterTrades();
    if (!trades) return;
    setIsExporting(true);
    try {
      const headers = ["Date", "Asset", "Direction", "Entry", "Exit", "Status", "PnL", "Lot", "Notes"];
      let totalPnl = 0;
      const csvContentRows = trades.map((t: any) => {
        const pnl = t.pnl || 0;
        const isProfit = pnl >= 0;
        const actualPnl = isProfit ? Math.abs(pnl) : -Math.abs(pnl);
        totalPnl += actualPnl;
        const resultText = t.result ? t.result.toUpperCase() : (isProfit ? "PROFIT" : "LOSS");
        return [
          format(new Date(parseFloat(t.date)), "yyyy-MM-dd"),
          t.pair || t.symbol || "-",
          t.direction || t.type || "-",
          t.entryPrice || "-",
          t.exitPrice || "-",
          resultText,
          actualPnl,
          t.lot || "-",
          `"${(t.note || "-").replace(/"/g, '""')}"`
        ].join(",");
      });

      const csvContent = [
        headers.join(","),
        ...csvContentRows,
        `\nTotal PnL: $${totalPnl.toFixed(2)}`
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `JournalBud_Export_${format(new Date(), "MMM_dd_yyyy")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(err) {
      console.error(err);
      await alert({ title: "Export Failed", message: "Failed to export trades.", variant: "danger" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (isFree) { handleExportGated(); return; }
    const trades = await fetchAndFilterTrades();
    if (!trades) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF("landscape");

      doc.setFillColor(17, 17, 17);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, "F");
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("JOURNALBUD", 14, 18);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 180, 180);
      doc.text(`Trade History Report  |  ${format(new Date(), "PP")}`, 14, 28);
      doc.setTextColor(0, 0, 0);
      
      let totalPnl = 0;
      const bodyData = trades.map((t: any) => {
        const pnl = t.pnl || 0;
        const isProfit = pnl >= 0;
        const actualPnl = isProfit ? Math.abs(pnl) : -Math.abs(pnl);
        totalPnl += (isProfit ? actualPnl : -actualPnl);
        const resultText = t.result ? t.result.toUpperCase() : (isProfit ? "PROFIT" : "LOSS");
        const typeText = (t.direction || t.type || "-").toUpperCase();
        
        return [
          format(new Date(parseFloat(t.date)), "MM/dd/yy"),
          t.pair || t.symbol || "-",
          typeText,
          t.entryPrice ? String(t.entryPrice) : "-",
          t.exitPrice ? String(t.exitPrice) : "-",
          resultText,
          `${isProfit ? '+' : '-'}${Math.abs(actualPnl).toFixed(2)}`,
          t.lot ? String(t.lot) : "-",
          t.note || "-"
        ];
      });

      autoTable(doc, {
        startY: 42,
        head: [["Date", "Asset", "Direction", "Entry", "Exit", "Status", "PnL", "Lot", "Notes"]],
        body: bodyData,
        theme: "plain",
        headStyles: {
          fillColor: [17, 17, 17],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
          halign: "center",
          cellPadding: 4,
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [50, 50, 50],
          cellPadding: 3.5,
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        styles: {
          lineWidth: 0.1,
          lineColor: [220, 220, 220],
        },
        didParseCell: function(data: any) {
          if (data.section === 'body') {
            const colIndex = data.column.index;
            const text = data.cell.text[0];
            if (colIndex === 2) {
               if (text === 'BUY') { data.cell.styles.textColor = [16, 185, 129]; data.cell.styles.fontStyle = 'bold'; }
               if (text === 'SELL') { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; }
            }
            if (colIndex === 5) {
               if (text === 'PROFIT') { data.cell.styles.textColor = [16, 185, 129]; data.cell.styles.fontStyle = 'bold'; }
               if (text === 'LOSS') { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; }
            }
            if (colIndex === 6) {
               data.cell.styles.fontStyle = 'bold';
               if (text.startsWith('+')) data.cell.styles.textColor = [16, 185, 129];
               if (text.startsWith('-') && text !== '-') data.cell.styles.textColor = [220, 38, 38];
            }
          }
        }
      });
      
      const finalY = (doc as any).lastAutoTable.finalY || 42;
      const totalSign = totalPnl >= 0 ? "+" : "";
      doc.setFillColor(17, 17, 17);
      doc.roundedRect(14, finalY + 8, 80, 14, 2, 2, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`Total P&L: ${totalSign}${totalPnl.toFixed(2)}`, 20, finalY + 17);
      
      doc.save(`JournalBud_History_${format(new Date(), "MMM_dd_yyyy")}.pdf`);
    } catch(err) {
      console.error(err);
      await alert({ title: "Export Failed", message: "Failed to export PDF.", variant: "danger" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPPT = async () => {
    if (isFree) { handleExportGated(); return; }
    const trades = await fetchAndFilterTrades();
    if (!trades) return;
    setIsExporting(true);
    try {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_16x9";
      
      const slide = pptx.addSlide();
      slide.addText("JournalBud Performance Report", { x: 0.5, y: 0.5, w: "90%", h: 0.5, fontSize: 24, bold: true, color: "00FFB2" });
      slide.addText(`Generated on ${format(new Date(), "PP")}`, { x: 0.5, y: 1.0, w: "90%", h: 0.5, fontSize: 14, color: "888888" });
      
      const headers: any[] = [
        { text: "Date", options: { bold: true, fill: { color: "00FFB2" }, color: "000000" } },
        { text: "Asset", options: { bold: true, fill: { color: "00FFB2" }, color: "000000" } },
        { text: "Direction", options: { bold: true, fill: { color: "00FFB2" }, color: "000000" } },
        { text: "Entry", options: { bold: true, fill: { color: "00FFB2" }, color: "000000" } },
        { text: "Exit", options: { bold: true, fill: { color: "00FFB2" }, color: "000000" } },
        { text: "Status", options: { bold: true, fill: { color: "00FFB2" }, color: "000000" } },
        { text: "PnL", options: { bold: true, fill: { color: "00FFB2" }, color: "000000" } },
        { text: "Lot", options: { bold: true, fill: { color: "00FFB2" }, color: "000000" } },
        { text: "Notes", options: { bold: true, fill: { color: "00FFB2" }, color: "000000" } }
      ];

      const rows: any[] = [headers];
      
      trades.slice(0, 15).forEach((t: any) => {
        const pnl = t.pnl || 0;
        const isProfit = pnl >= 0;
        const actualPnl = isProfit ? Math.abs(pnl) : -Math.abs(pnl);
        const resultText = t.result ? t.result.toUpperCase() : (isProfit ? "PROFIT" : "LOSS");
        const typeText = (t.direction || t.type || "-").toUpperCase();
        const pnlText = `${isProfit ? '+' : '-'}${Math.abs(actualPnl).toFixed(2)}`;
        
        const typeColor = typeText === 'BUY' ? '10B981' : (typeText === 'SELL' ? 'EF4444' : 'FFFFFF');
        const statusColor = resultText === 'PROFIT' ? '10B981' : (resultText === 'LOSS' ? 'EF4444' : 'FFFFFF');
        const pnlColor = isProfit ? '10B981' : 'EF4444';

        rows.push([
          { text: format(new Date(parseFloat(t.date)), "MM/dd/yy") },
          { text: t.pair || t.symbol || "-" },
          { text: typeText, options: { color: typeColor, bold: true } },
          { text: t.entryPrice ? t.entryPrice.toString() : "-" },
          { text: t.exitPrice ? t.exitPrice.toString() : "-" },
          { text: resultText, options: { color: statusColor, bold: true } },
          { text: pnlText, options: { color: pnlColor, bold: true } },
          { text: t.lot ? t.lot.toString() : "-" },
          { text: t.note ? t.note.substring(0, 20) : "-" }
        ]);
      });
      
      slide.addTable(rows, {
        x: 0.5, y: 1.8, w: 9.0, colW: [1.0, 1.0, 1.0, 0.8, 0.8, 1.0, 1.0, 0.6, 1.8],
        fontSize: 10, border: { type: "solid", color: "444444", pt: 1 },
        fill: { color: "111111" }, color: "FFFFFF", align: "center", valign: "middle"
      });

      const exactTotalPnl = trades.reduce((acc: number, t: any) => {
         const p = t.pnl || 0;
         return acc + (p >= 0 ? Math.abs(p) : -Math.abs(p));
      }, 0);
      
      slide.addText(`Total PnL: $${exactTotalPnl.toFixed(2)}`, { x: 0.5, y: 6.8, w: "90%", h: 0.5, fontSize: 16, bold: true, color: "FFFFFF" });
      
      await pptx.writeFile({ fileName: `JournalBud_Presentation_${format(new Date(), "MMM_dd_yyyy")}.pptx` });
    } catch(err) {
      console.error(err);
      await alert({ title: "Export Failed", message: "Failed to export PPT.", variant: "danger" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[800px] mx-auto pb-10 mt-6 lg:mt-10 overflow-y-auto custom-scrollbar h-[calc(100vh-100px)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-[#111827] pb-6 px-4 sm:px-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-[#EAEAEA] flex items-center gap-3">
            <Download className="text-[#D4AF37]" /> Export Center
          </h2>
          <p className="text-sm text-zinc-600 dark:text-[#A0A0A0] mt-1">Download your entire trading history for external accounting, presentations, or offline analytics.</p>
        </div>
      </div>

      <div className="space-y-8 px-4 sm:px-0 pb-10">
         <div className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] fade-slide-up shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-zinc-200 dark:border-[#111827] bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md flex items-center gap-2">
               <Download className="text-[#D4AF37]" size={18} />
               <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-[#EAEAEA]">Data Selection</h3>
            </div>
            <div className="p-6">
               <div className="mb-6 space-y-4">
                 <div className="flex flex-col gap-3 p-4 bg-black/20 rounded-2xl border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] shadow-inner">
                   <label className="flex items-center gap-3 cursor-pointer group w-fit">
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${exportMode === 'all' ? 'border-[#D4AF37] bg-[#D4AF37]/20' : 'border-zinc-700 bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md group-hover:border-zinc-500'}`}>
                       {exportMode === 'all' && <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />}
                     </div>
                     <span className={`text-sm font-bold select-none ${exportMode === 'all' ? 'text-zinc-900 dark:text-[#EAEAEA]' : 'text-zinc-600 dark:text-[#A0A0A0]'}`}>Entire History</span>
                     <input type="radio" className="hidden" checked={exportMode === 'all'} onChange={() => setExportMode('all')} />
                   </label>
                   
                   <label className="flex items-center gap-3 cursor-pointer group w-fit">
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${exportMode === 'range' ? 'border-orange-500 bg-orange-500/20' : 'border-zinc-700 bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md group-hover:border-zinc-500'}`}>
                       {exportMode === 'range' && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                     </div>
                     <span className={`text-sm font-bold select-none ${exportMode === 'range' ? 'text-zinc-900 dark:text-[#EAEAEA]' : 'text-zinc-600 dark:text-[#A0A0A0]'}`}>Specific Date Range</span>
                     <input type="radio" className="hidden" checked={exportMode === 'range'} onChange={() => setExportMode('range')} />
                   </label>

                   {exportMode === 'range' && (
                     <div className="flex flex-col sm:flex-row sm:items-center gap-3 ml-8 mt-1 animate-in slide-in-from-top-2">
                       <input 
                         type="date"
                         value={exportFrom}
                         onChange={(e) => setExportFrom(e.target.value)} 
                         className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-800 rounded p-2 text-xs text-zinc-900 dark:text-[#EAEAEA] focus:outline-none focus:border-orange-500" 
                       />
                       <span className="text-zinc-600 dark:text-[#A0A0A0] text-xs font-bold">TO</span>
                       <input 
                         type="date" 
                         value={exportTo}
                         onChange={(e) => setExportTo(e.target.value)} 
                         className="bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-800 rounded p-2 text-xs text-zinc-900 dark:text-[#EAEAEA] focus:outline-none focus:border-orange-500" 
                       />
                     </div>
                   )}
                 </div>
               </div>
               
               {isExporting && (
                 <div className="mb-4 flex items-center gap-2 text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/10 p-3 rounded-lg border border-[#D4AF37]/20 shadow-sm animate-pulse">
                   <Loader2 size={14} className="animate-spin" /> Exporting trades... Please wait.
                 </div>
               )}

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <button 
                   onClick={handleExportCSV}
                   disabled={isExporting}
                   className="p-5 bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] rounded-2xl hover:border-[#D4AF37]/50 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-3 group disabled:opacity-50"
                 >
                   <FileText size={28} className="text-zinc-600 dark:text-[#A0A0A0] group-hover:text-[#D4AF37] transition-colors" />
                   <span className="text-sm font-bold text-zinc-900 dark:text-[#EAEAEA] tracking-tight">Export CSV</span>
                 </button>
                 
                 <button 
                   onClick={handleExportPDF}
                   disabled={isExporting}
                   className="p-5 bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] rounded-2xl hover:border-red-500/50 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-3 group disabled:opacity-50"
                 >
                   <Download size={28} className="text-zinc-600 dark:text-[#A0A0A0] group-hover:text-red-600 dark:text-red-400 transition-colors" />
                   <span className="text-sm font-bold text-zinc-900 dark:text-[#EAEAEA] tracking-tight">Export PDF</span>
                 </button>
                 
                 <button 
                   onClick={handleExportPPT}
                   disabled={isExporting}
                   className="p-5 bg-white dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-[#121212] backdrop-blur-md border border-zinc-200 dark:border-[rgba(212,175,55,0.15)] rounded-2xl hover:border-orange-500/50 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-3 group disabled:opacity-50"
                 >
                   <Presentation size={28} className="text-zinc-600 dark:text-[#A0A0A0] group-hover:text-orange-400 transition-colors" />
                   <span className="text-sm font-bold text-zinc-900 dark:text-[#EAEAEA] tracking-tight">Export PPTX</span>
                 </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
