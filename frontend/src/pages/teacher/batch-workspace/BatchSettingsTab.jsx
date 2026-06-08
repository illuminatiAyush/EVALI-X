import React, { useState } from 'react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { Settings, Lock, Share2, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../../lib/api';
import { toast } from 'sonner';
import { FullPageLoader } from '../../../components/ui/Loader';

export default function BatchSettingsTab({ batchId }) {
  const [isArchiving, setIsArchiving] = useState(false);

  const { data: overview, isLoading } = useQuery({
    queryKey: ['batch-overview', batchId],
    queryFn: () => apiService.getBatchOverview(batchId),
    enabled: !!batchId,
  });

  if (isLoading) return <FullPageLoader title="Loading Settings" subtitle="Fetching configuration" />;
  if (!overview) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(overview.joinCode);
    toast.success('Join code copied to clipboard!');
  };

  const handleArchive = async () => {
    // In a full implementation, this would call an API endpoint to soft-delete the batch
    setIsArchiving(true);
    toast.error('Batch archiving is disabled in this environment.');
    setTimeout(() => setIsArchiving(false), 1000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-xl font-display font-bold text-text flex items-center gap-2">
          <Settings className="text-brand" size={20} />
          Batch Configuration
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-md">
        <Card p="lg" className="bg-surface border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-brand/10 text-brand rounded-lg">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Enrollment Code</h3>
              <p className="text-xs text-text-muted font-semibold">Share this with students to join</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-background border border-border rounded-xl px-4 py-3 font-mono font-bold text-xl tracking-widest text-center text-text shadow-inner">
              {overview.joinCode || 'UNKNOWN'}
            </div>
            <Button onClick={handleCopyCode} variant="primary" className="py-3">
              Copy Code
            </Button>
          </div>
        </Card>

        <Card p="lg" className="bg-surface border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-danger">Danger Zone</h3>
              <p className="text-xs text-text-muted font-semibold">Irreversible actions for this batch</p>
            </div>
          </div>
          
          <div className="bg-danger/5 border border-danger/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-text">Archive Batch</h4>
              <p className="text-xs text-text-muted mt-1 max-w-[200px]">Hide this batch from all active dashboards. Data is preserved.</p>
            </div>
            <Button 
              onClick={handleArchive} 
              variant="outline" 
              className="text-danger border-danger/20 hover:bg-danger/10 shrink-0"
              disabled={isArchiving}
            >
              <Trash2 size={16} className="mr-2" />
              {isArchiving ? 'Archiving...' : 'Archive Batch'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
