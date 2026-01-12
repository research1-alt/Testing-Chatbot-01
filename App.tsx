
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ChatWindow from './components/ChatWindow';
import IntroPage from './components/IntroPage';
import AuthPage from './components/AuthPage';
import FileUpload from './components/FileUpload';
import AdminDashboard from './components/AdminDashboard';
import InstallPrompt from './components/InstallPrompt';
import { ChatMessage } from './types';
import { getChatbotResponse } from './services/geminiService';
import { addFile, getAllFiles, StoredFile, deleteFile } from './utils/db';
import { matelEvKnowledgeBase } from './defaultLibrary';
import useAuth from './hooks/useAuth';

const ADMIN_EMAIL = 'research1@omegaseikimobility.com';
const FEEDBACK_URL = 'https://forms.gle/YcrerYAazwxi5zXL7';

const INDIAN_LANGUAGES = [
    { code: 'en-US', name: 'English', native: 'English', flag: '🇬🇧' },
    { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
    { code: 'mr-IN', name: 'Marathi', native: 'مراठी', flag: '🇮🇳' },
    { code: 'ta-IN', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te-IN', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
    { code: 'bn-IN', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
    { code: 'gu-IN', name: 'Gujarati', native: 'Gujarati', flag: '🇮🇳' },
    { code: 'kn-IN', name: 'Kannada', native: 'Kannada', flag: '🇮🇳' },
    { code: 'ml-IN', name: 'Malayalam', native: 'Malayalam', flag: '🇮🇳' },
    { code: 'pa-IN', name: 'Punjabi', native: 'Punjabi', flag: '🇮🇳' },
    { code: 'ur-IN', name: 'Urdu', native: 'Urdu', flag: '🇮🇳' },
    { code: 'as-IN', name: 'Assamese', native: 'Assamese', flag: '🇮🇳' },
    { code: 'or-IN', name: 'Odia', native: 'Odia', flag: '🇮🇳' },
];

const App: React.FC = () => {
  const { 
    user, view, setView, login, finalizeLogin, signup, commitSignup, 
    logout, authError, isAuthLoading, getAllInterns, deleteIntern,
    checkEmailExists, resetPassword
  } = useAuth();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSessionKey, setChatSessionKey] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isKbLoading, setIsKbLoading] = useState(false);
  const [kbContent, setKbContent] = useState<string>('');
  const [masterSheetContent, setMasterSheetContent] = useState<string>('');
  const [kbFiles, setKbFiles] = useState<StoredFile[]>([]);
  const [language, setLanguage] = useState('en-US');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLangSelectorOpen, setIsLangSelectorOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const isAdmin = user?.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const getInitialMessage = useCallback((): ChatMessage => ({
    id: `welcome-${chatSessionKey}-${Date.now()}`,
    text: `Welcome to the OSM Service Portal. Ask me anything about vehicle troubleshooting or diagrams.`,
    sender: 'bot',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestions: ["Relay Diagram", "Fuse Box Layout", "MCU Power Flow"]
  }), [chatSessionKey]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show our custom install banner
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the browser's install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, so clear it
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleReloadApp = useCallback(() => {
    setIsRefreshing(true);
    setIsSidebarOpen(false);
    setMessages([]);
    setTimeout(() => {
        setChatSessionKey(prev => prev + 1);
        setIsRefreshing(false);
    }, 500);
  }, []);

  const handleLogoutAction = useCallback(() => {
    setMessages([]);
    setChatSessionKey(prev => prev + 1);
    logout();
  }, [logout]);

  const handleFeedbackClick = () => {
    window.open(FEEDBACK_URL, '_blank');
    setIsSidebarOpen(false);
  };

  const fetchMasterSheet = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const response = await fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vRbi-3Um2agWeTvsMt2D3F3HOAzNkqqQfjQdk4uqep53qjV6BnHIBXWVuhtfH8kzWsgdPsqaVi0CgtD/pub?output=csv");
      if (!response.ok) throw new Error("Cloud access denied");
      const csvData = await response.text();
      setMasterSheetContent(csvData);
      setSyncStatus('success');
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
    }
  }, [view, loadKnowledgeBase, fetchMasterSheet]);

  useEffect(() => {
    if (view === 'chat' && !isRefreshing) {
        setMessages([getInitialMessage()]);
    }
  }, [view, chatSessionKey, getInitialMessage, isRefreshing]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading || isRefreshing) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      text,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages
        .slice(-6)
        .map(m => `${m.sender === 'bot' ? 'Assistant' : 'Technician'}: ${m.text}`)
        .join('\n');

      const fullContext = `[OSM MASTER DATABASE]\n${masterSheetContent}\n\n[SUPPLEMENTAL MANUALS]\n${kbContent}`;
      
      const response = await getChatbotResponse(text, fullContext, history, language);
      
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        text: response.answer,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: response.suggestions,
        unclear: response.isUnclear
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        text: `Error analyzing technical data: ${err.message}`,
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

  const selectedLang = INDIAN_LANGUAGES.find(l => l.code === language) || INDIAN_LANGUAGES[0];

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto border-x bg-gray-50 shadow-2xl overflow-hidden font-sans text-slate-900 relative">
      
      {/* Install Prompt Banner */}
      {showInstallPrompt && (
        <InstallPrompt 
          onInstall={handleInstallClick} 
          onDismiss={() => setShowInstallPrompt(false)} 
        />
      )}

      {/* System Reset Overlay */}
      {isRefreshing && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
           <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-green-500">System Resetting...</p>
        </div>
      )}

      {/* Sidebar Overlay */}
      <div className={`fixed inset-0 z-50 transition-all duration-500 ${isSidebarOpen ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity duration-500 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => { setIsSidebarOpen(false); setIsLangSelectorOpen(false); }}></div>
        <aside className={`absolute top-0 left-0 h-full w-80 bg-slate-950 text-white shadow-2xl transition-transform duration-500 transform ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} overflow-hidden`}>
          <div className={`p-8 h-full flex flex-col transition-transform duration-500 ${isLangSelectorOpen ? '-translate-x-full' : 'translate-x-0'}`}>
            <div className="flex justify-between items-center mb-10">
                <div className="flex flex-col">
                    <h2 className="text-4xl font-black tracking-tighter text-green-500 uppercase">OSM</h2>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Service Portal</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <nav className="flex-1 space-y-3">
                <button onClick={() => { setShowAdminPanel(false); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl font-black text-[11px] uppercase tracking-widest transition-all ${!showAdminPanel ? 'bg-green-600 text-white shadow-lg' : 'hover:bg-slate-900 text-slate-400'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Assistant
                </button>

                {isAdmin && (
                    <button onClick={() => { setShowAdminPanel(true); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl font-black text-[11px] uppercase tracking-widest transition-all ${showAdminPanel ? 'bg-green-600 text-white shadow-lg' : 'hover:bg-slate-900 text-slate-400'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572-1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Admin Control
                    </button>
                )}

                <button type="button" onClick={handleFeedbackClick} className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-900 transition-all border border-white/5 active:bg-slate-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                    Send Feedback
                </button>

                <div className="py-2"></div>

                <button onClick={() => setIsLangSelectorOpen(true)} className="w-full flex items-center justify-between px-6 py-5 rounded-3xl bg-slate-900/50 border border-white/5 hover:bg-slate-900 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="text-xl">{selectedLang.flag}</div>
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Language</span>
                            <span className="text-xs font-black text-white">{selectedLang.name}</span>
                        </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
            </nav>

            <div className="pt-8 border-t border-white/5">
                <button onClick={handleLogoutAction} className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl font-black text-[11px] uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Logout
                </button>
            </div>
          </div>

          <div className={`absolute inset-0 p-8 flex flex-col transition-transform duration-500 bg-slate-950 ${isLangSelectorOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setIsLangSelectorOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-xl font-black uppercase tracking-tighter">Choose Language</h2>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-2 gap-3 pb-8">
                    {INDIAN_LANGUAGES.map((lang) => (
                        <button key={lang.code} onClick={() => { setLanguage(lang.code); setIsLangSelectorOpen(false); }} className={`flex flex-col items-center justify-center p-5 rounded-3xl transition-all border aspect-square ${language === lang.code ? 'bg-green-600 border-green-500 text-white shadow-xl scale-[1.05] z-10' : 'bg-slate-900/40 border-white/5 text-slate-400 hover:bg-slate-900'}`}>
                            <span className="text-3xl mb-3">{lang.flag}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-center">{lang.name}</span>
                        </button>
                    ))}
                </div>
            </div>
          </div>
        </aside>
      </div>

      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-slate-800 rounded-2xl text-slate-300 hover:text-white transition-all shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex flex-col">
              <h1 className="font-black text-2xl uppercase tracking-tighter leading-none">OSM</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'success' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em]">{showAdminPanel ? 'Admin Mode' : 'Technical Support'}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!showAdminPanel && (
              <button 
                onClick={handleReloadApp}
                className="group relative flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-white/10 rounded-2xl transition-all shadow-2xl hover:shadow-green-500/20"
                title="Refresh Application"
              >
                <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 group-hover:rotate-[360deg] transition-transform duration-700 ease-in-out" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <div className="absolute inset-0 bg-green-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <span className="hidden sm:inline text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 group-hover:text-white transition-colors ml-2">Refresh</span>
              </button>
            )}
            
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-xs text-green-500 shadow-inner border border-white/5">
              {user?.name?.[0] || 'U'}
            </div>
          </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        {showAdminPanel && isAdmin ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <AdminDashboard interns={getAllInterns()} onDeleteIntern={deleteIntern} kbFiles={kbFiles} onDeleteFile={handleDeleteFile} cloudData={masterSheetContent} />
            <div className="p-4 bg-white border-t border-slate-200 shadow-2xl z-30 flex items-center justify-between">
                <FileUpload onFilesStored={handleFilesStored} onError={(msg) => alert(msg)} />
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Admin Control Panel</span>
            </div>
          </div>
        ) : (
          <ChatWindow 
            key={`session-v${chatSessionKey}`} 
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
