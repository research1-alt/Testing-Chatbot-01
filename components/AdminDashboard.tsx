
import React, { useState } from 'react';
import { User } from '../hooks/useAuth';
import { StoredFile } from '../utils/db';

interface AdminDashboardProps {
  interns: User[];
  onDeleteIntern: (email: string) => void;
  kbFiles: StoredFile[];
  onDeleteFile: (name: string) => void;
  cloudData?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    interns, 
    onDeleteIntern, 
    kbFiles, 
    onDeleteFile,
    cloudData
}) => {
  const [previewFile, setPreviewFile] = useState<{name: string, content: string} | null>(null);
  const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1xItnaIxqCiXgP3IOuWxVZlVGRD543WV1IU2r67PEl3w/edit";

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-10 pb-48">
      <div className="max-w-5xl mx-auto">
        
        {/* Admin Utility Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-sm mb-10">
            <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">System Controls</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Admin Management Portal</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <button 
                    onClick={() => setPreviewFile({ name: 'Cloud Master Sheet (Live)', content: cloudData || 'No cloud data synced yet.' })}
                    className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md"
                >
                    Preview Cloud
                </button>
                <a 
                    href={SPREADSHEET_URL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-md"
                >
                    Master Sheet
                </a>
            </div>
        </div>

        {/* Section 1: Technical Library */}
        <section className="mb-12">
            <div className="flex justify-between items-end mb-6 px-1">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Local Repository</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Supplementary Manuals</p>
                </div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                    Files: {kbFiles.length}
                </div>
            </div>

            {kbFiles.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 p-8 rounded-3xl text-center text-slate-400 font-bold text-xs">
                    No supplementary manuals.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {kbFiles.map(file => (
                        <div key={file.name} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 shadow-sm group">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="text-[11px] font-black text-slate-900 truncate pr-2">{file.name}</div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB</div>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => setPreviewFile({ name: file.name, content: file.content })}
                                        className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                        title="Preview Content"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    </button>
                                    <button 
                                        onClick={() => onDeleteFile(file.name)} 
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete File"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>

        {/* Section 2: Intern Directory */}
        <section>
            <div className="flex justify-between items-end mb-6 px-1">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Intern Directory</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Authorized Field Personnel</p>
                </div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                    Verified: {interns.length}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl">
                {interns.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 font-bold text-xs uppercase tracking-widest leading-loose">
                        No verified interns in database.
                    </div>
                ) : (
                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 sm:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Intern Details</th>
                                    <th className="px-6 sm:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                                    <th className="px-6 sm:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered</th>
                                    <th className="px-6 sm:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {interns.map((intern) => (
                                    <tr key={intern.email} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 sm:px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm">
                                                    {intern.name?.[0] || 'U'}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="font-black text-slate-900 text-sm tracking-tight truncate">{intern.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold tracking-tight truncate">{intern.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 sm:px-8 py-6">
                                            <div className="text-xs font-black text-slate-600 tracking-widest">{intern.mobile || '—'}</div>
                                        </td>
                                        <td className="px-6 sm:px-8 py-6">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                {intern.registeredAt ? new Date(intern.registeredAt).toLocaleDateString() : 'Original'}
                                            </div>
                                        </td>
                                        <td className="px-6 sm:px-8 py-6 text-right">
                                            <button 
                                                onClick={() => onDeleteIntern(intern.email)}
                                                className="text-[9px] font-black text-red-500 hover:bg-red-500 hover:text-white uppercase tracking-widest border border-red-100 px-4 py-2 rounded-xl transition-all shadow-sm"
                                            >
                                                Revoke
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
      </div>

      {/* Content Preview Modal */}
      {previewFile && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-10">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPreviewFile(null)}></div>
                <div className="relative bg-white w-full max-w-4xl max-h-full rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-200">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">{previewFile.name}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Verification Mode</p>
                        </div>
                        <button onClick={() => setPreviewFile(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-50">
                        <pre className="text-[11px] font-mono text-slate-600 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                            {previewFile.content}
                        </pre>
                    </div>
                    <div className="p-6 bg-white border-t border-slate-100 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Technical reference used by AI engine.</p>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AdminDashboard;