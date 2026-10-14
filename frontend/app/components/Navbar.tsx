'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { fetchHealth } from '@/lib/api';

export default function Navbar() {
  const [healthStatus, setHealthStatus] = useState<string>('Checking...');
  const [isOperational, setIsOperational] = useState<boolean>(true);
  const [isFastAPI, setIsFastAPI] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      try {
        const data = await fetchHealth();
        if (isMounted) {
          setIsOperational(data.status === 'operational' || data.status === 'healthy');
          setIsFastAPI(data.mode === 'python_fastapi');
          setHealthStatus(data.backend_status || 'Engine Operational');
        }
      } catch (err) {
        if (isMounted) {
          setIsOperational(false);
          setHealthStatus('Engine Offline / Standalone');
        }
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-14 border-b border-zinc-800/80 bg-[#0e0e11]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 text-xs font-mono">
      <div className="flex items-center space-x-2 text-zinc-400">
        <span>System Status:</span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded font-sans font-medium border ${
          isOperational 
            ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60'
            : 'text-amber-400 bg-amber-950/60 border-amber-800/60'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            isOperational ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
          }`}></span>
          {healthStatus}
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
