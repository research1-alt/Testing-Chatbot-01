
import React, { useState, useEffect } from 'react';
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
  const [sessionLogs, setSessionLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Spreadsheet configuration
  const SPREADSHEET_ID = "1VAxeaMJz_epaw1o0Q-WCnB9-on3-i5ySbmALevZigW8";
  const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
  
  // Note: gid=0 usually refers to the first sheet. 
  // If "Active Session Infromation" is not the first sheet, this needs to change.
  const CSV_SESSION_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`;

  const fetchLiveLogs = async () => {
    setIsLoadingLogs(true);
    try {
        const response = await fetch(CSV_SESSION_URL);
        if (!response.ok) throw new Error("Could not reach spreadsheet");
        const csvText = await response.text();
        
        // Simple CSV parser
        const rows = csvText.split('\n').map(row => {
            // Handle basic quoted commas
            return row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        });
        
        // Filter out empty rows and header
        const data = rows.slice(1).reverse().filter(r => r.length > 1);
        setSessionLogs(data.slice(0, 20)); 
    } catch (e) {
        console.error("Failed to fetch logs", e);
    } finally {
        setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLiveLogs();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-10 pb-48">
      <div className="max-w-5xl mx-auto">
        
        {/* Admin Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mb-10">
            <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Active Session Infromation</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Cloud Database Monitor</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <button 
                    onClick={() => setPreviewFile({ name: 'Knowledge Cache', content: cloudData || 'Offline' })}
                    className="px-5 py-2.5 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-700 transition-all shadow-md"
                >
                    View KB Cache
                </button>
                <a 
                    href={SPREADSHEET_URL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-md"
                >
                    Open Google Sheet
                </a>
            </div>
        </div>

        {/* Live Cloud Log */}
        <section className="mb-12">
            <div className="flex justify-between items-end mb-6 px-1">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Live Traffic Monitor</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Real-time logs from spreadsheet</p>
                </div>
                <button 
                  onClick={fetchLiveLogs}
                  disabled={isLoadingLogs}
                  className="text-[10px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-2 hover:bg-sky-50 px-3 py-1.5 rounded-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${isLoadingLogs ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Refresh Logs
                </button>
            </div>

            <div className="bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">User Email</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Query / Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {sessionLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        No logs found in "Active Session Infromation".
                                    </td>
                                </tr>
                            ) : (
                                sessionLogs.map((log, idx) => (
                                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-[10px] font-mono text-slate-500 whitespace-nowrap">{log[0]?.replace(/"/g, '')}</td>
                                        <td className="px-6 py-4 text-[11px] font-black text-sky-400">{log[1]?.replace(/"/g, '')}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${log[5]?.includes('QUERY') ? 'bg-amber-500/20 text-amber-400' : log[5]?.includes('VERIFIED') ? 'bg-green-500/20 text-green-400' : 'bg-sky-500/20 text-sky-400'}`}>
                                                {log[5]?.replace(/"/g, '') || 'LOG'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[9px] font-mono text-slate-400 max-w-[200px] truncate">
                                            {log[6]?.replace(/"/g, '') || log[4]?.replace(/"/g, '') || '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        {/* Knowledge Base Section */}
        <section className="mb-12">
            <div className="flex justify-between items-end mb-6 px-1">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Technical Knowledge Base</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Manuals stored in local browser</p>
                </div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                    {kbFiles.length} Manuals
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {kbFiles.map(file => (
                    <div key={file.name} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div className="overflow-hidden">
                                    <div className="text-[11px] font-black text-slate-900 truncate">{file.name}</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB</div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => setPreviewFile({ name: file.name, content: file.content })} className="p-2 text-slate-300 hover:text-blue-500 rounded-lg transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                <button onClick={() => onDeleteFile(file.name)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>

        {/* Section 2: Intern Directory */}
        <section>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mb-6 px-1">Registered Interns</h2>
            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl">
                {interns.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 font-bold text-xs uppercase tracking-widest leading-loose">
                        No interns registered locally.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name/Mail</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Joined</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {interns.map((intern) => (
                                    <tr key={intern.email} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-sky-100 text-sky-700 rounded-2xl flex items-center justify-center font-black text-sm">
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
                                                {intern.registeredAt ? new Date(intern.registeredAt).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button onClick={() => onDeleteIntern(intern.email)} className="text-[9px] font-black text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-all border border-red-50">Revoke</button>
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
                <div className="relative bg-white w-full max-w-4xl max-h-full rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">{previewFile.name}</h3>
                        <button onClick={() => setPreviewFile(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    <div className="flex-1 overflow-auto p-8 bg-slate-50">
                        <pre className="text-[11px] font-mono text-slate-600 bg-white p-6 rounded-2xl border border-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                            {previewFile.content}
                        </pre>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AdminDashboard;
