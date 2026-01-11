
import React from 'react';
import { User } from '../hooks/useAuth';
import { StoredFile } from '../utils/db';

interface AdminDashboardProps {
  interns: User[];
  onDeleteIntern: (email: string) => void;
  kbFiles: StoredFile[];
  onDeleteFile: (name: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    interns, 
    onDeleteIntern, 
    kbFiles, 
    onDeleteFile 
}) => {
  const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1VAxeaMJz_epaw1o0Q-WCnB9-on3-i5ySbmALevZigW8/edit";

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-10">
      <div className="max-w-5xl mx-auto">
        
        {/* Admin Utility Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mb-10">
            <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">System Controls</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Admin Management Portal</p>
            </div>
            <a 
                href={SPREADSHEET_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-md"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Open Google Spreadsheet
            </a>
        </div>

        {/* Section 1: Technical Library */}
        <section className="mb-12">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Technical Library</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Chatbot Knowledge Base</p>
                </div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                    Files: {kbFiles.length}
                </div>
            </div>

            {kbFiles.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 p-8 rounded-3xl text-center text-slate-400 font-bold text-xs">
                    No manuals uploaded. Use the header to add technical data.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {kbFiles.map(file => (
                        <div key={file.name} className="bg-white border border-slate-200 p-4 rounded-2xl flex justify-between items-center shadow-sm group">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div className="overflow-hidden">
                                    <div className="text-[11px] font-black text-slate-900 truncate pr-2">{file.name}</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB</div>
                                </div>
                            </div>
                            <button 
                                onClick={() => onDeleteFile(file.name)} 
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>

        {/* Section 2: Intern Directory */}
        <section>
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Intern Directory</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Authorized Field Personnel</p>
                </div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                    Verified: {interns.length}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl">
                {interns.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 font-bold text-xs uppercase tracking-widest leading-loose">
                        No verified interns in database.<br/>
                        <span className="text-[10px] text-slate-300">New signups will appear here automatically.</span>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Intern Details</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {interns.map((intern) => (
                                <tr key={intern.email} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm">
                                                {intern.name?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 text-sm tracking-tight">{intern.name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold tracking-tight">{intern.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-xs font-black text-slate-600 tracking-widest">{intern.mobile || '—'}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                            {intern.registeredAt ? new Date(intern.registeredAt).toLocaleDateString() : 'Original'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button 
                                            onClick={() => onDeleteIntern(intern.email)}
                                            className="text-[9px] font-black text-red-500 hover:bg-red-500 hover:text-white uppercase tracking-widest border border-red-100 px-4 py-2 rounded-xl transition-all shadow-sm"
                                        >
                                            Revoke Access
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
