
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ChatWindow from './components/ChatWindow';
import IntroPage from './components/IntroPage';
import AuthPage from './components/AuthPage';
import FileUpload from './components/FileUpload';
import VideoGeneratorModal from './components/VideoGeneratorModal';
import { ChatMessage } from './types';
import { getChatbotResponse, generateVideo } from './services/geminiService';
import { addFile, deleteAllFiles, getAllFiles, deleteFile, StoredFile } from './utils/db';
import { fileToBase64 } from './utils/fileParser';
import { matelEvKnowledgeBase } from './defaultLibrary';
import useAuth from './hooks/useAuth';

type DeviceView = 'desktop' | 'tablet' | 'mobile';

const supportedLanguages = [
    { code: 'en-US', name: 'English' },
    { code: 'hi-IN', name: 'हिन्दी (Hindi)' },
    { code: 'bn-IN', name: 'বাংলা (Bengali)' },
    { code: 'gu-IN', name: 'ગુજરાતી (Gujarati)' },
    { code: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)' },
    { code: 'ml-IN', name: 'മലയാളം (Malayalam)' },
    { code: 'mr-IN', name: 'मराठी (Marathi)' },
    { code: 'ta-IN', name: 'தமிழ் (Tamil)' },
    { code: 'te-IN', name: 'తెలుగు (Telugu)' },
    { code: 'ur-IN', name: 'اردو (Urdu)' },
] as const;

type LanguageCode = typeof supportedLanguages[number]['code'];

