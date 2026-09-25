'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShieldAlert, 
  BrainCircuit, 
  FlaskConical, 
  Workflow, 
  Building2 
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/risk-assessment', label: 'Risk Assessment', icon: ShieldAlert },
  { href: '/explainability', label: 'Explainability (SHAP)', icon: BrainCircuit },
  { href: '/stability-lab', label: 'Stability Lab', icon: FlaskConical },
  { href: '/counterfactual', label: 'Counterfactual Analysis', icon: Workflow },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#0e0e11] border-r border-zinc-800/80 text-zinc-300 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        {/* Header Branding */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 font-semibold shadow-inner">
            <Building2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="font-semibold text-zinc-100 text-sm tracking-wide">CreditRisk AI</h1>
            <p className="text-xs text-zinc-500 font-mono">Fintech Analytics v2.0</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-800/90 text-amber-400 border border-zinc-700/60 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-800/80 text-xs text-zinc-500 font-mono">
        <p className="text-zinc-400 font-semibold">German Credit Risk Dataset</p>
        <p className="mt-0.5">Model: Logistic Regression</p>
        <p className="mt-0.5 text-zinc-600">FastAPI + Next.js App Router</p>
      </div>
    </aside>
  );
}
