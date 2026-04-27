import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiService } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { 
  BarChart3, Users, Trophy, TrendingUp, ArrowLeft, ChevronRight,
  BrainCircuit, CheckCircle2, AlertTriangle, Download, Search, Filter
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';

export default function TestAnalyticsPage() {
  const { id } = useParams();
  const [test, setTest] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();

    // Listen for live student activity on this test
    const channel = supabase.channel(`test-analytics-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attempts', filter: `test_id=eq.${id}` }, () => {
        toast.info('A student just started taking this test!');
        loadData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'results', filter: `test_id=eq.${id}` }, () => {
        toast.success('A student just submitted their answers!');
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const loadData = async () => {
    try {
      const [testData, resultsData] = await Promise.all([
        apiService.getTestById(id),
        apiService.getTestResults(id)
      ]);
      setTest(testData);
      setResults(resultsData || []);
    } catch (err) {
      console.error('Error loading analytics:', err);
      toast.error(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-background border-t-brand rounded-full animate-spin shadow-cyan-glow mb-4"></div>
        <p className="text-text-muted font-sans font-medium text-sm">Loading analytics...</p>
      </div>
    );
  }

  const avgScore = results.length > 0 
    ? Math.round(results.reduce((acc, curr) => acc + (curr.ai_feedback?.percentage || 0), 0) / results.length) 
    : 0;

  const highestScore = results.length > 0
    ? Math.max(...results.map(r => r.ai_feedback?.percentage || 0))
    : 0;

  const passRate = results.length > 0
    ? Math.round((results.filter(r => (r.ai_feedback?.percentage || 0) >= 50).length / results.length) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-border">
        <div className="flex items-center gap-4">
          <Button to="/teacher/dashboard" variant="ghost" className="px-2 py-2">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-brand text-xs font-semibold bg-brand/10 border border-brand/20">Analytics</span>
              <span className="text-text-muted/50">•</span>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{results.length} Questions</span>
            </div>
            <h1 className="text-3xl font-display font-extrabold text-text tracking-tight">{test?.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Button variant="outline">
            <Download size={16} className="mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        {[
          { label: 'Total Attempts', value: results.length, icon: Users, color: 'text-brand', bg: 'bg-brand/10' },
          { label: 'Avg. Score', value: `${avgScore}%`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Highest Score', value: `${highestScore}%`, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Pass Rate', value: `${passRate}%`, icon: CheckCircle2, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((s, i) => (
          <Card 
            key={i}
            p="md"
            className="flex flex-col border border-border bg-surface"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${s.bg} ${s.color}`}>
              <s.icon size={20} />
            </div>
            <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">{s.label}</p>
            <h3 className={`text-3xl font-display font-bold mt-1 text-right ${s.color}`}>{s.value}</h3>
          </Card>
        ))}
      </div>

      {/* Main Table */}
      <Card p="0" className="overflow-hidden bg-background">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <h2 className="text-xl font-display font-bold text-text flex items-center gap-2">
            <BarChart3 className="text-brand" size={20} />
            Student Results
          </h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input 
                type="text" 
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md bg-surface border border-border text-text text-sm focus:border-brand outline-none transition-colors"
              />
            </div>
            <Button variant="outline" className="px-3">
              <Filter size={16} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="px-8 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Student</th>
                <th className="px-8 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Score</th>
                <th className="px-8 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Progress</th>
                <th className="px-8 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Violations</th>
                <th className="px-8 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.length > 0 ? results.map((res, i) => (
                <tr key={i} className="hover:bg-surface transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-xs uppercase">
                        {res.profiles?.name?.[0] || res.profiles?.email?.[0] || 'N'}
                      </div>
                      <div>
                        <p className="font-display font-bold text-text">{res.profiles?.name || res.profiles?.email?.split('@')[0] || 'Unknown'}</p>
                        <p className="text-xs text-text-muted">{res.profiles?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-display font-bold ${(res.ai_feedback?.percentage || 0) >= 80 ? 'text-emerald-500' : (res.ai_feedback?.percentage || 0) >= 50 ? 'text-brand' : 'text-danger'}`}>
                        {res.ai_feedback?.percentage || 0}%
                      </span>
                      <span className="text-xs font-semibold text-text-muted">({res.marks || 0}/{test.total_questions || 0})</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="w-32 h-1.5 bg-background border border-border rounded-full overflow-hidden relative">
                      <div 
                        className={`absolute top-0 left-0 h-full rounded-full ${(res.ai_feedback?.percentage || 0) >= 80 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-brand shadow-cyan-glow'}`}
                        style={{ width: `${res.ai_feedback?.percentage || 0}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    {res.violation_count > 0 ? (
                      <div className="flex items-center gap-1.5 text-danger font-semibold text-xs bg-danger/10 px-2 py-1 rounded-sm border border-danger/20 w-fit">
                        <AlertTriangle size={14} />
                        {res.violation_count} FLAGS
                      </div>
                    ) : (
                      <span className="text-text-muted text-xs font-semibold uppercase tracking-wider">Clear</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <Button variant="ghost" className="px-3 py-1 text-xs">
                      Inspect
                      <ChevronRight size={14} className="ml-1" />
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mx-auto mb-4 text-text-muted">
                      <Users size={32} />
                    </div>
                    <p className="text-text-muted font-semibold text-sm uppercase tracking-wider">No results found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
