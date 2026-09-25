'use client';

import { useEffect, useState } from 'react';
import { fetchModelInfo } from '@/lib/api';
import { 
  Users, 
  AlertTriangle, 
  Award, 
  Target, 
  TrendingUp 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

export default function OverviewPage() {
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchModelInfo()
      .then((data) => {
        setModelInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-zinc-400 font-mono text-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mr-3"></div>
        Connecting to FastAPI engine...
      </div>
    );
  }

  if (error || !modelInfo) {
    return (
      <div className="p-6 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 font-mono text-sm">
        Error loading model metrics from backend API: {error}. Make sure FastAPI is running (`python backend/app/main.py`).
      </div>
    );
  }

  const bestName = modelInfo.best_model_name;
  const bestMetrics = modelInfo.models[bestName];
  const totalRecords = modelInfo.total_records;
  const defaultRate = modelInfo.default_rate;

  // Recharts data format
  const comparisonData = Object.entries(modelInfo.models).map(([name, m]: [string, any]) => ({
    name,
    Recall: m.Recall,
    'ROC-AUC': m['ROC-AUC'],
    'PR-AUC': m['PR-AUC'],
    Accuracy: m.Accuracy,
  }));

  const pieData = [
    { name: 'Non-Default (Good)', value: Math.round(totalRecords * (1 - defaultRate)), color: '#10b981' },
    { name: 'Default (Bad)', value: Math.round(totalRecords * defaultRate), color: '#f43f5e' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100 tracking-tight">System Overview & Model Benchmark</h1>
        <p className="text-xs text-zinc-400 font-mono mt-1">
          Empirical evaluation matrix generated from actual train/test predictions on German Credit Dataset.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-[#141417] border border-zinc-800/80 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Total Dataset</span>
            <Users className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-100">{totalRecords.toLocaleString()}</p>
          <p className="text-[11px] text-zinc-500 font-mono">German Credit Records</p>
        </div>

        <div className="bg-[#141417] border border-zinc-800/80 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Default Rate</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{(defaultRate * 100).toFixed(1)}%</p>
          <p className="text-[11px] text-zinc-500 font-mono">300 Bad / 700 Good</p>
        </div>

        <div className="bg-[#141417] border border-zinc-800/80 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Selected Best</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-emerald-400 truncate">{bestName}</p>
          <p className="text-[11px] text-zinc-500 font-mono">Class Weighted</p>
        </div>

        <div className="bg-[#141417] border border-zinc-800/80 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>ROC-AUC Score</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-100">{bestMetrics['ROC-AUC'].toFixed(4)}</p>
          <p className="text-[11px] text-zinc-500 font-mono">Test Set Standard</p>
        </div>

        <div className="bg-[#141417] border border-zinc-800/80 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Recall (Sensitivity)</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{bestMetrics.Recall.toFixed(4)}</p>
          <p className="text-[11px] text-zinc-500 font-mono">80.0% Defaulters Caught</p>
        </div>
      </div>

      {/* Visual Benchmark Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-[#141417] border border-zinc-800/80 p-5 rounded-xl space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200 tracking-wide font-mono">
            Model Performance Benchmark (Test Split)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                <YAxis domain={[0, 1.0]} stroke="#71717a" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#f4f4f5' }} />
                <Bar dataKey="Recall" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ROC-AUC" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="PR-AUC" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Accuracy" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#141417] border border-zinc-800/80 p-5 rounded-xl space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200 tracking-wide font-mono">
            Target Distribution Ratio
          </h2>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#f4f4f5' }} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Model Matrix Table */}
      <div className="bg-[#141417] border border-zinc-800/80 p-5 rounded-xl space-y-4">
        <h2 className="text-sm font-semibold text-zinc-200 tracking-wide font-mono">
          Empirical Model Metrics Comparison Matrix
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left font-mono">
            <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Model Name</th>
                <th className="py-2.5 px-4 font-semibold">Accuracy</th>
                <th className="py-2.5 px-4 font-semibold">Precision</th>
                <th className="py-2.5 px-4 font-semibold">Recall</th>
                <th className="py-2.5 px-4 font-semibold">F1-Score</th>
                <th className="py-2.5 px-4 font-semibold">ROC-AUC</th>
                <th className="py-2.5 px-4 font-semibold">PR-AUC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {Object.entries(modelInfo.models).map(([name, m]: [string, any]) => (
                <tr key={name} className={name === bestName ? 'bg-emerald-950/20 font-semibold text-emerald-300' : 'hover:bg-zinc-900/40'}>
                  <td className="py-3 px-4 flex items-center space-x-2">
                    {name === bestName && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                    <span>{name}</span>
                  </td>
                  <td className="py-3 px-4">{m.Accuracy.toFixed(4)}</td>
                  <td className="py-3 px-4">{m.Precision.toFixed(4)}</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">{m.Recall.toFixed(4)}</td>
                  <td className="py-3 px-4">{m['F1-Score'].toFixed(4)}</td>
                  <td className="py-3 px-4 text-blue-400 font-bold">{m['ROC-AUC'].toFixed(4)}</td>
                  <td className="py-3 px-4">{m['PR-AUC'].toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-zinc-500 font-mono">
          Note: Logistic Regression was selected because missing a defaulter (False Negative) costs significant capital loss. Recall (80.0%) was prioritized over accuracy alone.
        </p>
      </div>
    </div>
  );
}
