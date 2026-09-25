'use client';

import { Activity } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="h-14 border-b border-zinc-800/80 bg-[#0e0e11]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 text-xs font-mono">
      <div className="flex items-center space-x-2 text-zinc-400">
        <span>System Status:</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 font-sans font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
          FastAPI Engine Operational
        </span>
      </div>
      <div className="flex items-center space-x-4 text-zinc-400">
        <span className="flex items-center space-x-1.5">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span>Recall Prioritized Decision Engine</span>
        </span>
      </div>
    </header>
  );
}
