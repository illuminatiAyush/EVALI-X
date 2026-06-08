import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../../lib/api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { FileText, Calendar, ChevronRight } from 'lucide-react';
import { formatISTDate } from '../../../lib/timezone';
import { toast } from 'sonner';
import { FullPageLoader } from '../../../components/ui/Loader';
import { useNavigate } from 'react-router-dom';

export default function BatchAssessmentsTab({ batchId }) {
  const navigate = useNavigate();
  const [transitioning, setTransitioning] = useState({});

  const { data: assessments, isLoading, refetch } = useQuery({
    queryKey: ['batch-assessments', batchId],
    queryFn: () => apiService.getBatchAssessments(batchId),
    enabled: !!batchId,
  });

  if (isLoading) return <FullPageLoader title="Loading Assessments" subtitle="Fetching scheduled tests" />;

  const handleStateTransition = async (testId, action) => {
    if (transitioning[testId]) return;
    
    setTransitioning(prev => ({ ...prev, [testId]: action }));
    try {
      await apiService.updateTestStatus(testId, action);
      refetch();
    } catch (err) {
      toast.error(err.message || `Failed to ${action} assessment`);
    } finally {
      setTransitioning(prev => {
        const next = { ...prev };
        delete next[testId];
        return next;
      });
    }
  };

  if (!assessments || assessments.length === 0) {
    return (
      <Card p="xl" className="text-center border-dashed">
        <FileText size={48} className="mx-auto text-text-muted mb-4" />
        <p className="text-text-muted font-semibold uppercase tracking-wider text-sm">No assessments assigned yet.</p>
        <Button to="/teacher/create-test" variant="outline" className="mt-6 mx-auto">Create Assessment</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card p="0" className="overflow-hidden bg-background">
        <div className="divide-y divide-border">
          {assessments.map((test) => {
            const isExpired = test.end_time && test.status !== 'ended' ? (new Date(test.end_time) < new Date()) : false;
            const displayStatus = isExpired ? 'ended' : test.status;
            
            return (
            <div key={test.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-surface transition-colors group gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface border border-border rounded-xl flex items-center justify-center text-text-muted group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-display font-bold group-hover:text-brand transition-colors">{test.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs font-semibold text-text-muted">
                    <span className={`px-2 py-0.5 rounded-sm uppercase tracking-widest ${
                      displayStatus === 'scheduled' ? 'bg-emerald-500/10 text-emerald-500' :
                      displayStatus === 'active' ? 'bg-brand/10 text-brand' :
                      displayStatus === 'ended' ? 'bg-surface text-text-muted border border-border' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {displayStatus}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-border"></span>
                    <span className="flex items-center gap-1 uppercase">
                      <Calendar size={12} />
                      {formatISTDate(test.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 justify-between sm:justify-end">
                <div className="flex items-center gap-3">
                  {displayStatus === 'scheduled' && (
                    <Button 
                      onClick={() => handleStateTransition(test.id, 'start')}
                      variant="primary"
                      disabled={!!transitioning[test.id]}
                      className="px-3 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white border-transparent disabled:opacity-50"
                    >
                      {transitioning[test.id] === 'start' ? (
                        <span className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Starting...</span>
                      ) : 'Start Now'}
                    </Button>
                  )}
                  {displayStatus === 'active' && (
                    <Button 
                      onClick={() => handleStateTransition(test.id, 'end')}
                      variant="danger"
                      disabled={!!transitioning[test.id]}
                      className={`px-3 py-1.5 text-xs disabled:opacity-50 ${!transitioning[test.id] ? 'animate-pulse' : ''}`}
                    >
                      {transitioning[test.id] === 'end' ? (
                        <span className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Terminating...</span>
                      ) : 'Terminate'}
                    </Button>
                  )}
                  {displayStatus === 'ended' && (
                    <Button 
                      onClick={() => handleStateTransition(test.id, 'restart')}
                      variant="primary"
                      disabled={!!transitioning[test.id]}
                      className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white border-transparent disabled:opacity-50"
                    >
                      {transitioning[test.id] === 'restart' ? (
                        <span className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Restarting...</span>
                      ) : 'Restart'}
                    </Button>
                  )}
                  {displayStatus === 'active' ? (
                    <Button 
                      onClick={() => navigate(`/teacher/test/${test.id}/live`)}
                      variant="primary"
                      className="px-3 py-1.5 text-xs"
                    >
                      Live Monitor
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => navigate(`/teacher/analytics/${test.id}`)}
                      variant="outline"
                      className="px-3 py-1.5 text-xs"
                    >
                      Analytics
                      <ChevronRight size={14} className="ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
      </Card>
    </div>
  );
}
