import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, FileText, BarChart3, Settings, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../../lib/api';
import { FullPageLoader } from '../../../components/ui/Loader';
import BatchOverviewTab from './BatchOverviewTab';
import BatchStudentsTab from './BatchStudentsTab';
import BatchAssessmentsTab from './BatchAssessmentsTab';
import BatchAnalyticsTab from './BatchAnalyticsTab';
import BatchSettingsTab from './BatchSettingsTab';

export default function BatchWorkspaceLayout() {
  const { batchId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // We fetch basic batch details using the getBatches or a specific query.
  // Since we don't have a single batch endpoint, we can extract from overview.
  const { data: overview, isLoading } = useQuery({
    queryKey: ['batch-overview', batchId],
    queryFn: () => apiService.getBatchOverview(batchId),
    enabled: !!batchId,
  });

  if (isLoading) {
    return <FullPageLoader title="Loading Workspace" subtitle="Synchronizing class data" />;
  }

  const tabs = [
    { name: 'Overview', path: `/teacher/batches/${batchId}`, icon: LayoutDashboard },
    { name: 'Students', path: `/teacher/batches/${batchId}/students`, icon: Users },
    { name: 'Assessments', path: `/teacher/batches/${batchId}/assessments`, icon: FileText },
    { name: 'Analytics', path: `/teacher/batches/${batchId}/analytics`, icon: BarChart3 },
    { name: 'Settings', path: `/teacher/batches/${batchId}/settings`, icon: Settings },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 w-full">
      {/* Header */}
      <div className="bg-surface border border-border rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
        
        <button 
          onClick={() => navigate('/teacher/batches')}
          className="flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-text transition-colors mb-4"
        >
          <ArrowLeft size={16} /> Back to My Classes
        </button>

        <div className="flex items-end justify-between relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-1 bg-brand/10 text-brand text-[10px] font-bold uppercase tracking-widest rounded-md">
                Active Section
              </span>
            </div>
            <h1 className="text-3xl font-display font-extrabold tracking-tight text-text">Workspace</h1>
            <p className="text-text-muted font-sans mt-1">
              {overview?.studentCount || 0} enrolled students • {overview?.assessmentCount || 0} total assessments
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar border-b border-border">
        {tabs.map((tab) => {
          // Exact match for overview, startsWith for others to keep active state on nested routes
          const isActive = tab.name === 'Overview' 
            ? location.pathname === tab.path 
            : location.pathname.startsWith(tab.path);
            
          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-colors whitespace-nowrap relative ${
                isActive ? 'text-brand' : 'text-text-muted hover:text-text hover:bg-surface/50'
              }`}
            >
              <tab.icon size={18} />
              {tab.name}
              {isActive && (
                <motion.div
                  layoutId="workspaceTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand"
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="pt-4">
        <Routes>
          <Route index element={<BatchOverviewTab overview={overview} batchId={batchId} />} />
          <Route path="students" element={<BatchStudentsTab batchId={batchId} />} />
          <Route path="assessments" element={<BatchAssessmentsTab batchId={batchId} />} />
          <Route path="analytics" element={<BatchAnalyticsTab batchId={batchId} />} />
          <Route path="settings" element={<BatchSettingsTab batchId={batchId} />} />
        </Routes>
      </div>
    </div>
  );
}
