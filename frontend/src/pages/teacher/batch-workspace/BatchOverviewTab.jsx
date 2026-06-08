import React from 'react';
import Card from '../../../components/ui/Card';
import { Users, FileText, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

export default function BatchOverviewTab({ overview }) {
  if (!overview) return null;

  const stats = [
    { label: 'Enrolled Students', value: overview.studentCount, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Assessments', value: overview.assessmentCount, icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Active Now', value: overview.activeAssessments, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Average Score', value: `${overview.averageScore}%`, icon: CheckCircle2, color: 'text-brand', bg: 'bg-brand/10' },
    { label: 'Total Violations', value: overview.totalViolations, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Submission Rate', value: `${overview.submissionRate}%`, icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
        {stats.map((stat, i) => (
          <Card key={i} p="md" className="flex items-center gap-4 bg-surface border border-border">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{stat.label}</p>
              <h3 className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      {/* Add charts here later if needed */}
      <Card p="lg" className="bg-surface text-center py-20">
        <TrendingUp size={48} className="mx-auto text-text-muted opacity-20 mb-4" />
        <h3 className="text-lg font-display font-bold text-text mb-2">Detailed Analytics Coming Soon</h3>
        <p className="text-text-muted max-w-sm mx-auto">
          We are aggregating historical data to generate predictive performance models for this batch.
        </p>
      </Card>
    </div>
  );
}
