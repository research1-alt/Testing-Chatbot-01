
import React, { useState, useCallback, useEffect } from 'react';
import ChatWindow from './components/ChatWindow';
import IntroPage from './components/IntroPage';
import AuthPage from './components/AuthPage';
import FileUpload from './components/FileUpload';
import VideoGeneratorModal from './components/VideoGeneratorModal';
import { ChatMessage } from './types';
import { getChatbotResponse, generateVideo } from './services/geminiService';
import { addFile, getAllFiles, StoredFile } from './utils/db';
import { fileToBase64 } from './utils/fileParser';
import { matelEvKnowledgeBase } from './defaultLibrary';
import useAuth from './hooks/useAuth';

const ADMIN_EMAIL = 'research1@omegaseikimobility.com';

const App: React.FC = () => {
  const { user, view, setView, login, finalizeLogin, signup, logout, authError, isAuthLoading } = useAuth();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isKbLoading, setIsKbLoading] = useState(false);
  const [kbContent, setKbContent] = useState<string>('');
  const [language, setLanguage] = useState('en-US');
  
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const isAdmin = user?.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

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
        setMessages([{
          id: 'initial-bot-message',
          text: `Identification Verified: ${user?.name}. OSM Service Intelligence is online.\n\nI have indexed the **MATEL Technical Manuals**. Please specify the vehicle fault or relay pinout you are investigating.`,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: ["Relay Pin Mapping", "Ignition Logic Flow", "Fuse Box Layout"]
        }]);
      }
    }
  }, [view, user?.name, loadKnowledgeBase, messages.length]);

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
        .map(m => `${m.sender === 'bot' ? 'Assistant' : 'Intern'}: ${m.text}`)
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

  const handleFilesStored = async (newFiles: StoredFile[]) => {
    for (const f of newFiles) await addFile(f);
    await loadKnowledgeBase();
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
          text: `Visualization successfully generated for: "${prompt}"`,
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
      error={authError} 
      isLoading={isAuthLoading} 
    />
  );

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto border-x bg-gray-50 shadow-2xl overflow-hidden font-sans">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg z-20">
        <div className="flex items-center gap-3">
          <div className="bg-green-600 p-2 rounded-xl">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div className="hidden sm:block">
            <h1 className="font-black text-sm uppercase tracking-tighter">OSM Hub</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{user?.name} {isAdmin ? '(ADMIN)' : '(USER)'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-800 border-none text-slate-300 rounded-lg text-[10px] font-black py-1.5 px-3 focus:ring-0 outline-none uppercase tracking-widest cursor-pointer"
          >
            <option value="en-US">English</option>
            <option value="hi-IN">Hindi</option>
            <option value="mr-IN">Marathi</option>
            <option value="ta-IN">Tamil</option>
          </select>
          
          {/* Only Admin can see the File Upload button */}
          {isAdmin && <FileUpload onFilesStored={handleFilesStored} onError={(msg) => alert(msg)} />}
          
          <button onClick={logout} className="text-[10px] font-black bg-red-950/20 text-red-400 border border-red-900/40 px-3 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest">Logout</button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex flex-col">
        <ChatWindow 
          messages={messages} 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
          isKbLoading={isKbLoading}
          selectedLanguage={language}
          onOpenVideo={() => setIsVideoModalOpen(true)}
          showVideoAction={isAdmin} // Only show video action to admin
        />
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
