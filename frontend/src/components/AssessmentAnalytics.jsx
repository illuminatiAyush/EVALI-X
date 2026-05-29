import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

export default function AssessmentAnalytics({ assessmentId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        // Assuming apiService has a generic GET or specific analytics method
        // Using standard fetch here as a fallback blueprint
        const token = localStorage.getItem('evalix_token');
        const res = await fetch(`http://localhost:3001/api/reports/assessment/${assessmentId}/analytics`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error('Failed to fetch analytics data');
        const json = await res.json();
        
        if (json.success) {
          setData(json.data);
        } else {
          throw new Error(json.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (assessmentId) loadAnalytics();
  }, [assessmentId]);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const token = localStorage.getItem('evalix_token');
      const res = await fetch(`http://localhost:3001/api/reports/assessment/${assessmentId}/export`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error('Export failed');
      
      // Convert to blob for native browser download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evalix_assessment_${assessmentId}_export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download CSV: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200">
        <h3 className="font-bold">Analytics Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { overview, itemAnalysis, rawRoster } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* ━━━ HEADER & ACTION ━━━ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assessment Analytics</h2>
          <p className="text-gray-500 text-sm">Real-time performance and anti-cheat metrics</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={exporting || rawRoster.length === 0}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {exporting ? 'Generating...' : '📥 Export Roster to CSV'}
        </button>
      </div>

      {/* ━━━ METRICS GRID ━━━ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Class Average" 
          value={`${overview.average}%`}
          subtitle="Overall accuracy"
          color="blue"
        />
        <MetricCard 
          title="Highest Score" 
          value={`${overview.highest}%`}
          subtitle="Top performer"
          color="green"
        />
        <MetricCard 
          title="Median Time" 
          value={`${overview.medianTimeMinutes} min`}
          subtitle="Completion time"
          color="purple"
        />
        <MetricCard 
          title="Submissions" 
          value={overview.totalSubmissions}
          subtitle="Total completed"
          color="orange"
        />
      </div>

      {/* ━━━ ITEM ANALYSIS HEATMAP (Summary) ━━━ */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Question Item Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {itemAnalysis.map((item, idx) => (
            <div 
              key={item.id} 
              className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${
                item.accuracy < 50 
                  ? 'bg-red-50 border-red-100 text-red-900' 
                  : item.accuracy > 80 
                    ? 'bg-green-50 border-green-100 text-green-900' 
                    : 'bg-yellow-50 border-yellow-100 text-yellow-900'
              }`}
            >
              <span className="text-xs font-semibold opacity-70 mb-1">Q{idx + 1}</span>
              <span className="text-xl font-black">{item.accuracy}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ━━━ THE ROSTER & ANTI-CHEAT GRID ━━━ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Student Roster & Audit Log</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Student ID</th>
                <th className="px-6 py-4 font-semibold">Score</th>
                <th className="px-6 py-4 font-semibold">Time Taken</th>
                <th className="px-6 py-4 font-semibold">Security Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rawRoster.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    No submissions yet.
                  </td>
                </tr>
              ) : (
                rawRoster.map((student, idx) => {
                  const isHighRisk = student.tabSwitches >= 3;
                  const isWarning = student.tabSwitches > 0 && student.tabSwitches < 3;
                  
                  return (
                    <tr key={idx} className={`hover:bg-gray-50 transition-colors ${isHighRisk ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-gray-600">
                          {student.studentId.substring(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">{student.score.toFixed(1)}%</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({student.rawScore}/{student.maxScore})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {student.timeTakenMins.toFixed(1)} mins
                      </td>
                      <td className="px-6 py-4">
                        {isHighRisk ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                            🚨 High Risk / {student.tabSwitches} Switches
                          </span>
                        ) : isWarning ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                            ⚠️ Warning / {student.tabSwitches} Switches
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                            ✓ Clean Record
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// Subcomponent: MetricCard
function MetricCard({ title, value, subtitle, color }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
  };

  return (
    <div className={`p-6 rounded-2xl border ${colorMap[color]}`}>
      <h4 className="text-sm font-semibold opacity-80 mb-2">{title}</h4>
      <div className="text-3xl font-black mb-1">{value}</div>
      <p className="text-xs font-medium opacity-70">{subtitle}</p>
    </div>
  );
}
