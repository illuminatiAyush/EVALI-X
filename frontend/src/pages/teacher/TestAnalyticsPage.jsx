import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiService } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { 
  BarChart3, Users, Trophy, TrendingUp, ArrowLeft, ChevronRight,
  BrainCircuit, CheckCircle2, AlertTriangle, Download, Search, Filter,
  FileText, FileSpreadsheet
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { FullPageLoader } from '../../components/ui/Loader';

export default function TestAnalyticsPage() {
  const { id } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    loadData();

    // Listen for live student activity on this test
    const channelName = `test-analytics-${id}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelName)
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
      const data = await apiService.getTestAnalytics(id);
      setAnalytics(data);
    } catch (err) {
      console.error('Error loading analytics:', err);
      toast.error(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      setIsDownloading(true);
      await apiService.downloadCSV(id);
      toast.success('CSV downloaded successfully');
    } catch (err) {
      toast.error('Failed to download CSV');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSummaryPDF = async () => {
    try {
      setIsDownloading(true);
      await apiService.downloadSummaryReport(id);
      toast.success('Summary PDF downloaded successfully');
    } catch (err) {
      toast.error('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadStudentPDF = async (studentId) => {
    try {
      toast.info('Generating PDF...');
      await apiService.downloadStudentReport(id, studentId);
      toast.success('Student PDF downloaded');
    } catch (err) {
      toast.error('Failed to download PDF');
    }
  };

  if (loading || !analytics) {
    return <FullPageLoader title="Loading analytics..." subtitle="Processing secure telemetry details" />;
  }

  const { test, overview, violationSummary, itemAnalysis, rawRoster } = analytics;

  const filteredRoster = rawRoster.filter(res => 
    res.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    res.studentEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <span className="px-2 py-0.5 rounded text-brand text-xs font-semibold bg-brand/10 border border-brand/20">Version {test?.test_version || 1}</span>
              <span className="text-text-muted/50">•</span>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{test?.total_questions} Questions</span>
              <span className="text-text-muted/50">•</span>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{test?.status}</span>
            </div>
            <h1 className="text-3xl font-display font-extrabold text-text tracking-tight">{test?.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
          <Button variant="outline" onClick={handleDownloadCSV} disabled={isDownloading || rawRoster.length === 0}>
            <FileSpreadsheet size={16} className="mr-2 text-emerald-500" />
            CSV Export
          </Button>
          <Button variant="primary" onClick={handleDownloadSummaryPDF} disabled={isDownloading || rawRoster.length === 0}>
            <FileText size={16} className="mr-2" />
            Summary PDF
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        {[
          { label: 'Total Attempts', value: overview.totalSubmissions, icon: Users, color: 'text-brand', bg: 'bg-brand/10' },
          { label: 'Avg. Score', value: `${overview.average}%`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Highest Score', value: `${overview.highest}%`, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Median Time', value: `${overview.medianTimeMinutes}m`, icon: CheckCircle2, color: 'text-zinc-900', bg: 'bg-zinc-900/10' },
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
            Student Rankings
          </h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-text-muted" size={16} />
              <input 
                type="text" 
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md bg-surface border border-border text-text text-sm focus:border-brand outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider w-16">Rank</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Score</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Progress</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Violations</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRoster.length > 0 ? filteredRoster.map((res, i) => {
                const percent = res.percentage;
                const violations = res.violationCount;
                const severity = res.violationSeverity;
                
                let violationColor = 'bg-danger/10 text-danger border-danger/20';
                if (severity?.HIGH > 0) violationColor = 'bg-danger/10 text-danger border-danger/20';
                else if (severity?.MEDIUM > 0) violationColor = 'bg-warning/10 text-warning border-warning/20';
                else if (violations > 0) violationColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';

                return (
                <tr key={res.studentId} className="hover:bg-surface transition-colors group">
                  <td className="px-6 py-5">
                    <span className="font-display font-bold text-text-muted text-lg">#{res.rank}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-xs uppercase">
                        {res.studentName?.[0] || res.studentEmail?.[0] || 'N'}
                      </div>
                      <div>
                        <p className="font-display font-bold text-text">{res.studentName || res.studentEmail?.split('@')[0] || 'Unknown'}</p>
                        <p className="text-xs text-text-muted">{res.studentEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-display font-bold ${percent >= 80 ? 'text-emerald-500' : percent >= 50 ? 'text-brand' : 'text-danger'}`}>
                        {percent}%
                      </span>
                      <span className="text-xs font-semibold text-text-muted">({res.score}/{res.maxScore})</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="w-32 h-1.5 bg-background border border-border rounded-full overflow-hidden relative">
                      <div 
                        className={`absolute top-0 left-0 h-full rounded-full ${percent >= 80 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-brand shadow-soft'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {violations > 0 ? (
                      <div className={`flex items-center gap-1.5 font-semibold text-xs px-2 py-1 rounded-sm border w-fit ${violationColor}`}>
                        <AlertTriangle size={14} />
                        {violations} FLAGS
                      </div>
                    ) : (
                      <span className="text-emerald-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={14} /> Clear
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-medium text-text-muted">{res.durationMinutes} min</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <Button 
                      onClick={() => handleDownloadStudentPDF(res.studentId)}
                      variant="ghost" 
                      className="px-3 py-1.5 text-xs border border-border hover:border-brand/50 hover:bg-brand/5"
                    >
                      <Download size={14} className="mr-1" />
                      PDF
                    </Button>
                  </td>
                </tr>
              );
              }) : (
                <tr>
                  <td colSpan="7" className="px-8 py-20 text-center">
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
      
      {/* Item Analysis Grid */}
      {itemAnalysis && itemAnalysis.length > 0 && (
        <Card p="xl" className="bg-surface">
          <h2 className="text-xl font-display font-bold text-text flex items-center gap-2 mb-6">
            <BrainCircuit className="text-brand" size={20} />
            Question Analysis
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {itemAnalysis.map((item, i) => (
              <div key={item.id} className="p-4 border border-border rounded-xl bg-background">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Question {i + 1}</p>
                <p className="text-sm font-medium text-text mb-4 line-clamp-2" title={item.questionSnippet}>
                  {item.questionSnippet}
                </p>
                <div className="flex items-center justify-between mt-auto">
                  <span className={`text-lg font-display font-bold ${item.accuracy >= 80 ? 'text-emerald-500' : item.accuracy >= 50 ? 'text-brand' : 'text-danger'}`}>
                    {item.accuracy}% Acc
                  </span>
                  <div className="flex gap-2 text-xs font-semibold">
                    <span className="text-emerald-500">{item.correct} ✓</span>
                    <span className="text-danger">{item.wrong} ✗</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
