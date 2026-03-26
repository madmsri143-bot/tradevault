"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white flex items-center justify-center min-h-screen p-6 font-mono">
        <div className="max-w-2xl w-full bg-zinc-900 border border-red-500/50 p-8 rounded-xl space-y-6">
          <div className="flex items-center gap-3 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            <h1 className="text-2xl font-black uppercase tracking-widest">Fatal Production Crash</h1>
          </div>
          
          <div className="bg-black p-4 rounded-lg border border-white/10 overflow-x-auto">
            <p className="text-xl font-bold text-red-400 mb-2">{error.name || "Error"}</p>
            <p className="text-zinc-300 whitespace-pre-wrap">{error.message}</p>
            {error.digest && <p className="text-zinc-500 text-sm mt-4">Digest: {error.digest}</p>}
          </div>

          <div className="space-y-2">
            <h2 className="font-bold text-yellow-500">Diagnostic Check:</h2>
            <ul className="text-zinc-400 text-sm space-y-1 list-disc pl-5 pb-4">
              <li>If the error mentions <strong>Firebase: Need to provide options</strong>, you have completely forgotten to add <code>NEXT_PUBLIC_FIREBASE_API_KEY</code> and other standard Firebase variables to your Vercel Environment UI.</li>
              <li>If the error is about Node.js modules or <strong>fs / net</strong>, an unsupported module is being imported.</li>
            </ul>
          </div>

          <button onClick={() => reset()} className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors">
            Attempt Recovery Reload
          </button>
        </div>
      </body>
    </html>
  );
}
