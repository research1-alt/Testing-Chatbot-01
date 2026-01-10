
import React from 'react';
import { User } from '../hooks/useAuth';

interface AdminDashboardProps {
  interns: User[];
  onDelete: (email: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ interns, onDelete }) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-8">
            <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Intern Directory</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Field Intelligence Access Control</p>
            </div>
            <div className="text-right">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200">
                    Total Interns: {interns.length}
                </span>
            </div>
        </div>

        {interns.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <h3 className="text-slate-900 font-black text-lg">No Active Registrations</h3>
                <p className="text-slate-400 text-sm mt-1">New intern profiles will appear here after verification.</p>
            </div>
        ) : (
            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-xl">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Intern Details</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Mobile</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {interns.map((intern) => (
                            <tr key={intern.email} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-black text-sm">
                                            {intern.name?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-900 text-sm">{intern.name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">{intern.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="text-xs font-black text-slate-600 tracking-wider">
                                        {intern.mobile || 'N/A'}
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <button 
                                        onClick={() => onDelete(intern.email)}
                                        className="text-[9px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-all"
                                    >
                                        Revoke Access
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
