
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ChatWindow from './components/ChatWindow';
import IntroPage from './components/IntroPage';
import AuthPage from './components/AuthPage';
import FileUpload from './components/FileUpload';
import AdminDashboard from './components/AdminDashboard';
import { ChatMessage } from './types';
import { getChatbotResponse } from './services/geminiService';
import { addFile, getAllFiles, StoredFile, deleteFile } from './utils/db';
import { matelEvKnowledgeBase } from './defaultLibrary';
import useAuth from './hooks/useAuth';

const ADMIN_EMAIL = 'research1@omegaseikimobility.com';
/**
 * MASTER SPREADSHEET CONFIGURATION
 * This is the public 'Publish to Web' CSV link which allows the app to fetch real-time diagram data.
 */
const MASTER_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRbi-3Um2agWeTvsMt2D3F3HOAzNkqqQfjQdk4uqep53qjV6BnHIBXWVuhtfH8kzWsgdPsqaVi0CgtD/pub?output=csv";

const App: React.FC = () => {
  const { 
    user, view, setView, login, finalizeLogin, signup, commitSignup, 
    logout, authError, isAuthLoading, getAllInterns, deleteIntern,
    checkEmailExists, resetPassword
  } = useAuth();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isKbLoading, setIsKbLoading] = useState(false);
  const [kbContent, setKbContent] = useState<string>('');
  const [masterSheetContent, setMasterSheetContent] = useState<string>('');
  const [kbFiles, setKbFiles] = useState<StoredFile[]>([]);
  const [language, setLanguage] = useState('en-US');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const isAdmin = user?.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const getInitialMessage = (): ChatMessage => ({
    id: 'initial-bot-message-' + Date.now(),
    text: `System Ready. I have synchronized with the OSM Cloud Spreadsheet.\n\nYou can ask for diagrams (e.g., "Show relay diagram") or any technical troubleshooting help.`,
    sender: 'bot',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestions: ["Relay Diagram", "Fuse Box Layout", "MCU Power Flow"]
  });

  const fetchMasterSheet = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const response = await fetch(MASTER_SHEET_CSV_URL);
      if (!response.ok) throw new Error("Cloud access denied");
      const csvData = await response.text();
      setMasterSheetContent(csvData);
      setSyncStatus('success');
      console.log("OSM: Cloud Data Sync Successful.");
    } catch (err) {
      console.error("OSM Sync Error:", err);
      setSyncStatus('error');
    }
  }, []);

  const loadKnowledgeBase = useCallback(async () => {
    setIsKbLoading(true);
    try {
      let storedFiles = await getAllFiles();
      if (storedFiles.length === 0) {
        for (const file of matelEvKnowledgeBase) {
          await addFile(file);
        }
        storedFiles = await getAllFiles();
      }
      setKbFiles(storedFiles);
      const combined = storedFiles
        .map(f => `FILE: ${f.name}\n---\n${f.content}\n---`)
        .join('\n\n');
      setKbContent(combined);
    } catch (err) {
      console.error("Local KB Error:", err);
    } finally {
      setIsKbLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'chat') {
      fetchMasterSheet();
      loadKnowledgeBase();
      if (messages.length === 0) {
        setMessages([getInitialMessage()]);
      }
    }
  }, [view, loadKnowledgeBase, fetchMasterSheet, messages.length]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages
        .slice(-6)
        .map(m => `${m.sender === 'bot' ? 'Hub' : 'Intern'}: ${m.text}`)
        .join('\n');

      const fullContext = `[OSM MASTER DATABASE - CSV]\n${masterSheetContent}\n\n[SUPPLEMENTAL MANUALS]\n${kbContent}`;
      
      const response = await getChatbotResponse(text, fullContext, history, language);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response.answer,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: response.suggestions,
        unclear: response.isUnclear
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: 'system-' + Date.now(),
        text: `Analysis Error: ${err.message}`,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilesStored = async (newFiles: StoredFile[]) => {
    for (const f of newFiles) await addFile(f);
    await loadKnowledgeBase();
  };

  const handleDeleteFile = async (name: string) => {
    if (confirm(`Remove manual "${name}"?`)) {
        await deleteFile(name);
        await loadKnowledgeBase();
    }
  };

  if (view === 'intro') return <IntroPage onStart={() => setView('auth')} />;
  if (view === 'auth') return (
    <AuthPage 
      onLogin={login} 
      onFinalizeLogin={finalizeLogin} 
      onSignup={signup} 
      commitSignup={commitSignup}
      checkEmailExists={checkEmailExists}
      resetPassword={resetPassword}
      error={authError} 
      isLoading={isAuthLoading} 
    />
  );

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto border-x bg-gray-50 shadow-2xl overflow-hidden font-sans text-slate-900">
      <header className="bg-slate-900 text-white p-4 flex flex-col gap-3 shadow-lg z-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-black text-2xl uppercase tracking-tighter">OSM</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{user?.name} {isAdmin ? '(ADMIN)' : ''}</p>
            </div>
            <div className="ml-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${syncStatus === 'success' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : syncStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500 animate-ping'}`}></div>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                    {syncStatus === 'success' ? 'Cloud Master Live' : syncStatus === 'syncing' ? 'Syncing...' : 'Sync Failure'}
                </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button 
                onClick={() => setShowAdminPanel(!showAdminPanel)} 
                className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all ${showAdminPanel ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]' : 'bg-slate-800 text-slate-300'}`}
              >
                {showAdminPanel ? 'Exit Admin' : 'Admin Panel'}
              </button>
            )}
            <button onClick={() => logout()} className="p-2 bg-slate-800 rounded-xl hover:bg-red-600 transition-all shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
        
        {isAdmin && !showAdminPanel && (
          <div className="flex justify-between items-center py-2 border-t border-slate-800">
            <FileUpload onFilesStored={handleFilesStored} onError={(msg) => alert(msg)} />
            <button onClick={fetchMasterSheet} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-slate-800 px-3 py-1 rounded-full border border-slate-700">Refresh Master Sheet</button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden relative flex flex-col">
        {showAdminPanel && isAdmin ? (
          <AdminDashboard 
            interns={getAllInterns()} 
            onDeleteIntern={deleteIntern} 
            kbFiles={kbFiles}
            onDeleteFile={handleDeleteFile}
            cloudData={masterSheetContent}
          />
        ) : (
          <ChatWindow 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading} 
            isKbLoading={isKbLoading || syncStatus === 'syncing'}
            selectedLanguage={language}
            onOpenVideo={() => {}} 
            showVideoAction={false}
          />
        )}
      </main>
    </div>
  );
};

export default App;
