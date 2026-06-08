import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Send, Clock, User, AlertCircle } from 'lucide-react';
import { apiService } from '../../../lib/api';
import { toast } from 'sonner';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { formatIST } from '../../../lib/timezone';

export default function BatchNoticesTab({ batchId }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  // Fetch notices
  const { data: notices = [], isLoading, isError, error } = useQuery({
    queryKey: ['batch-notices', batchId],
    queryFn: () => apiService.getBatchNotices(batchId),
    enabled: !!batchId,
  });

  // Create notice mutation
  const createNoticeMutation = useMutation({
    mutationFn: (newNotice) => apiService.createBatchNotice(batchId, newNotice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-notices', batchId] });
      setTitle('');
      setContent('');
      toast.success('Notice published and broadcast successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to publish notice');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    createNoticeMutation.mutate({
      title: title.trim(),
      content: content.trim(),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Compose Form */}
      <div className="lg:col-span-5">
        <Card p="lg" className="bg-surface sticky top-28 border border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-xl font-display font-bold text-text flex items-center gap-2">
              <div className="w-2 h-5 bg-brand rounded-sm"></div>
              Compose Notice
            </h2>

            <Input
              label="Notice Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Test rescheduling, Assignment updates"
              required
              disabled={createNoticeMutation.isPending}
            />

            <div className="flex flex-col gap-sm">
              <label className="text-sm font-medium text-text-muted">
                Notice Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type the announcement details here..."
                required
                disabled={createNoticeMutation.isPending}
                rows={6}
                className="w-full px-3 py-2 bg-background border border-border rounded-md font-sans text-sm transition-all duration-200 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 resize-none disabled:opacity-60"
              />
            </div>

            <Button
              type="submit"
              disabled={createNoticeMutation.isPending || !title.trim() || !content.trim()}
              variant="primary"
              className="w-full mt-4"
            >
              {createNoticeMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  Publish & Broadcast
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>

      {/* History List */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-text flex items-center gap-3">
            Notice History
          </h2>
          {!isLoading && notices.length > 0 && (
            <span className="text-xs font-semibold bg-brand/10 text-brand px-3 py-1 rounded-sm uppercase tracking-wider">
              Total: {notices.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} p="md" className="animate-pulse h-32">
                <div className="h-5 bg-border rounded-md w-1/3 mb-4"></div>
                <div className="h-4 bg-background rounded-md w-full mb-2"></div>
                <div className="h-4 bg-background rounded-md w-2/3"></div>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <Card p="xl" className="text-center border-danger/20 bg-danger/5">
            <AlertCircle size={40} className="mx-auto text-danger mb-4" />
            <h3 className="text-lg font-display font-bold text-text mb-2">Failed to Load Notices</h3>
            <p className="text-text-muted text-sm">{error.message || 'Please try again later.'}</p>
          </Card>
        ) : notices.length === 0 ? (
          <Card p="xl" className="text-center border-dashed py-20 bg-surface">
            <Megaphone size={48} className="mx-auto text-text-muted opacity-30 mb-4" />
            <h3 className="text-lg font-display font-bold text-text mb-1">No Announcements Yet</h3>
            <p className="text-text-muted text-sm max-w-sm mx-auto font-sans">
              Keep your class informed. Compose a notice on the left to broadcast it in real-time to all students.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <Card 
                key={notice.id} 
                p="lg" 
                className="bg-surface border border-border hover:border-brand/30 transition-all hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="font-display font-bold text-lg text-text break-words">
                    {notice.title}
                  </h3>
                  <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
                    <Megaphone size={16} />
                  </div>
                </div>

                <p className="text-text-muted text-sm leading-relaxed mb-6 font-sans whitespace-pre-wrap">
                  {notice.content}
                </p>

                <div className="flex flex-wrap items-center justify-between border-t border-border/50 pt-4 text-xs text-text-muted gap-2">
                  <div className="flex items-center gap-1.5 font-medium">
                    <User size={14} className="text-text-muted/70" />
                    <span>Posted by {notice.teacher?.name || 'Instructor'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-text-muted/70" />
                    <span>{formatIST(notice.created_at)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
