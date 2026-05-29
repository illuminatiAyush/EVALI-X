import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Shield, 
  KeyRound, 
  Save, 
  ShieldCheck,
  Smartphone,
  Globe,
  LogOut
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function ProfilePage() {
  const { user, role, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (passwords.newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: passwords.newPassword 
      });
      if (error) throw error;
      toast.success('Password updated successfully');
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Account Settings</h1>
          <p className="text-text-muted mt-1">Manage your professional identity and security.</p>
        </div>
        <Button variant="outline" onClick={logout} className="text-danger hover:bg-danger/5 border-danger/20">
          <LogOut size={18} className="mr-2" />
          End Session
        </Button>
      </header>

      <div className="grid md:grid-cols-12 gap-8">
        {/* Left Column: Basic Info */}
        <div className="md:col-span-5 space-y-6">
          <Card p="lg" className="bg-surface relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <User size={80} />
             </div>
             <div className="flex flex-col items-center text-center relative z-10">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-display font-bold text-3xl mb-4 ${role === 'teacher' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {user?.email?.[0].toUpperCase()}
                </div>
                <h2 className="text-xl font-bold">{user?.email?.split('@')[0]}</h2>
                <div className="flex items-center gap-2 px-3 py-1 bg-surface-muted border border-border rounded-full mt-3">
                  <Shield size={14} className="text-brand" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">{role} Workspace</span>
                </div>
             </div>

             <div className="mt-10 space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-xl bg-background/50 border border-border/50">
                  <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-text-muted">
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Registered Email</p>
                    <p className="text-sm font-medium truncate">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-xl bg-background/50 border border-border/50">
                  <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-text-muted">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Account Status</p>
                    <p className="text-sm font-medium text-emerald-500">Verified Professional</p>
                  </div>
                </div>
             </div>
          </Card>

          <Card p="md" className="bg-indigo-500/5 border-indigo-500/10">
             <p className="text-xs leading-relaxed text-indigo-900/60 italic font-medium">
               "EvaliX uses cryptographic session management. For your security, always terminate your session when using shared academic infrastructure."
             </p>
          </Card>
        </div>

        {/* Right Column: Security/Password */}
        <div className="md:col-span-7 space-y-6">
          <Card p="lg" className="bg-surface">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                <KeyRound size={20} />
              </div>
              <h3 className="text-xl font-display font-bold">Security Protocols</h3>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">New Access Key</label>
                  <input 
                    type="password"
                    required
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                    placeholder="Enter new password"
                    className="w-full px-5 py-3 rounded-xl bg-background border border-border focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all font-sans"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Confirm Access Key</label>
                  <input 
                    type="password"
                    required
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                    placeholder="Re-type new password"
                    className="w-full px-5 py-3 rounded-xl bg-background border border-border focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all font-sans"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                variant="primary" 
                className="w-full h-12 text-sm font-bold uppercase tracking-widest"
                disabled={loading}
              >
                {loading ? 'Updating...' : (
                  <>
                    <Save size={18} className="mr-2" />
                    Synchronize Credentials
                  </>
                )}
              </Button>
            </form>

            <div className="mt-10 pt-8 border-t border-border">
              <h4 className="text-sm font-bold mb-4">Device Authorization</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted">
                  <div className="flex items-center gap-3">
                    <Smartphone size={16} className="text-text-muted" />
                    <span className="text-xs font-medium">Current Browser Instance</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted opacity-50">
                  <div className="flex items-center gap-3">
                    <Globe size={16} className="text-text-muted" />
                    <span className="text-xs font-medium">Unknown Network Node</span>
                  </div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest bg-border px-2 py-0.5 rounded">Idle</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
