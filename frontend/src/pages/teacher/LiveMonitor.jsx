import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../lib/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ArrowLeft, Activity, Users, AlertTriangle, MonitorPlay } from 'lucide-react';
import { FullPageLoader } from '../../components/ui/Loader';
import { debugLifecycle } from '../../lib/debugLifecycle';

export default function LiveMonitor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [onlineStudents, setOnlineStudents] = useState({});

  // Fetch assessment details
  const { data: test, isLoading } = useQuery({
    queryKey: ['test', id],
    queryFn: () => apiService.getTest(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (!test) return;

    const topic = `live-monitor-${id}`;
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${topic}`);
    if (existing) supabase.removeChannel(existing);

    // Create a Supabase channel for presence tracking
    const room = supabase.channel(topic, {
      config: {
        presence: {
          key: 'teacher',
        },
      },
    });

    room.on('presence', { event: 'sync' }, () => {
      const state = room.presenceState();
      const students = {};
      
      // state is an object where keys are presence keys (e.g., student user IDs)
      // and values are arrays of presence data for that user.
      Object.keys(state).forEach((key) => {
        if (key !== 'teacher') {
          // Take the most recent presence data for the student
          students[key] = state[key][0];
        }
      });
      
      setOnlineStudents(students);
    });

    room.subscribe(async (status, err) => {
      if (status === 'SUBSCRIBED') {
        debugLifecycle.realtimeConnected(topic);
      }
      if (status === 'CHANNEL_ERROR') {
        debugLifecycle.log(`[REALTIME ERROR] ${topic}`, { error: err });
      }
      if (status === 'TIMED_OUT') {
        debugLifecycle.log(`[REALTIME TIMEOUT] ${topic}`);
      }
      if (status === 'CLOSED') {
        debugLifecycle.realtimeDisconnected(topic);
      }
    });

    return () => {
      debugLifecycle.log(`[REALTIME CLEANUP] removing ${topic}`);
      supabase.removeChannel(room);
    };
  }, [test, id]);

  if (isLoading) return <FullPageLoader title="Live Monitor" subtitle="Connecting to stream..." />;

  const onlineCount = Object.keys(onlineStudents).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <Button onClick={() => navigate(-1)} variant="outline" className="shrink-0 p-2">
          <ArrowLeft size={18} />
        </Button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 uppercase tracking-widest text-[10px] font-bold">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              Live Monitor
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-text">{test?.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
        <Card p="md" className="flex items-center gap-4 bg-surface border border-border">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Active Viewers</p>
            <h3 className="text-2xl font-display font-bold text-emerald-500">{onlineCount}</h3>
          </div>
        </Card>
      </div>

      <div className="pt-6">
        <h2 className="text-lg font-display font-bold flex items-center gap-2 mb-4">
          <MonitorPlay size={20} className="text-brand" />
          Active Sessions
        </h2>

        {onlineCount === 0 ? (
          <Card p="xl" className="text-center border-dashed">
            <Activity size={48} className="mx-auto text-text-muted mb-4 opacity-50" />
            <p className="text-text-muted font-semibold">No students are currently active in this assessment.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(onlineStudents).map((student, idx) => (
              <Card key={student.studentId || idx} p="md" className="bg-surface relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-text mb-1">{student.name || student.email || 'Unknown Student'}</h3>
                    <p className="text-xs text-text-muted flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Online • Q{student.currentQuestionIndex + 1}
                    </p>
                  </div>
                  {student.violationCount > 0 && (
                    <div className="flex items-center gap-1 bg-red-500/10 text-red-500 px-2 py-1 rounded-md text-xs font-bold border border-red-500/20">
                      <AlertTriangle size={12} /> {student.violationCount}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
