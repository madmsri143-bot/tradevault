import { BrainCircuit } from "lucide-react";

export default function AIScoreCard({ data }: { data: any }) {
  const { aiScore: score, aiInsight: insight, aiMistake: mistake, aiSuggestion: suggestion } = data;

  if (score === undefined) return null;

  const getColor = () => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[50px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
      
      <h2 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF] mb-4 flex items-center gap-2">
        <BrainCircuit size={16} className={getColor()} /> AI Trade Score
      </h2>

      <div className={`text-4xl font-black ${getColor()} drop-shadow-lg mb-6 flex items-baseline gap-2 leading-none`}>
        {score} <span className="text-xl text-zinc-700 font-bold">/ 100</span>
      </div>

      <div className="space-y-4 text-sm text-[#E5E7EB]">
        <div className="bg-[#1a1a1a] p-3.5 rounded-xl border border-[#111827] flex gap-3 shadow-inner">
          <div className="mt-0.5"><span className="text-red-400">⚠</span></div>
          <div className="flex flex-col">
            <span className="text-red-400/80 uppercase font-black tracking-widest text-[10px] mb-0.5">Mistake</span> 
            <span className="font-medium text-zinc-200">{mistake || "None manually detected"}</span>
          </div>
        </div>
        
        <div className="bg-[#1a1a1a] p-3.5 rounded-xl border border-[#111827] flex gap-3 shadow-inner">
          <div className="mt-0.5"><span className="text-blue-400">💡</span></div>
          <div className="flex flex-col">
            <span className="text-blue-400/80 uppercase font-black tracking-widest text-[10px] mb-0.5">Insight</span> 
            <span className="font-medium text-zinc-200">{insight || "Incomplete data for insight."}</span>
          </div>
        </div>
        
        <div className="bg-[#1a1a1a] p-3.5 rounded-xl border border-[#111827] flex gap-3 shadow-inner">
          <div className="mt-0.5"><span className="text-emerald-400">🚀</span></div>
          <div className="flex flex-col">
            <span className="text-emerald-400/80 uppercase font-black tracking-widest text-[10px] mb-0.5">Suggestion</span> 
            <span className="font-medium text-zinc-200">{suggestion || "Keep following your edge."}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
