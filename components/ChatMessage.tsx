
import React, { useState, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
  language: string;
  onSendMessage: (message: string) => void;
}

const UserIcon: React.FC = () => (
    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center font-bold text-sm text-white flex-shrink-0">U</div>
);

const BotIcon: React.FC = () => (
    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h1a1 1 0 011 1v3.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1h-1a1 1 0 01-1-1V3.5zM6.5 15.5a1.5 1.5 0 013 0V16a1 1 0 001 1h1a1 1 0 011 1v3.5a1.5 1.5 0 01-3 0V20a1 1 0 00-1-1h-1a1 1 0 01-1-1v-3.5z" /><path d="M4 9.5a1.5 1.5 0 013 0V10a1 1 0 001 1h1a1 1 0 011 1v3.5a1.5 1.5 0 01-3 0V14a1 1 0 00-1-1h-1a1 1 0 01-1-1V9.5z" /><path d="M16.5 3.5a1.5 1.5 0 010 3h-3.5a1.5 1.5 0 010-3h3.5z" /></svg>
    </div>
);

const ChatMessage: React.FC<ChatMessageProps> = ({ message, language, onSendMessage }) => {
  const isUser = message.sender === 'user';
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const utterance = new SpeechSynthesisUtterance(message.text);
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

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && <BotIcon />}
            <div className={`rounded-lg p-3 max-w-[85%] sm:max-w-lg break-words group relative shadow-sm ${isUser ? 'bg-green-600 rounded-br-none text-white' : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'}`}>
                {message.imageUrl && <img src={message.imageUrl} alt="Generated Content" className="mb-2 rounded max-w-full h-auto bg-white border" />}
                {message.videoUrl && <video src={message.videoUrl} controls className="mb-2 rounded max-w-full h-auto bg-black" />}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
                <div className={`text-[9px] mt-1 opacity-60 flex justify-between items-center ${isUser ? 'text-green-50' : 'text-gray-500'}`}>
                    <span>{message.timestamp}</span>
                    {!isUser && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                            <button onClick={handleCopy} className="hover:text-blue-500 transition-colors">
                                {isCopied ? 'COPIED!' : 'COPY'}
                            </button>
                        </div>
                    )}
                </div>
                {!isUser && message.id !== 'initial-bot-message' && !message.id.startsWith('system-') && (
                    <button onClick={() => isSpeaking ? (speechSynthesis.cancel(), setIsSpeaking(false)) : speechSynthesis.speak(utteranceRef.current!)} className="absolute -top-3 -right-3 p-1.5 rounded-full bg-white hover:bg-gray-100 text-gray-600 opacity-0 group-hover:opacity-100 transition-all shadow-md border border-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isSpeaking ? 'text-blue-500 animate-pulse' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9 9 0 0119 10a9 9 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7 7 0 0017 10a7 7 0 00-2.343-5.657 1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5 5 0 0115 10a5 5 0 01-1.757 3.536 1 1 0 01-1.415-1.415A3 3 0 0013 10a3 3 0 00-1.172-2.424 1 1 0 010-1.415z" clipRule="evenodd" /></svg>
                    </button>
                )}
            </div>
            {isUser && <UserIcon />}
        </div>
        {!isUser && (message.suggestions || message.unclear) && (
            <div className="flex flex-wrap gap-2 ml-11 max-w-lg mt-1">
                {message.unclear && <button onClick={() => onSendMessage("Can you explain that in a simpler way?")} className="text-xs bg-white border text-gray-600 py-1 px-3 rounded-full hover:bg-gray-50 transition-colors shadow-sm">Unclear? Simplify</button>}
                {message.suggestions?.map((s, i) => <button key={i} onClick={() => onSendMessage(s)} className="text-xs bg-blue-50 border border-blue-200 text-blue-700 py-1 px-3 rounded-full hover:bg-blue-100 transition-colors shadow-sm">{s}</button>)}
            </div>
        )}
    </div>
  );
};

export default ChatMessage;
