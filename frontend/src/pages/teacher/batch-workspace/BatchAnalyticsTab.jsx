import React from 'react';
import Card from '../../../components/ui/Card';
import { BarChart3, TrendingUp, Trophy, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../../lib/api';
import { FullPageLoader } from '../../../components/ui/Loader';

export default function BatchAnalyticsTab({ batchId }) {
  // Use getBatchOverview for now, or a specialized analytics endpoint if built
  const { data: overview, isLoading } = useQuery({
    queryKey: ['batch-overview', batchId],
    queryFn: () => apiService.getBatchOverview(batchId),
    enabled: !!batchId,
  });

  if (isLoading) return <FullPageLoader title="Loading Analytics" subtitle="Fetching performance metrics" />;
  if (!overview) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-xl font-display font-bold text-text flex items-center gap-2">
          <BarChart3 className="text-brand" size={20} />
          Batch Performance Analytics
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <Card p="lg" className="bg-surface border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <h3 className="font-bold text-lg">Overall Trajectory</h3>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-text-muted font-semibold uppercase tracking-wider mb-1">Class Average</p>
              <p className="text-4xl font-display font-bold text-emerald-500">{overview.averageScore}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted font-semibold uppercase tracking-wider mb-1">Submissions</p>
              <p className="text-2xl font-bold text-text">{overview.submissionRate}%</p>
            </div>
          </div>
        </Card>

        <Card p="lg" className="bg-surface border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <Trophy size={20} />
            </div>
            <h3 className="font-bold text-lg">Integrity & Engagement</h3>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-text-muted font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                <AlertTriangle size={14} /> Total Violations
              </p>
              <p className="text-4xl font-display font-bold text-amber-500">{overview.totalViolations}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted font-semibold uppercase tracking-wider mb-1">Active Now</p>
              <p className="text-2xl font-bold text-text">{overview.activeAssessments}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card p="xl" className="bg-surface text-center py-20 border-dashed">
        <BarChart3 size={48} className="mx-auto text-text-muted opacity-20 mb-4" />
        <h3 className="text-lg font-display font-bold text-text mb-2">Historical Graph Construction</h3>
        <p className="text-text-muted max-w-sm mx-auto">
          We are capturing more data points from this batch to generate a multi-dimensional progress curve.
        </p>
      </Card>
    </div>
  );
}
