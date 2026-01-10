
import React, { useState, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
  language: string;
  onSendMessage: (message: string) => void;
}

const UserIcon: React.FC = () => (
    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center font-bold text-sm text-white flex-shrink-0 shadow-sm">U</div>
);

const BotIcon: React.FC = () => (
    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h1a1 1 0 011 1v3.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1h-1a1 1 0 01-1-1V3.5zM6.5 15.5a1.5 1.5 0 013 0V16a1 1 0 001 1h1a1 1 0 011 1v3.5a1.5 1.5 0 01-3 0V20a1 1 0 00-1-1h-1a1 1 0 01-1-1v-3.5z" /><path d="M4 9.5a1.5 1.5 0 013 0V10a1 1 0 001 1h1a1 1 0 011 1v3.5a1.5 1.5 0 01-3 0V14a1 1 0 00-1-1h-1a1 1 0 01-1-1V9.5z" /><path d="M16.5 3.5a1.5 1.5 0 010 3h-3.5a1.5 1.5 0 010-3h3.5z" /></svg>
    </div>
);

const ChatMessage: React.FC<ChatMessageProps> = ({ message, language, onSendMessage }) => {
  const isUser = message.sender === 'user';
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);

  /**
   * Cleans text for Speech Synthesis.
   * Strips markdown and technical prefixes for a natural "voice manual" feel.
   */
  const cleanTextForSpeech = (text: string) => {
    return text
      .replace(/\*\*/g, '') 
      .replace(/#/g, '')     
      .replace(/Step \d+:/gi, '') 
      .replace(/[-*]\s/g, ' ') 
      .replace(/[\[\]\(\)\/]/g, ' ') 
      .replace(/[`_~>]/g, '') 
      .replace(/\s+/g, ' ') 
      .trim();
  };

  useEffect(() => {
    const cleanedText = cleanTextForSpeech(message.text);
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = language;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utteranceRef.current = utterance;
    return () => speechSynthesis.cancel();
  }, [message.text, language]);

  const handleCopy = () => {
      navigator.clipboard.writeText(message.text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  /**
   * UI Formatter for bolding and structure.
   */
  const formatText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|Step \d+:)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-gray-900 bg-yellow-100/50 px-1 rounded">{part.slice(2, -2)}</strong>;
      }
      if (/Step \d+:/.test(part)) {
        return <span key={index} className="block mt-4 first:mt-0 mb-1 text-blue-700 font-black uppercase text-[12px] tracking-wider">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && <BotIcon />}
            <div className={`rounded-2xl p-4 max-w-[90%] sm:max-w-lg break-words group relative shadow-md transition-all ${isUser ? 'bg-green-600 rounded-br-none text-white' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                {message.videoUrl && <video src={message.videoUrl} controls className="mb-4 rounded-xl max-w-full h-auto bg-black shadow-inner" />}
                <div className="whitespace-pre-wrap text-[15px] leading-[1.6] tracking-tight">
                  {formatText(message.text)}
                </div>
                <div className={`text-[10px] mt-3 font-bold tracking-wider flex justify-between items-center ${isUser ? 'text-green-100' : 'text-gray-400'}`}>
                    <span className="uppercase">{message.timestamp}</span>
                    {!isUser && (
                        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                            <button onClick={handleCopy} className="hover:text-blue-600 transition-colors">
                                {isCopied ? 'COPIED' : 'COPY'}
                            </button>
                        </div>
                    )}
                </div>
                {!isUser && message.id !== 'initial-bot-message' && !message.id.startsWith('system-') && (
                    <button 
                        onClick={() => isSpeaking ? (speechSynthesis.cancel(), setIsSpeaking(false)) : (speechSynthesis.cancel(), speechSynthesis.speak(utteranceRef.current!))} 
                        className="absolute -top-3 -right-3 p-2 rounded-full bg-white hover:bg-gray-50 text-blue-600 opacity-0 group-hover:opacity-100 transition-all shadow-lg border border-gray-100 z-10"
                        title="Listen to Steps"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isSpeaking ? 'animate-pulse' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9 9 0 0119 10a9 9 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7 7 0 0017 10a7 7 0 00-2.343-5.657 1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5 5 0 0115 10a5 5 0 01-1.757 3.536 1 1 0 01-1.415-1.415A3 3 0 0013 10a3 3 0 00-1.172-2.424 1 1 0 010-1.415z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
            </div>
            {isUser && <UserIcon />}
        </div>
        {!isUser && (message.suggestions || message.unclear) && (
            <div className="flex flex-wrap gap-2 ml-11 max-w-lg mt-2">
                {message.unclear && <button onClick={() => onSendMessage("Explain in simpler steps.")} className="text-[11px] font-bold bg-white border text-gray-500 py-1.5 px-4 rounded-full hover:bg-gray-50 transition-colors shadow-sm">SIMPLIFY</button>}
                {message.suggestions?.map((s, i) => <button key={i} onClick={() => onSendMessage(s)} className="text-[11px] font-bold bg-blue-50 border border-blue-100 text-blue-700 py-1.5 px-4 rounded-full hover:bg-blue-100 transition-colors shadow-sm uppercase tracking-wide">{s}</button>)}
            </div>
        )}
    </div>
  );
};

export default ChatMessage;
