
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
    { code: 'mr-IN', name: 'मراठी (Marathi)' },
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
  const [deviceView, setDeviceView] = useState<DeviceView>('desktop');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en-US');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const handleFileError = useCallback((errorMessage: string) => {
    const errorBotMessage: ChatMessage = {
      id: `system-error-${Date.now()}`,
      sender: 'bot',
      text: `An error occurred: ${errorMessage}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
    setMessages(prev => prev.length === 0 ? [{ id: 'initial-bot-message', text: 'Welcome to the OSM Service Intern! I am your assistant, How may I help you?', sender: 'bot', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }] : prev);
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
  }, [knowledgeBase, messages, selectedLanguage]);

  const handleVideoSubmit = async (imageFile: File, prompt: string, aspectRatio: '16:9' | '9:16') => {
    setIsGeneratingVideo(true);
    setVideoError(null);
    try {
        const base64 = await fileToBase64(imageFile);
        const result = await generateVideo(base64, imageFile.type, prompt, aspectRatio);
        if (result.error) throw new Error(result.error);
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, { id: `bot-video-${Date.now()}`, text: "Generated Video:", sender: 'bot', videoUrl: result.videoUrl, timestamp: now }]);
        setIsVideoModalOpen(false);
    } catch (e: any) { setVideoError(e.message); } finally { setIsGeneratingVideo(false); }
  };

  const handleRemoveFile = async (name: string) => {
      if (confirm(`Remove ${name} from Knowledge Base?`)) {
          await deleteFile(name);
          await loadKnowledgeBase();
      }
  };

  const isAdmin = user?.email === 'research1@omegaseikimobility.com';

  if (!user) return view === 'auth' ? <AuthPage onLogin={login} onSignup={signup} error={authError} isLoading={isAuthLoading} /> : <IntroPage onStart={() => setView('auth')} />;
  
  return (
    <div className="h-screen w-screen bg-gray-100 flex items-center justify-center font-sans text-gray-900 p-4">
      <div className={getDeviceFrameClasses()}>
          {getDeviceNotch()}
          <header className="p-4 border-b border-gray-200 bg-white flex justify-between items-center flex-shrink-0 z-20">
            <div className="flex flex-col">
                <h1 className="text-xl font-bold text-gray-800">OSM Service Intern</h1>
                {isAdmin && <span className="text-[10px] font-bold text-green-600 uppercase tracking-tighter">Admin Management Active</span>}
            </div>
            <div className="flex items-center gap-1">
                {isAdmin && (
                    <button onClick={() => setIsAdminPanelOpen(true)} className="p-2 rounded-full hover:bg-green-50 text-green-600 transition-colors relative" title="Manage Files">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        {knowledgeBase && knowledgeBase.files.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                    </button>
                )}
                <button onClick={handleReloadApp} className="p-2 rounded-full hover:bg-gray-100 transition-colors" title="New Chat"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg></button>
                <div className="relative">
                    <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
                    {isMenuOpen && (
                        <div ref={menuRef} className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-30 flex flex-col gap-y-4 text-sm max-h-[80vh] overflow-y-auto">
                            {user && <div className="border-b pb-2"><span className="font-semibold text-gray-800 text-base">Hi, {user.name}</span></div>}
                            <div className="border-b pb-4 flex flex-col gap-3">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Language</h3>
                                <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value as LanguageCode)} className="w-full p-2 border rounded text-sm outline-none bg-white">{supportedLanguages.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}</select>
                            </div>
                            <div className="pt-2"><button onClick={logout} className="w-full text-left text-sm font-medium text-red-600 hover:bg-red-50 p-2 rounded-md flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg><span>Logout</span></button></div>
                        </div>
                    )}
                </div>
            </div>
          </header>
          <div className="flex-1 min-h-0 relative">
              <ChatWindow messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading || isGeneratingVideo} isKbLoading={isKbLoading} selectedLanguage={selectedLanguage} onOpenVideo={() => setIsVideoModalOpen(true)} />
          </div>
      </div>

      {isAdminPanelOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b flex justify-between items-center bg-green-50">
                      <h2 className="text-lg font-bold text-green-800 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
                          Knowledge Management
                      </h2>
                      <button onClick={() => setIsAdminPanelOpen(false)} className="text-gray-500 hover:text-gray-800"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                  <div className="p-6 overflow-y-auto">
                      <div className="mb-6">
                          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Upload New Data</h3>
                          <FileUpload onFilesStored={async (files) => { for(const f of files) await addFile(f); await loadKnowledgeBase(); setMessages(prev => [...prev, { id: `sys-${Date.now()}`, text: `${files.length} files added to Knowledge Base.`, sender: 'bot', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]); }} onError={handleFileError} />
                      </div>
                      <div>
                          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Currently Loaded Files</h3>
                          {knowledgeBase && knowledgeBase.files.length > 0 ? (
                              <div className="space-y-2">
                                  {knowledgeBase.files.map((file) => (
                                      <div key={file.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-green-200 transition-colors">
                                          <div className="flex flex-col">
                                              <span className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{file.name}</span>
                                              <span className="text-[10px] text-gray-500 uppercase">{(file.size / 1024).toFixed(1)} KB • {new Date(file.lastModified).toLocaleDateString()}</span>
                                          </div>
                                          <button onClick={() => handleRemoveFile(file.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-center py-8 text-gray-400 text-sm">No external files uploaded yet. AI is using default library.</div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      <VideoGeneratorModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} onSubmit={handleVideoSubmit} isGenerating={isGeneratingVideo} generationError={videoError} resetGenerationError={() => setVideoError(null)} />
    </div>
  );

  function getDeviceFrameClasses() {
    if (deviceView === 'desktop') return 'w-full h-full flex flex-col bg-white shadow-lg rounded-lg overflow-hidden';
    return `w-[${deviceView === 'mobile' ? '375px' : '768px'}] h-[95%] max-w-full max-h-full flex flex-col bg-white shadow-2xl rounded-3xl border-8 border-gray-800 p-1 relative overflow-hidden transition-all duration-300`;
  }
  function getDeviceNotch() { return deviceView !== 'desktop' ? <div className={`absolute top-0 left-1/2 -translate-x-1/2 bg-gray-800 rounded-b-xl z-10 ${deviceView === 'mobile' ? 'w-28 h-5' : 'w-36 h-6'}`}></div> : null; }
  function handleReloadApp() { if (window.confirm("Start a new chat?")) { localStorage.removeItem('app-messages'); setMessages([{ id: 'initial-bot-message', text: 'How can I assist you today?', sender: 'bot', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]); } }
};

export default App;
