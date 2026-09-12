import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../../lib/api';
import Card from '../../../components/ui/Card';
import { User, AlertTriangle } from 'lucide-react';
import { FullPageLoader } from '../../../components/ui/Loader';
import { X, TrendingUp, ShieldAlert, Award, FileText } from 'lucide-react';

export default function BatchStudentsTab({ batchId }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const { data: students, isLoading } = useQuery({
    queryKey: ['batch-students', batchId],
    queryFn: () => apiService.getBatchStudents(batchId),
    enabled: !!batchId,
  });

  if (isLoading) return <FullPageLoader title="Loading Roster" subtitle="Fetching student data" />;

  if (!students || students.length === 0) {
    return (
      <Card p="xl" className="text-center border-dashed">
        <User size={48} className="mx-auto text-text-muted mb-4" />
        <p className="text-text-muted font-semibold uppercase tracking-wider text-sm">No students enrolled yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card p="0" className="overflow-hidden bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Student</th>
                <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Joined</th>
                <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">Assessments</th>
                <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">Avg Score</th>
                <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">Violations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((student) => (
                <tr 
                  key={student.id} 
                  className="hover:bg-background transition-colors cursor-pointer group"
                  onClick={() => setSelectedStudent(student)}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs uppercase">
                        {student.name ? student.name[0] : student.email[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-text group-hover:text-brand transition-colors">{student.name}</p>
                        <p className="text-xs text-text-muted">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-text-muted">
                    {new Date(student.joined_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 text-xs font-bold rounded-full bg-surface-muted border border-border">
                      {student.assessments_attempted}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`font-display font-bold ${student.average_score >= 80 ? 'text-emerald-500' : student.average_score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                      {student.average_score}%
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {student.violation_count > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-md">
                        <AlertTriangle size={12} /> {student.violation_count}
                      </span>
                    ) : (
                      <span className="text-text-muted text-xs font-semibold">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="absolute inset-0" 
            onClick={() => setSelectedStudent(null)} 
          />
          <Card p="0" className="w-full max-w-2xl relative z-10 bg-surface border-border shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-border bg-background flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center text-brand font-display font-bold text-2xl uppercase border border-brand/20">
                  {selectedStudent.name ? selectedStudent.name[0] : selectedStudent.email[0]}
                </div>
                <div>
                  <h3 className="text-2xl font-display font-bold text-text">{selectedStudent.name}</h3>
                  <p className="text-sm text-text-muted">{selectedStudent.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="p-2 text-text-muted hover:text-text hover:bg-surface-muted rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-background border border-border">
                  <FileText size={16} className="text-brand mb-2" />
                  <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-1">Attempted</p>
                  <p className="text-2xl font-bold">{selectedStudent.assessments_attempted}</p>
                </div>
                <div className="p-4 rounded-xl bg-background border border-border">
                  <TrendingUp size={16} className="text-emerald-500 mb-2" />
                  <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-1">Avg Score</p>
                  <p className="text-2xl font-bold text-emerald-500">{selectedStudent.average_score}%</p>
                </div>
                <div className="p-4 rounded-xl bg-background border border-border">
                  <Award size={16} className="text-amber-500 mb-2" />
                  <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-1">Joined</p>
                  <p className="text-sm font-bold mt-2">{new Date(selectedStudent.joined_at).toLocaleDateString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-background border border-border">
                  <ShieldAlert size={16} className="text-red-500 mb-2" />
                  <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-1">Violations</p>
                  <p className="text-2xl font-bold text-red-500">{selectedStudent.violation_count}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

