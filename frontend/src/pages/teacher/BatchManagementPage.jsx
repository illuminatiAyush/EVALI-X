import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Users, Plus, Copy, CheckCircle2, CopyCheck, CalendarClock, ChevronDown } from 'lucide-react';
import { apiService } from '../../lib/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';

export default function BatchManagementPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const [newBatchName, setNewBatchName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadBatches(true);
  }, []);

  const loadBatches = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const currentOffset = isInitial ? 0 : offset;
      const response = await apiService.getBatches(LIMIT, currentOffset);
      
      const newBatches = response.data || [];
      
      if (isInitial) {
        setBatches(newBatches);
      } else {
        setBatches(prev => [...prev, ...newBatches]);
      }

      setHasMore(response.pagination?.has_more || false);
      setOffset(currentOffset + LIMIT);
    } catch (error) {
      toast.error(error.message || 'Failed to load batches');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;

    try {
      setIsCreating(true);
      const isoDate = expiresAt ? new Date(expiresAt).toISOString() : null;
      const newBatch = await apiService.createBatch(newBatchName.trim(), isoDate);
      
      setBatches(prev => [newBatch, ...prev]);
      setNewBatchName('');
      setExpiresAt('');
      toast.success('Class created successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to create class');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Auth code copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 w-full">
      <div className="pb-6 border-b border-border">
        <h1 className="text-4xl font-display font-extrabold tracking-tight text-text">Class Management</h1>
        <p className="text-text-muted font-sans mt-2">Create and manage classes for your assessments.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-lg">
        <div className="md:col-span-1">
          <Card p="lg" className="sticky top-28 bg-surface">
            <form onSubmit={handleCreateBatch} className="space-y-6">
              <h2 className="text-xl font-display font-bold text-text flex items-center gap-2">
                <div className="w-2 h-5 bg-brand rounded-sm"></div>
                New Class
              </h2>
              
              <Input
                label="Class Name"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                placeholder="e.g. History 101"
                required
              />

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <CalendarClock size={16} className="text-text-muted" />
                  Enrollment Deadline <span className="text-xs text-text-muted font-normal italic">(Optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-3 bg-background rounded-md border border-border focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-text transition-all text-sm"
                />
                <p className="text-xs text-text-muted mt-2 leading-tight">
                  Students won't be able to join the class after this time.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isCreating || !newBatchName.trim()}
                variant="primary"
                className="w-full mt-4"
              >
                {isCreating ? (
                  <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus size={18} className="mr-2" />
                    Register
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold text-text flex items-center gap-3">
              Active Classes
            </h2>
            {!loading && batches.length > 0 && (
              <span className="text-xs font-semibold bg-brand/10 text-brand px-3 py-1 rounded-sm uppercase tracking-wider">
                Count: {batches.length}
              </span>
            )}
          </div>
          
          {loading ? (
            <div className="grid sm:grid-cols-2 gap-md">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} p="md" className="animate-pulse h-40">
                  <div className="h-5 bg-border rounded-md w-2/3 mb-4"></div>
                  <div className="h-4 bg-background rounded-md w-1/3 mb-8"></div>
                  <div className="h-12 bg-background rounded-xl w-full"></div>
                </Card>
              ))}
            </div>
          ) : batches.length === 0 ? (
            <Card p="xl" className="text-center border-dashed">
              <Users size={48} className="mx-auto text-text-muted mb-4" />
              <p className="text-text-muted font-semibold uppercase tracking-wider text-sm">No classes found.</p>
            </Card>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-md">
                <AnimatePresence>
                  {batches.map((batch) => (
                    <motion.div
                      key={batch.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card p="md" interactive className="h-full flex flex-col justify-between border-l-4 border-l-transparent hover:border-l-purple-500">
                        <div className="mb-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-display font-bold text-lg text-text break-words pr-2">{batch.name}</h3>
                            {batch.expires_at && new Date(batch.expires_at) < new Date() && (
                              <span className="text-xs font-semibold uppercase tracking-wider bg-danger/10 text-danger px-2 py-0.5 rounded-sm whitespace-nowrap">
                                Locked
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-y-2 gap-x-3 mt-2">
                            <p className="text-xs text-text-muted font-medium">
                              Created: {new Date(batch.created_at).toLocaleDateString()}
                            </p>
                            {batch.student_count !== undefined && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-border hidden sm:block"></span>
                                <span className="text-xs font-semibold text-purple-500 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                                  {batch.student_count} Students
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-border mt-auto">
                          <div>
                            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Join Code</span>
                            <span className={`font-display text-xl font-bold tracking-widest ${batch.expires_at && new Date(batch.expires_at) < new Date() ? 'text-text-muted line-through opacity-50' : 'text-brand'}`}>
                              {batch.join_code}
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(batch.join_code, batch.id)}
                            className="p-2 text-text-muted hover:text-brand hover:bg-brand/10 rounded-md transition-colors border border-transparent hover:border-brand/20"
                            title="Copy code"
                            disabled={batch.expires_at && new Date(batch.expires_at) < new Date()}
                          >
                            {copiedId === batch.id ? <CopyCheck size={18} className="text-emerald-500" /> : <Copy size={18} />}
                          </button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {hasMore && (
                <div className="pt-6 flex justify-center">
                  <Button
                    onClick={() => loadBatches(false)}
                    disabled={loadingMore}
                    variant="outline"
                  >
                    {loadingMore ? (
                      <div className="w-5 h-5 border-2 border-text-muted border-t-brand rounded-full animate-spin" />
                    ) : (
                      <>
                        Load More <ChevronDown size={18} className="ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
