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
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const utterance = new SpeechSynthesisUtterance(message.text);
    utterance.lang = language;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utteranceRef.current = utterance;
    return () => speechSynthesis.cancel();
  }, [message.text, language]);

  return (
    <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && <BotIcon />}
            <div className={`rounded-lg p-3 max-w-lg break-words group relative font-mono ${isUser ? 'bg-green-600 rounded-br-none text-white' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                {message.imageUrl && <img src={message.imageUrl} alt="Generated Content" className="mb-2 rounded max-w-full h-auto bg-white border" />}
                {message.videoUrl && <video src={message.videoUrl} controls className="mb-2 rounded max-w-full h-auto bg-black" />}
                <p className="whitespace-pre-wrap">{message.text}</p>
                {!isUser && message.id !== 'initial-bot-message' && !message.id.startsWith('system-') && (
                    <button onClick={() => isSpeaking ? (speechSynthesis.cancel(), setIsSpeaking(false)) : speechSynthesis.speak(utteranceRef.current!)} className="absolute -bottom-3 -right-3 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isSpeaking ? 'text-blue-500 animate-pulse' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9 9 0 0119 10a9 9 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7 7 0 0017 10a7 7 0 00-2.343-5.657 1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5 5 0 0115 10a5 5 0 01-1.757 3.536 1 1 0 01-1.415-1.415A3 3 0 0013 10a3 3 0 00-1.172-2.424 1 1 0 010-1.415z" clipRule="evenodd" /></svg>
                    </button>
                )}
            </div>
            {isUser && <UserIcon />}
        </div>
        {!isUser && (message.suggestions || message.unclear) && (
            <div className="flex flex-wrap gap-2 ml-11 max-w-lg">
                {message.unclear && <button onClick={() => onSendMessage("Can you explain that in a simpler way?")} className="text-xs bg-gray-100 border text-gray-700 py-1 px-3 rounded-full hover:bg-gray-200 transition-colors">Unclear? Simplify</button>}
                {message.suggestions?.map((s, i) => <button key={i} onClick={() => onSendMessage(s)} className="text-xs bg-blue-50 border border-blue-200 text-blue-700 py-1 px-3 rounded-full hover:bg-blue-100 transition-colors">{s}</button>)}
            </div>
        )}
    </div>
  );
};

export default ChatMessage;