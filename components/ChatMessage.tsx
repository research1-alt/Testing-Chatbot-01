
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { generateSpeech } from '../services/geminiService';

interface ChatMessageProps {
  message: ChatMessageType;
  language: string;
  onSendMessage: (message: string) => void;
}

/**
 * Robustly converts various Google Drive link formats to a direct, renderable image source.
 */
const getDirectImageUrl = (url: string) => {
  if (!url) return '';
  const trimmed = url.trim();
  
  if (trimmed.includes('drive.google.com')) {
    let id = '';
    const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (dMatch) id = dMatch[1];
    if (!id) {
        const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idMatch) id = idMatch[1];
    }
    if (id) return `https://lh3.googleusercontent.com/d/${id}`;
  }
  return trimmed;
};

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const UserIcon: React.FC = () => (
    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center font-bold text-sm text-white flex-shrink-0 shadow-sm">U</div>
);

const ChatMessage: React.FC<ChatMessageProps> = ({ message, language, onSendMessage }) => {
  const isUser = message.sender === 'user';
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  
  // Lightbox & Zoom State
  const [zoomedImage, setZoomedImage] = useState<{url: string, alt: string} | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const formatText = (text: string) => {
    const mdRegex = /(!\[.*?\]\(.*?\))/g;
    const driveRegex = /(https?:\/\/drive\.google\.com\/[^\s\n)]+)/g;

    const imageParts: React.ReactNode[] = [];
    let processedText = text;
    
    // Extract markdown images
    const mdMatches = text.match(mdRegex);
    if (mdMatches) {
        mdMatches.forEach((match, idx) => {
            const inner = match.match(/!\[(.*?)\]\((.*?)\)/);
            if (inner) {
                imageParts.push(renderImage(inner[1] || "Technical Diagram", inner[2], `md-${idx}`));
                processedText = processedText.replace(match, ''); 
            }
        });
    }

    // Sniff for raw drive links not in markdown
    const driveMatches = processedText.match(driveRegex);
    if (driveMatches) {
        driveMatches.forEach((match, idx) => {
            imageParts.push(renderImage("OSM Technical Schematic", match, `raw-${idx}`));
            processedText = processedText.replace(match, '');
        });
    }

    const parts = processedText.split(/(Step \d+:|\*\*.*?\*\*)/g);
    const contentNodes: React.ReactNode[] = parts.map((part, index) => {
        if (!part || !part.trim()) return null;
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-bold text-gray-900 bg-yellow-100 px-1 rounded">{part.slice(2, -2)}</strong>;
        } else if (/Step \d+:/.test(part)) {
            return <span key={index} className="block mt-4 mb-2 text-blue-700 font-black uppercase text-[12px] tracking-wider border-b border-blue-50 pb-1">{part}</span>;
        }
        return <span key={index}>{part}</span>;
    });

    return (
      <>
        {imageParts}
        <div className="message-content-text leading-relaxed">
          {contentNodes}
        </div>
      </>
    );
  };

  const renderImage = (alt: string, url: string, key: string) => {
    const directUrl = getDirectImageUrl(url);
    return (
        <div key={key} className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-2 bg-slate-900 text-[10px] font-black text-white uppercase tracking-widest flex justify-between items-center">
                <span>{alt}</span>
                <span className="text-green-400">TOUCH TO ZOOM</span>
            </div>
            <div className="bg-slate-50 p-2 text-center overflow-hidden">
                <img 
                    src={directUrl} 
                    alt={alt} 
                    className="w-full h-auto max-h-[400px] object-contain block mx-auto rounded-lg cursor-zoom-in hover:scale-[1.02] transition-transform duration-300 active:scale-95" 
                    onClick={() => {
                        setZoomedImage({ url: directUrl, alt });
                        setZoomScale(1);
                    }}
                    onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="p-6 text-center">
                              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Diagram failed to render</p>
                              <a href="${url}" target="_blank" class="text-[10px] font-black text-blue-600 underline uppercase tracking-widest">Open in Google Drive</a>
                            </div>
                          `;
                        }
                    }}
                />
            </div>
        </div>
    );
  };

  const handlePlayAudio = async () => {
    if (isSpeaking) {
      if (sourceRef.current) {
          try { sourceRef.current.stop(); } catch(e) {}
      }
      setIsSpeaking(false);
      return;
    }
    
    setIsAudioLoading(true);
    try {
      // Resume audio context if suspended (common browser restriction)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      } else if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const base64Audio = await generateSpeech(message.text, language);
      if (!base64Audio) {
          setIsAudioLoading(false);
          return;
      }

      const audioBytes = decodeBase64(base64Audio);
      const buffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsSpeaking(false);
      source.start();
      sourceRef.current = source;
      setIsSpeaking(true);
    } catch (err) {
      console.error("Audio playback error:", err);
      setIsSpeaking(false);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const closeZoom = () => {
    setZoomedImage(null);
    setZoomScale(1);
  };

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
            {!isUser && <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white flex-shrink-0 shadow-md">OSM</div>}
            <div className={`rounded-3xl p-5 max-w-[90%] sm:max-w-xl group relative shadow-lg transition-all ${isUser ? 'bg-green-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-slate-100 rounded-bl-none'}`}>
                <div className="whitespace-pre-wrap text-[14px] leading-[1.6]">
                  {formatText(message.text)}
                </div>
                <div className={`text-[9px] mt-4 font-bold flex justify-between items-center ${isUser ? 'text-green-100' : 'text-slate-400'}`}>
                    <span className="uppercase">{message.timestamp}</span>
                    {!isUser && (
                        <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={handlePlayAudio} 
                              className={`transition-all p-1 rounded-full ${isSpeaking ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'} ${isAudioLoading ? 'animate-pulse' : ''}`}
                              title={isSpeaking ? "Stop Voice" : "Listen to instructions"}
                            >
                                {isAudioLoading ? (
                                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : isSpeaking ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                  </svg>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {isUser && <UserIcon />}
        </div>
        {!isUser && message.suggestions && (
            <div className="flex flex-wrap gap-2 ml-11 mt-2">
                {message.suggestions.map((s, i) => <button key={i} onClick={() => onSendMessage(s)} className="text-[10px] font-black bg-slate-100 text-slate-600 py-1.5 px-4 rounded-full hover:bg-slate-200 transition-all uppercase tracking-widest">{s}</button>)}
            </div>
        )}

        {/* Zoom Lightbox Modal */}
        {zoomedImage && (
            <div 
                className="fixed inset-0 z-[100] bg-slate-900/95 flex flex-col items-center justify-center backdrop-blur-md animate-in fade-in duration-200"
                onClick={closeZoom}
            >
                {/* Header with Close Action - High Z-Index to stay on top */}
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-slate-900/80 to-transparent z-[110]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">Diagram Preview</span>
                        <h4 className="text-white font-black text-sm uppercase tracking-tight">{zoomedImage.alt}</h4>
                    </div>
                    <button 
                        onClick={closeZoom} 
                        className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-lg border border-white/20 shadow-2xl active:scale-90"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4 cursor-default no-scrollbar" onClick={(e) => e.stopPropagation()}>
                    <div className="relative transition-transform duration-200 ease-out flex items-center justify-center min-h-full min-w-full" style={{ transform: `scale(${zoomScale})` }}>
                        <img 
                            src={zoomedImage.url} 
                            alt={zoomedImage.alt} 
                            className="max-w-full max-h-[80vh] shadow-2xl rounded-lg object-contain"
                            draggable={false}
                        />
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="absolute bottom-10 flex gap-4 bg-slate-800/80 p-3 rounded-3xl backdrop-blur-2xl border border-white/10 shadow-2xl z-[110]" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.25))}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all active:scale-90"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                    </button>
                    <div className="flex items-center justify-center px-4 font-black text-white text-xs min-w-[60px] uppercase tracking-widest">
                        {Math.round(zoomScale * 100)}%
                    </div>
                    <button 
                        onClick={() => setZoomScale(prev => Math.min(4, prev + 0.25))}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-green-600 hover:bg-green-500 text-white transition-all shadow-lg active:scale-90"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    </button>
                    <button 
                        onClick={() => setZoomScale(1)}
                        className="px-6 h-12 flex items-center justify-center rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-90"
                    >
                        Reset
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default ChatMessage;
