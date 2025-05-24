
import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { ChatMessage, Database } from '../types';
import { MessageBubble } from './MessageBubble';
import { SendIcon, MicrophoneIcon, StopIcon, LoadingIcon } from './icons/ChatIcons';

export interface ChatPanelHandles {
  triggerStartRecording: () => void;
  triggerStopRecording: () => void;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, audioBase64?: string, audioMimeType?: string) => Promise<void>;
  isLoading: boolean;
  currentDb: Database; 
  onBeforeStartRecording?: () => void; // New optional prop
}

export const ChatPanel = forwardRef<ChatPanelHandles, ChatPanelProps>((
  { messages, onSendMessage, isLoading, onBeforeStartRecording }, 
  ref
) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    triggerStartRecording: () => {
      if (!isRecording) {
        if (onBeforeStartRecording) onBeforeStartRecording();
        startRecording();
      }
    },
    triggerStopRecording: () => {
       if (isRecording) {
        stopRecording();
      }
    }
  }));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`; 
  };

  const handleSend = async () => {
    if (inputText.trim() === '') return;
    if (isRecording) {
        stopRecording(); 
    }
    await onSendMessage(inputText.trim());
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const startRecording = async () => {
    if (isRecording) return; 
    // onBeforeStartRecording is called by triggerStartRecording or toggleRecording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionError(null);
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
            console.warn("Recording stopped with no audio data.");
            stream.getTracks().forEach(track => track.stop());
            setIsRecording(false); 
            return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          await onSendMessage("Comando de voz grabado (procesando...)", base64Audio, audioBlob.type);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop()); 
        setIsRecording(false); 
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setPermissionError("No se pudo acceder al micrófono. Verifica los permisos.");
      setIsRecording(false); 
      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      if (onBeforeStartRecording) onBeforeStartRecording();
      startRecording();
    }
  };

  return (
    <div className="flex flex-col flex-grow w-full md:w-1/2 max-w-4xl mx-auto bg-gray-100 dark:bg-gray-800 shadow-xl border-r border-gray-300 dark:border-gray-700 bg-transition">
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {permissionError && <p className="text-red-500 dark:text-red-400 text-xs px-6 pb-2">{permissionError}</p>}
      <div className="bg-gray-200 dark:bg-gray-700 p-4 border-t border-gray-300 dark:border-gray-600 bg-transition">
        <div className="flex items-end space-x-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu comando o pregunta..."
            className="flex-1 p-3 bg-gray-50 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none resize-none overflow-hidden min-h-[44px] max-h-40"
            rows={1}
            aria-label="Campo de entrada de mensajes"
          />
          <button
            onClick={toggleRecording}
            disabled={isLoading && !isRecording} 
            className={`p-3 rounded-full transition-colors ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white disabled:opacity-50`}
            title={isRecording ? "Detener grabación" : "Grabar voz"}
            aria-label={isRecording ? "Detener grabación de voz" : "Iniciar grabación de voz"}
          >
            {isRecording ? <StopIcon className="h-5 w-5" /> : <MicrophoneIcon className="h-5 w-5" />}
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || inputText.trim() === ''}
            className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full transition-colors disabled:opacity-50"
            title="Enviar mensaje"
            aria-label="Enviar mensaje"
          >
            {isLoading && !isRecording ? <LoadingIcon className="h-5 w-5 animate-spin"/> : <SendIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
});
