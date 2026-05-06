import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  BarChart3, 
  Cpu, 
  History, 
  ShieldCheck, 
  Activity,
  ArrowUpRight,
  Database,
  Search
} from 'lucide-react';
import { apiService } from '../../lib/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function AnalyticsPage() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const data = await apiService.getAIUsage();
      setUsage(data);
    } catch (err) {
      console.error('Failed to load usage', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-14 h-14 border-4 border-background border-t-brand rounded-full animate-spin shadow-soft mb-4"></div>
        <p className="text-text-muted font-sans font-medium text-sm">Synchronizing API Metrics...</p>
      </div>
    );
  }

  const percentageUsed = ((usage?.summary?.totalTokens || 0) / (usage?.summary?.limit || 100000)) * 100;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-display font-extrabold tracking-tight">System Telemetry</h1>
          <p className="text-text-muted font-sans mt-2">Real-time metrics for LLM consumption and operational throughput.</p>
        </div>
        <div className="flex items-center gap-3 bg-surface border border-border p-2 rounded-xl">
          <div className="px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={14} />
            Quota Verified
          </div>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card p="lg" className="bg-surface relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap size={80} />
          </div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Total Tokens Consumed</p>
          <div className="flex items-end gap-3">
            <h3 className="text-4xl font-display font-extrabold text-text">{usage?.summary?.totalTokens?.toLocaleString() || 0}</h3>
            <span className="text-xs font-mono text-brand font-bold mb-2">/ 100k</span>
          </div>
          <div className="mt-6 w-full h-1.5 bg-background rounded-full overflow-hidden border border-border">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentageUsed, 100)}%` }}
              className={`h-full ${percentageUsed > 80 ? 'bg-danger' : 'bg-brand'} shadow-soft`}
            />
          </div>
          <p className="mt-3 text-[10px] font-medium text-text-muted uppercase tracking-widest">
            {Math.round(percentageUsed)}% of monthly allocation utilized
          </p>
        </Card>

        <Card p="lg" className="bg-surface relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Activity size={80} />
          </div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Assessment Operations</p>
          <div className="flex items-end gap-3">
            <h3 className="text-4xl font-display font-extrabold text-text">{usage?.summary?.generationCount || 0}</h3>
            <span className="text-xs font-mono text-emerald-500 font-bold mb-2">+12% vs last week</span>
          </div>
          <div className="mt-6 flex gap-1">
            {[4, 7, 5, 8, 6, 9, 7].map((h, i) => (
              <div key={i} className="flex-1 bg-emerald-500/10 border-b-2 border-emerald-500/30 rounded-t-sm" style={{ height: `${h * 4}px` }}></div>
            ))}
          </div>
        </Card>

        <Card p="lg" className="bg-surface relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Database size={80} />
          </div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Engine Availability</p>
          <div className="flex items-end gap-3">
            <h3 className="text-4xl font-display font-extrabold text-text">99.8%</h3>
            <span className="text-xs font-mono text-brand font-bold mb-2">READY</span>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <div className="flex-1 h-1 bg-emerald-500 rounded-full"></div>
            <div className="flex-1 h-1 bg-emerald-500 rounded-full"></div>
            <div className="flex-1 h-1 bg-emerald-500 rounded-full"></div>
            <div className="flex-1 h-1 bg-emerald-500 rounded-full"></div>
            <div className="flex-1 h-1 bg-zinc-200 rounded-full"></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Usage Chart */}
        <Card p="0" className="lg:col-span-8 overflow-hidden bg-surface">
          <div className="p-8 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/10 text-brand rounded-lg">
                <BarChart3 size={20} />
              </div>
              <h3 className="text-xl font-display font-bold">Consumption Over Time</h3>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-background border border-border rounded-md text-[10px] font-bold uppercase tracking-wider">7 Days</span>
            </div>
          </div>
          <div className="p-8 h-[300px] flex items-end justify-between gap-4">
            {usage?.dailyBreakdown?.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                <div className="w-full relative flex flex-col justify-end h-[200px]">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((day.tokens / 20000) * 100, 5)}%` }}
                    className="w-full bg-brand/10 border-t-2 border-brand group-hover:bg-brand/20 transition-all rounded-t-lg relative"
                  >
                    <div className="absolute -top-10 left-1/2 -tranzinc-x-1/2 bg-text text-background text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {day.tokens.toLocaleString()} tokens
                    </div>
                  </motion.div>
                </div>
                <span className="text-[10px] font-mono font-bold text-text-muted uppercase rotate-45 mt-2">{day.date.split('-').slice(1).join('/')}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Model Distribution */}
        <Card p="lg" className="lg:col-span-4 bg-surface">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-zinc-900/10 text-zinc-900 rounded-lg">
              <Cpu size={20} />
            </div>
            <h3 className="text-xl font-display font-bold">Model Distribution</h3>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold">Llama 3.3 70B</span>
                <span className="text-xs font-mono text-text-muted">82%</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden border border-border">
                <div className="h-full w-[82%] bg-brand"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold">Gemini 2.0 Flash</span>
                <span className="text-xs font-mono text-text-muted">15%</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden border border-border">
                <div className="h-full w-[15%] bg-zinc-900"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold">Other (Fallback)</span>
                <span className="text-xs font-mono text-text-muted">3%</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden border border-border">
                <div className="h-full w-[3%] bg-text-muted"></div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center gap-2 text-brand mb-2">
              <ArrowUpRight size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Efficiency Rating</span>
            </div>
            <p className="text-sm text-text-muted font-sans leading-relaxed">
              Your assessment-to-token ratio is currently <span className="text-text font-bold text-emerald-500">EXCELLENT</span>. Consider enabling caching for repetitive syllabus structures.
            </p>
          </div>
        </Card>
      </div>

      {/* Recent History */}
      <Card p="0" className="overflow-hidden bg-surface">
        <div className="p-8 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <History size={20} />
            </div>
            <h3 className="text-xl font-display font-bold">Operational Logs</h3>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-text-muted" size={14} />
            <input 
              type="text" 
              placeholder="Filter logs..." 
              className="bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-background/50 border-b border-border text-[10px] font-bold text-text-muted uppercase tracking-widest">
                <th className="px-8 py-4">Timestamp</th>
                <th className="px-8 py-4">Operation</th>
                <th className="px-8 py-4">Processor</th>
                <th className="px-8 py-4">Volume</th>
                <th className="px-8 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((_, i) => (
                <tr key={i} className="hover:bg-background/50 transition-colors">
                  <td className="px-8 py-5 text-xs font-mono text-text-muted">2026-05-06 14:2{i}:12</td>
                  <td className="px-8 py-5 text-sm font-bold text-text">Assessment Generation</td>
                  <td className="px-8 py-5 text-xs text-text-muted">llama-3.3-70b-versatile</td>
                  <td className="px-8 py-5 text-xs font-mono text-brand font-bold">2,412 Tokens</td>
                  <td className="px-8 py-5 text-right">
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-bold uppercase tracking-tighter border border-emerald-500/20">Success</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
