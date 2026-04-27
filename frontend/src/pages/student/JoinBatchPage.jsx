import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Users, KeyRound, ArrowRight } from 'lucide-react';
import { apiService } from '../../lib/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';

export default function JoinBatchPage() {
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      setIsJoining(true);
      await apiService.joinBatch(joinCode.trim().toUpperCase());
      toast.success('Successfully joined the class!');
      navigate('/student/dashboard');
    } catch (error) {
      toast.error(error.message || 'Failed to join the class');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto pt-10 w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card p="xl" className="bg-surface relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          
          <div className="w-16 h-16 bg-brand/10 text-brand border border-brand/20 rounded-2xl flex items-center justify-center mb-8 relative z-10 shadow-cyan-glow">
            <KeyRound size={32} />
          </div>
          
          <div className="relative z-10">
            <h1 className="text-4xl font-display font-extrabold text-text tracking-tight mb-2">Join a Class</h1>
            <p className="text-text-muted font-sans mb-10">
              Enter the join code provided by your instructor to access your class.
            </p>

            <form onSubmit={handleJoin} className="space-y-8">
              <Input
                label="Join Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g. XJ9V-2M4K"
                className="font-display text-xl uppercase tracking-widest font-bold"
                required
              />

              <Button
                type="submit"
                disabled={isJoining || !joinCode.trim()}
                variant="primary"
                className="w-full py-4 text-sm font-semibold tracking-wider uppercase shadow-cyan-glow"
              >
                {isJoining ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    Joining...
                  </div>
                ) : (
                  <>
                    Join Class
                    <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