const App: React.FC = () => {
  const { user, view, setView, login, signup, logout, authError, isAuthLoading } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
        const savedMessages = localStorage.getItem('app-messages');
        return savedMessages ? JSON.parse(savedMessages) : [];
    } catch {
        return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isKbLoading, setIsKbLoading] = useState(true);
  const [knowledgeBase, setKnowledgeBase] = useState<{ content: string; fileCount: number; files: StoredFile[] } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en-US');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleFileError = useCallback((errorMessage: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const errorBotMessage: ChatMessage = {
      id: `system-error-${Date.now()}`,
      sender: 'bot',
      text: `Alert: ${errorMessage}`,
      timestamp: now,
    };
    setMessages(prev => [...prev, errorBotMessage]);
  }, []);

  const loadKnowledgeBase = useCallback(async () => {
    try {
        const allDbFiles = await getAllFiles();
        const combinedFiles = [...matelEvKnowledgeBase, ...allDbFiles];
        if (combinedFiles.length > 0) {
            const combinedContent = combinedFiles.map(f => `--- Content from ${f.name} ---\n${f.content}`).join('\n\n');
            setKnowledgeBase({ content: combinedContent, fileCount: combinedFiles.length, files: allDbFiles });
        } else {
            setKnowledgeBase(null);
        }
    } catch (error) {
        handleFileError("Failed to load knowledge base.");
    }
  }, [handleFileError]);

  const startChatSession = useCallback(async () => {
    setIsKbLoading(true);
    await loadKnowledgeBase(); 
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => prev.length === 0 ? [{ id: 'initial-bot-message', text: 'Welcome back! How can I help you with OSM troubleshooting today?', sender: 'bot', timestamp: now }] : prev);
    setIsKbLoading(false);
  }, [loadKnowledgeBase]);

  useEffect(() => { localStorage.setItem('app-messages', JSON.stringify(messages)); }, [messages]);
  useEffect(() => { if (view === 'chat' && user) startChatSession(); }, [view, user, startChatSession]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (isLoading) return;
    if (!navigator.onLine) {
        handleFileError("Offline: Connect to internet to use AI.");
        return;
    }
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, text: messageText, sender: 'user', timestamp: now }]);
    setIsLoading(true);
    try {
        const fullHistory = messages.slice(-10).map(m => `${m.sender}: ${m.text}`).join('\n');
        const botResponse = await getChatbotResponse(messageText, knowledgeBase?.content ?? null, fullHistory, selectedLanguage);
        const botNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, { id: `bot-${Date.now()}`, text: botResponse.answer, sender: 'bot', timestamp: botNow, suggestions: botResponse.suggestions, unclear: botResponse.isUnclear, imageUrl: botResponse.imageUrl }]);
    } catch (error: any) {
        const errNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, { id: `bot-error-${Date.now()}`, text: error.message, sender: 'bot', timestamp: errNow }]);
    } finally { setIsLoading(false); }
  }, [knowledgeBase, messages, selectedLanguage, handleFileError, isLoading]);

  const handleVideoSubmit = async (imageFile: File, prompt: string, aspectRatio: '16:9' | '9:16') => {
    setIsGeneratingVideo(true);
    setVideoError(null);
    try {
        const base64 = await fileToBase64(imageFile);
        const result = await generateVideo(base64, imageFile.type, prompt, aspectRatio);
        if (result.error) throw new Error(result.error);
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, { id: `bot-video-${Date.now()}`, text: "Technical Visualizer Output:", sender: 'bot', videoUrl: result.videoUrl, timestamp: now }]);
        setIsVideoModalOpen(false);
    } catch (e: any) { setVideoError(e.message); } finally { setIsGeneratingVideo(false); }
  };

  const handleRemoveFile = async (name: string) => {
      if (confirm(`Remove "${name}"?`)) {
          await deleteFile(name);
          await loadKnowledgeBase();
      }
  };

  const isAdmin = user?.email === 'research1@omegaseikimobility.com';

  if (!user) return view === 'auth' ? <AuthPage onLogin={login} onSignup={signup} error={authError} isLoading={isAuthLoading} /> : <IntroPage onStart={() => setView('auth')} />;
  
  return (
    <div className="h-full w-full bg-white flex flex-col font-sans text-gray-900 overflow-hidden items-center">
        {/* Connection Status Bar */}
        {!isOnline && (
            <div className="w-full bg-red-600 text-white text-[10px] py-0.5 text-center font-bold uppercase tracking-widest animate-pulse z-50">
                Offline Mode - AI Assistant is Paused
            </div>
        )}

        <div className="w-full max-w-5xl h-full flex flex-col bg-white shadow-xl relative">
            <header className="p-4 border-b border-gray-100 bg-white flex justify-between items-center flex-shrink-0 z-20 shadow-sm">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">OSM Intern</h1>
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`}></div>
                    </div>
                    {isAdmin && <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest mt-0.5">Admin Management Active</span>}
                </div>
                
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <button onClick={() => setIsAdminPanelOpen(true)} className="p-2.5 rounded-xl bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-600 transition-all border border-gray-100" title="Knowledge Base">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </button>
                    )}
                    
                    <div className="relative">
                        <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all border border-gray-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
                        {isMenuOpen && (
                            <div ref={menuRef} className="absolute top-full right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-30 flex flex-col gap-y-4 text-sm slide-in">
                                <div className="border-b pb-3">
                                    <span className="text-xs text-gray-400 uppercase font-bold tracking-widest">Logged in</span>
                                    <div className="font-bold text-gray-800 text-lg truncate">{user.name}</div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Language</h3>
                                    <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value as LanguageCode)} className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none bg-gray-50 font-medium">{supportedLanguages.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}</select>
                                </div>
                                <button onClick={handleReloadApp} className="w-full text-left p-3 rounded-xl hover:bg-gray-50 text-gray-700 font-bold flex items-center gap-3 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    <span>Reset Chat</span>
                                </button>
                                <button onClick={logout} className="w-full text-left p-3 rounded-xl hover:bg-red-50 text-red-600 font-bold flex items-center gap-3 transition-colors mt-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 min-h-0 relative bg-gray-50">
                <ChatWindow messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading || isGeneratingVideo} isKbLoading={isKbLoading} selectedLanguage={selectedLanguage} onOpenVideo={() => setIsVideoModalOpen(true)} />
            </main>
        </div>

        {isAdminPanelOpen && (
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 transition-all">
                <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col h-[85vh] sm:h-auto sm:max-h-[80vh] slide-in">
                    <div className="p-5 border-b flex justify-between items-center bg-white sticky top-0">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-black text-gray-900">Knowledge Base</h2>
                            <p className="text-xs text-gray-400 font-medium">Manage AI-accessible documents</p>
                        </div>
                        <button onClick={() => setIsAdminPanelOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-gray-800 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    <div className="p-6 overflow-y-auto no-scrollbar">
                        <div className="mb-8">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Ingest New Documentation</h3>
                            <FileUpload onFilesStored={async (files) => { for(const f of files) await addFile(f); await loadKnowledgeBase(); setMessages(prev => [...prev, { id: `sys-${Date.now()}`, text: `SUCCESS: ${files.length} documents indexed for retrieval.`, sender: 'bot', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]); }} onError={handleFileError} />
                        </div>
                        <div>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Active Knowledge Pool</h3>
                            {knowledgeBase && knowledgeBase.files.length > 0 ? (
                                <div className="grid gap-3">
                                    {knowledgeBase.files.map((file) => (
                                        <div key={file.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-green-200 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-green-100 rounded-lg text-green-700">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-800 truncate max-w-[180px]">{file.name}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">{(file.size / 1024).toFixed(0)} KB • {new Date(file.lastModified).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => handleRemoveFile(file.name)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-100 sm:opacity-0 group-hover:opacity-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 px-6 rounded-3xl border-2 border-dashed border-gray-100">
                                    <div className="text-gray-300 mb-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                                    <p className="text-sm text-gray-400 font-bold">No custom documentation uploaded.</p>
                                    <p className="text-[10px] text-gray-300 uppercase mt-1 tracking-widest">Default MATEL library active</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        <VideoGeneratorModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} onSubmit={handleVideoSubmit} isGenerating={isGeneratingVideo} generationError={videoError} resetGenerationError={() => setVideoError(null)} />
    </div>
  );

  function handleReloadApp() { if (window.confirm("Clear chat history and restart?")) { localStorage.removeItem('app-messages'); window.location.reload(); } }
};

export default App;
