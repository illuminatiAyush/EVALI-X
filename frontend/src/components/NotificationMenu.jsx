import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiService } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function NotificationMenu() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => apiService.getNotifications(),
    enabled: !!user,
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: (ids) => apiService.markNotificationsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Setup Realtime listener for new notifications
  useEffect(() => {
    if (!user) return;

    const channelName = `user-notifications-${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newNotif = payload.new;
        toast(newNotif.title, { description: newNotif.message });
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) {
      markReadMutation.mutate(unreadIds);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-surface border border-transparent hover:border-border transition-colors text-text"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
            <h3 className="font-display font-bold text-text">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs text-text-muted hover:text-text flex items-center gap-1 transition-colors"
              >
                <Check size={14} /> Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-text-muted text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-text-muted flex flex-col items-center justify-center gap-2">
                <Bell size={24} className="opacity-20" />
                <span className="text-sm">No new notifications</span>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`p-4 transition-colors hover:bg-surface/50 cursor-pointer ${notif.is_read ? 'opacity-60' : 'bg-primary/5'}`}
                    onClick={() => {
                      if (!notif.is_read) markReadMutation.mutate([notif.id]);
                    }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm text-text">{notif.title}</span>
                      {!notif.is_read && <span className="w-2 h-2 bg-primary rounded-full mt-1 flex-shrink-0"></span>}
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] text-text-muted/70 mt-2 block">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
