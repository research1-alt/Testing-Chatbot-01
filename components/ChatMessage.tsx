
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { generateSpeech } from '../services/geminiService';

interface ChatMessageProps {
  message: ChatMessageType;
  language: string;
  onSendMessage: (message: string) => void;
}

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

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
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
    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center font-bold text-sm text-white flex-shrink-0 shadow-sm border-2 border-white">U</div>
);

const ChatMessage: React.FC<ChatMessageProps> = ({ message, language, onSendMessage }) => {
  const isUser = message.sender === 'user';
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{url: string, alt: string} | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const formatText = (text: string) => {
    // Detect very short spec answers (e.g., "12V", "Pin 30", "0.8V to 4V")
    const isShortSpec = text.length < 15 && /\d+/.test(text);
    if (isShortSpec && !isUser) {
        return (
            <div className="flex flex-col items-center justify-center p-4 bg-sky-900 rounded-2xl border-4 border-sky-100 shadow-xl">
                <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em] mb-1">Specification</span>
                <span className="text-3xl font-black text-white tracking-tighter">{text}</span>
            </div>
        );
    }

    // Detect hardware identification requests (Asking for Matel/Virya)
    const isHardwareCheck = text.toLowerCase().includes('please specify') && text.toLowerCase().includes('powertrain');
    if (isHardwareCheck && !isUser) {
        return (
            <div className="flex flex-col p-4 bg-amber-50 rounded-2xl border border-amber-200 shadow-md">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🛠️</span>
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">System Selection Required</span>
                </div>
                <p className="text-slate-800 font-bold mb-2 leading-tight">{text}</p>
                <p className="text-[9px] text-amber-600 font-black uppercase tracking-widest">SELECT AN OPTION BELOW TO CONTINUE</p>
            </div>
        );
    }

    const mdRegex = /(!\[.*?\]\(.*?\))/g;
    const driveRegex = /(https?:\/\/drive\.google\.com\/[^\s\n)]+)/g;
    const imageParts: React.ReactNode[] = [];
    let processedText = text;
    
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

    const driveMatches = processedText.match(driveRegex);
    if (driveMatches) {
        driveMatches.forEach((match, idx) => {
            imageParts.push(renderImage("OSM Technical Schematic", match, `raw-${idx}`));
            processedText = processedText.replace(match, '');
        });
    }

    const parts = processedText.split(/(\[STEP \d+\]|Pro-Tip:|^\s*[•\-*]|\*\*.*?\*\*|\b\d+(?:\.\d+)?[V|v|A|a]\b|\bPin \d+[a-z]?\b|\b\d+ Ohm\b|\bErr-\d+\b)/gm);
    
    const contentNodes: React.ReactNode[] = parts.map((part, index) => {
        if (!part) return null;

        if (/^\[STEP \d+\]$/.test(part)) {
            const stepNumMatch = part.match(/\d+/);
            const stepNum = stepNumMatch ? stepNumMatch[0] : '?';
            return (
                <div key={index} className="flex items-center gap-3 mt-8 mb-4 first:mt-2">
                    <span className="flex items-center justify-center bg-sky-900 text-white min-w-[32px] h-8 rounded-full text-[13px] font-black shadow-xl ring-2 ring-sky-100">
                        {stepNum}
                    </span>
                    <span className="h-[1px] flex-1 bg-sky-100"></span>
                </div>
            );
        }

        if (/^\s*[•\-*]/.test(part) && part.length < 5) {
            return (
                <span key={index} className="inline-flex items-center justify-center w-4 h-4 mr-2 text-sky-400 font-bold">•</span>
            );
        }

        if (part === "Pro-Tip:") {
            return (
                <div key={index} className="flex items-center gap-2 mt-8 mb-3 bg-amber-50 border border-amber-200 p-3 rounded-2xl shadow-sm">
                    <span className="text-xl">💡</span>
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Field Pro-Tip</span>
                </div>
            );
        }

        if (part.startsWith('**') && part.endsWith('**')) {
            const inner = part.slice(2, -2);
            return <strong key={index} className="font-black text-slate-900 bg-yellow-50 px-1 rounded-md border border-yellow-100">{inner}</strong>;
        }

        if (/\b\d+(?:\.\d+)?[V|v|A|a]\b|\bPin \d+[a-z]?\b|\b\d+ Ohm\b|\bErr-\d+\b/.test(part)) {
            return (
                <span key={index} className="inline-block px-2 py-0.5 bg-sky-100 text-sky-900 font-black rounded-lg border border-sky-200 mx-0.5 text-[11px] shadow-sm">
                    {part}
                </span>
            );
        }

        return <span key={index} className="text-slate-700 leading-relaxed">{part}</span>;
    });

    return (
      <div className="technical-container">
        {imageParts}
        <div className="message-content-text">
          {contentNodes}
        </div>
      </div>
    );
  };

  const renderImage = (alt: string, url: string, key: string) => {
    const directUrl = getDirectImageUrl(url);
    return (
        <div key={key} className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="px-5 py-3 bg-slate-950 text-[10px] font-black text-white uppercase tracking-widest flex justify-between items-center">
                <span className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                   {alt}
                </span>
                <span className="text-slate-500 text-[9px]">TAP TO EXPAND</span>
            </div>
            <div className="bg-slate-50 p-4 text-center overflow-hidden">
                <img 
                    src={directUrl} 
                    alt={alt} 
                    className="w-full h-auto max-h-[350px] object-contain block mx-auto rounded-xl cursor-zoom-in hover:scale-[1.01] transition-all duration-500 shadow-sm" 
                    onClick={() => setZoomedImage({ url: directUrl, alt })}
                />
            </div>
        </div>
    );
  };

  const handlePlayAudio = async () => {
    if (isSpeaking) {
      if (sourceRef.current) { try { sourceRef.current.stop(); } catch(e) {} }
      setIsSpeaking(false);
      return;
    }
    setIsAudioLoading(true);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const base64Audio = await generateSpeech(message.text, language);
      if (!base64Audio) { setIsAudioLoading(false); return; }
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
      setIsSpeaking(false);
    } finally {
      setIsAudioLoading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-1 w-full ${isUser ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
        <div className={`flex items-start gap-3 w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && <div className="w-8 h-8 rounded-full bg-sky-900 flex items-center justify-center font-black text-[10px] text-white flex-shrink-0 shadow-lg border-2 border-white uppercase tracking-tighter">OSM</div>}
            
            <div className={`rounded-[1.5rem] p-5 max-w-[85%] sm:max-w-xl group relative shadow-xl transition-all border w-fit ${isUser ? 'bg-green-600 text-white border-green-500 rounded-br-none' : 'bg-white text-slate-800 border-slate-100 rounded-bl-none'}`}>
                <div className="whitespace-pre-wrap text-[14px] leading-[1.6]">
                  {formatText(message.text)}
                </div>
                <div className={`text-[9px] mt-4 font-black flex justify-between items-center opacity-60 ${isUser ? 'text-green-50' : 'text-slate-400'}`}>
                    <span className="uppercase tracking-widest">{message.timestamp}</span>
                    {!isUser && (
                        <div className="flex gap-4">
                            <button onClick={handlePlayAudio} className={`transition-all p-2 rounded-xl ${isSpeaking ? 'text-green-600 bg-green-50 shadow-inner' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-50'}`}>
                                {isAudioLoading ? (
                                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : isSpeaking ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 9v6m4-6v6" /></svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
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
                {message.suggestions.map((s, i) => <button key={i} onClick={() => onSendMessage(s)} className="text-[9px] font-black bg-white border border-slate-200 text-slate-500 py-1.5 px-4 rounded-full hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all uppercase tracking-[0.1em] shadow-sm">{s}</button>)}
            </div>
        )}

        {zoomedImage && (
            <div className="fixed inset-0 z-[100] bg-slate-950/98 flex flex-col items-center justify-center backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setZoomedImage(null)}>
                <div className="absolute top-10 right-10">
                    <button className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-black shadow-xl"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <img src={zoomedImage.url} alt={zoomedImage.alt} className="max-w-[90%] max-h-[80%] shadow-2xl rounded-3xl object-contain" />
                <h4 className="text-white font-black text-xl mt-8 uppercase tracking-widest">{zoomedImage.alt}</h4>
            </div>
        )}
    </div>
  );
};

export default ChatMessage;
