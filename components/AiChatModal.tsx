
import React, { useState, useRef, useEffect } from 'react';
import type { AiChatMessage } from '../types';
import { getChatResponse } from '../services/geminiService';
import Loader from './Loader';
import { WandIcon, XMarkIcon, SendIcon, MicIcon } from './icons';

interface AiChatModalProps {}

// Cross-browser support for SpeechRecognition
// FIX: Cast window to `any` to access non-standard properties and rename to avoid shadowing the global type.
const SpeechRecognitionImpl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// FIX: Add minimal type definition for SpeechRecognition as it's not available in this environment.
// This resolves the "Cannot find name 'SpeechRecognition'" error.
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onend: () => void;
  onerror: (event: { error: string }) => void;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  abort(): void;
  start(): void;
  stop(): void;
}

const AiChatModal: React.FC<AiChatModalProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useDeepThought, setUseDeepThought] = useState(false);
  const [error, setError] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  // FIX: The type error on this line is resolved by renaming the `SpeechRecognition` constant to `SpeechRecognitionImpl`, thus un-shadowing the global `SpeechRecognition` type.
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    // FIX: Use the renamed constant.
    if (!SpeechRecognitionImpl) {
      console.warn("Speech Recognition not supported in this browser.");
      setIsSpeechSupported(false);
      return;
    }
    setIsSpeechSupported(true);
    
    // FIX: Use the renamed constant to create a new instance.
    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setError("Speech recognition failed. Please check microphone permissions.");
        setIsRecording(false);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      setInput(transcript);
    };

    recognitionRef.current = recognition;

    return () => {
        recognitionRef.current?.abort();
    };
  }, []);

  const handleMicClick = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
        recognitionRef.current.stop();
    } else {
        setInput(''); // Clear input before starting
        recognitionRef.current.start();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: AiChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
        let userLocation;
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            };
        } catch (geoError) {
            console.warn("Could not get user location:", geoError);
        }

        const { text, groundingSources } = await getChatResponse(input, useDeepThought, userLocation);
        
        const modelMessage: AiChatMessage = {
            role: 'model',
            text,
            groundingSources: groundingSources?.map(chunk => (chunk.web || chunk.maps)).filter(Boolean),
        };
        setMessages(prev => [...prev, modelMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: AiChatMessage = { role: 'model', text: "Sorry, I encountered an error. Please try again." };
      setMessages(prev => [...prev, errorMessage]);
      setError('Failed to get response.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-accent text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition transform hover:scale-110"
        aria-label="Open AI Assistant"
      >
        <WandIcon className="w-8 h-8" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        <header className="flex justify-between items-center p-4 border-b dark:border-slate-700">
          <h2 className="text-xl font-bold font-poppins text-text-primary dark:text-gray-100">AI Assistant</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-300">
                <input type="checkbox" checked={useDeepThought} onChange={e => setUseDeepThought(e.target.checked)} className="rounded text-accent focus:ring-accent" />
                Deep Thought
            </label>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-700 text-text-primary dark:text-gray-200'}`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.groundingSources && msg.groundingSources.length > 0 && (
                    <div className="mt-2 border-t pt-2 dark:border-slate-600">
                        <h4 className="text-xs font-bold mb-1 opacity-90">Sources:</h4>
                        <ul className="text-xs space-y-1">
                            {msg.groundingSources.map((source, i) => (
                                <li key={i}>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:underline opacity-80">
                                        {source.title || source.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-slate-700 p-3 rounded-xl flex items-center">
                    <Loader size="sm" />
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>
        
        <footer className="p-4 border-t dark:border-slate-700">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={isRecording ? "Listening..." : "Ask anything..."}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition bg-transparent dark:border-slate-600 dark:text-gray-200"
              disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-primary text-white p-3 rounded-lg disabled:bg-primary/50">
                <SendIcon className="w-6 h-6"/>
            </button>
            <button 
                type="button"
                onClick={handleMicClick} 
                disabled={!isSpeechSupported || isLoading}
                className={`p-3 rounded-lg transition-colors text-white ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-secondary'} disabled:bg-gray-400 disabled:cursor-not-allowed`}
                title={isSpeechSupported ? "Voice Input" : "Voice input not supported"}
            >
                <MicIcon className="w-6 h-6"/>
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </footer>
      </div>
    </div>
  );
};

export default AiChatModal;