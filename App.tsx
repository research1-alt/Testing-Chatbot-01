
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ChatWindow from './components/ChatWindow';
import IntroPage from './components/IntroPage';
import AuthPage from './components/AuthPage';
import FileUpload from './components/FileUpload';
import AdminDashboard from './components/AdminDashboard';
import VideoGeneratorModal from './components/VideoGeneratorModal';
import { ChatMessage } from './types';
import { getChatbotResponse, generateVideo } from './services/geminiService';
import { addFile, deleteFile, getAllFiles, StoredFile } from './utils/db';
import { fileToBase64 } from './utils/fileParser';
import { matelEvKnowledgeBase } from './defaultLibrary';
import useAuth from './hooks/useAuth';

const ADMIN_EMAIL = 'research1@omegaseikimobility.com';

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
  const [kbFiles, setKbFiles] = useState<StoredFile[]>([]);
  const [language, setLanguage] = useState('en-US');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const isAdmin = user?.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const getInitialMessage = (): ChatMessage => ({
    id: 'initial-bot-message-' + Date.now(),
    text: `Welcome to the OSM Intelligence Hub.\n\nHow can I help you with technical manuals, relay circuits, or vehicle troubleshooting today?`,
    sender: 'bot',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestions: ["Relay Pin Mapping", "Ignition Sequence", "Fuse Box Layout"]
  });

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
      console.error("Knowledge Base Error:", err);
    } finally {
      setIsKbLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'chat') {
      loadKnowledgeBase();
      if (messages.length === 0) {
        setMessages([getInitialMessage()]);
      }
    }
  }, [view, loadKnowledgeBase, messages.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsLangMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

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

      const response = await getChatbotResponse(text, kbContent, history, language);
      
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

  const handleResetChat = () => {
    if (confirm("Clear this conversation and start fresh?")) {
        setMessages([getInitialMessage()]);
        setIsMenuOpen(false);
    }
  };

  const handleFilesStored = async (newFiles: StoredFile[]) => {
    for (const f of newFiles) await addFile(f);
    await loadKnowledgeBase();
  };

  const handleDeleteIntern = (email: string) => {
    if (confirm("Permanently revoke access for this intern?")) {
        deleteIntern(email);
    }
  };

  const handleDeleteFile = async (name: string) => {
    if (confirm(`Remove manual "${name}" from the technical library?`)) {
        await deleteFile(name);
        await loadKnowledgeBase();
    }
  };

  const handleVideoSubmit = async (image: File, prompt: string, ratio: '16:9' | '9:16') => {
    setIsGeneratingVideo(true);
    setVideoError(null);
    try {
      const b64 = await fileToBase64(image);
      const result = await generateVideo(b64, image.type, prompt, ratio);
      
      if (result.error) {
        setVideoError(result.error);
      } else if (result.videoUrl) {
        const videoMsg: ChatMessage = {
          id: 'vid-' + Date.now(),
          text: `Technical visualization generated for: "${prompt}"`,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString(),
          videoUrl: result.videoUrl
        };
        setMessages(prev => [...prev, videoMsg]);
        setIsVideoModalOpen(false);
      }
    } catch (err: any) {
      setVideoError(err.message);
    } finally {
      setIsGeneratingVideo(false);
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

  const languages = [
    { code: 'en-US', name: 'English' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'bn-IN', name: 'Bengali' },
    { code: 'te-IN', name: 'Telugu' },
    { code: 'mr-IN', name: 'Marathi' },
    { code: 'ta-IN', name: 'Tamil' },
    { code: 'ur-IN', name: 'Urdu' },
    { code: 'gu-IN', name: 'Gujarati' },
    { code: 'kn-IN', name: 'Kannada' },
    { code: 'ml-IN', name: 'Malayalam' },
    { code: 'pa-IN', name: 'Punjabi' },
    { code: 'as-IN', name: 'Assamese' },
    { code: 'or-IN', name: 'Odia' },
    { code: 'ks-IN', name: 'Kashmiri' },
    { code: 'sd-IN', name: 'Sindhi' },
    { code: 'sa-IN', name: 'Sanskrit' },
    { code: 'kok-IN', name: 'Konkani' },
    { code: 'mni-IN', name: 'Manipuri' },
    { code: 'ne-IN', name: 'Nepali' },
    { code: 'doi-IN', name: 'Dogri' },
    { code: 'mai-IN', name: 'Maithili' },
    { code: 'sat-IN', name: 'Santali' },
    { code: 'brx-IN', name: 'Bodo' },
  ];

  const currentLanguageName = languages.find(l => l.code === language)?.name || 'English';

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto border-x bg-gray-50 shadow-2xl overflow-hidden font-sans text-slate-900">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg z-20">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-black text-xl sm:text-2xl uppercase tracking-tighter">OSM</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{user?.name} {isAdmin ? '(ADMIN)' : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative" ref={menuRef}>
          {isAdmin && (
            <button 
              onClick={() => setShowAdminPanel(!showAdminPanel)} 
              className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-all uppercase tracking-widest ${showAdminPanel ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              {showAdminPanel ? 'Technical Hub' : 'Admin Panel'}
            </button>
          )}

          {isAdmin && !showAdminPanel && <FileUpload onFilesStored={handleFilesStored} onError={(msg) => alert(msg)} />}
          
          <button 
            onClick={() => { setIsMenuOpen(!isMenuOpen); setIsLangMenuOpen(false); }} 
            className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="absolute top-12 right-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden slide-in z-50">
              <div className="p-3">
                <button 
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className="flex items-center justify-between w-full p-4 bg-slate-900 rounded-2xl text-white transition-all shadow-lg active:scale-95 mb-3"
                >
                  <span className="text-sm font-black uppercase tracking-widest">{currentLanguageName}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-400 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isLangMenuOpen && (
                  <div className="px-1 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-60 overflow-y-auto grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 no-scrollbar">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => { setLanguage(lang.code); setIsMenuOpen(false); setIsLangMenuOpen(false); }}
                          className={`text-[10px] font-bold py-2.5 px-1 rounded-lg border transition-all ${language === lang.code ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-white border-slate-200 text-slate-600 hover:border-green-300'}`}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-100 mt-1 pt-2 space-y-1">
                  <button 
                    onClick={handleResetChat}
                    className="flex items-center gap-3 w-full p-3 hover:bg-blue-50 rounded-xl transition-colors text-slate-700"
                  >
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Reset Chat</span>
                  </button>

                  <a 
                    href="https://forms.gle/YcrerYAazwxi5zXL7" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Feedback</span>
                  </a>

                  <button 
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="flex items-center gap-3 w-full p-3 hover:bg-red-50 rounded-xl transition-colors text-red-600"
                  >
                    <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Logout</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Omega Seiki Mobility Intelligence v1.2</p>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex flex-col">
        {showAdminPanel && isAdmin ? (
          <AdminDashboard 
            interns={getAllInterns()} 
            onDeleteIntern={handleDeleteIntern} 
            kbFiles={kbFiles}
            onDeleteFile={handleDeleteFile}
          />
        ) : (
          <ChatWindow 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading} 
            isKbLoading={isKbLoading}
            selectedLanguage={language}
            onOpenVideo={() => setIsVideoModalOpen(true)}
            showVideoAction={isAdmin}
          />
        )}
      </main>

      {isAdmin && (
        <VideoGeneratorModal 
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          onSubmit={handleVideoSubmit}
          isGenerating={isGeneratingVideo}
          generationError={videoError}
          resetGenerationError={() => setVideoError(null)}
        />
      )}
    </div>
  );
};

export default App;
