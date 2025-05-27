
import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
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
  onBeforeStartRecording?: () => void;
}

const SILENCE_THRESHOLD = 10; // Sensitivity for silence detection (0-255 for frequency data)
const SILENCE_DURATION_MS = 3000; // 3 seconds of silence
const SILENCE_CHECK_INTERVAL_MS = 500; // Check for silence every 500ms

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

  // Refs for silence detection
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceCheckIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);


  const cleanupAudioProcessing = useCallback(() => {
    if (silenceCheckIntervalIdRef.current) clearInterval(silenceCheckIntervalIdRef.current);
    if (silenceTimeoutIdRef.current) clearTimeout(silenceTimeoutIdRef.current);
    silenceCheckIntervalIdRef.current = null;
    silenceTimeoutIdRef.current = null;

    sourceRef.current?.disconnect();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(err => console.error("Error closing AudioContext:", err));
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
  }, []);

  const checkSilence = useCallback(() => {
    if (!analyserRef.current || !mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
      // If not recording or analyser not set up, clear any pending checks and stop.
      if (mediaRecorderRef.current?.state !== 'recording') {
        cleanupAudioProcessing();
      }
      return;
    }

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const isSilent = dataArray.every(value => value < SILENCE_THRESHOLD);

    if (isSilent) {
      if (!silenceTimeoutIdRef.current) { 
        silenceTimeoutIdRef.current = setTimeout(() => {
          console.log("Silence detected for 3 seconds, stopping recording.");
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop(); // This will trigger onstop
          }
          // cleanupAudioProcessing() will be called in onstop
        }, SILENCE_DURATION_MS);
      }
    } else { 
      if (silenceTimeoutIdRef.current) {
        clearTimeout(silenceTimeoutIdRef.current);
        silenceTimeoutIdRef.current = null;
      }
    }
  }, [cleanupAudioProcessing]);


  const startRecordingInternal = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreamRef.current = stream; // Store the stream
      setPermissionError(null);
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      // Setup AudioContext for silence detection
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      // Optional: analyserRef.current.minDecibels = -90; analyserRef.current.maxDecibels = -10; analyserRef.current.smoothingTimeConstant = 0.85;
      
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      // Note: Do NOT connect analyser to audioContext.destination if only monitoring

      silenceCheckIntervalIdRef.current = setInterval(checkSilence, SILENCE_CHECK_INTERVAL_MS);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        cleanupAudioProcessing(); // Clean up silence detection resources
        
        if (activeStreamRef.current) {
            activeStreamRef.current.getTracks().forEach(track => track.stop());
            activeStreamRef.current = null;
        }

        if (audioChunksRef.current.length === 0) {
            console.warn("Recording stopped with no audio data.");
            setIsRecording(false); 
            return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' }); 
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          await onSendMessage("Comando de voz grabado (procesando...)", base64Audio, audioBlob.type);
        };
        reader.readAsDataURL(audioBlob);
        setIsRecording(false); 
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone or starting recording:", err);
      setPermissionError("No se pudo acceder al micrófono. Verifica los permisos.");
      cleanupAudioProcessing(); // Clean up if error
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
        activeStreamRef.current = null;
      }
      setIsRecording(false);
    }
  };
  
  const stopRecordingInternal = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop(); // This triggers onstop, which handles cleanup
    } else {
      // If not actively recording but resources might be lingering
      cleanupAudioProcessing();
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
        activeStreamRef.current = null;
      }
      setIsRecording(false); // Ensure state is correct
    }
  };

  useImperativeHandle(ref, () => ({
    triggerStartRecording: () => {
      if (!isRecording) {
        if (onBeforeStartRecording) onBeforeStartRecording();
        startRecordingInternal();
      }
    },
    triggerStopRecording: () => {
       if (isRecording) {
        stopRecordingInternal();
      }
    }
  }));

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      stopRecordingInternal(); // Try to stop and clean up everything
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only on mount and unmount


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
        stopRecordingInternal(); 
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

  const toggleRecording = () => {
    if (isRecording) {
      stopRecordingInternal();
    } else {
      if (onBeforeStartRecording) onBeforeStartRecording();
      startRecordingInternal();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-800 shadow-xl dark:border-gray-700 bg-transition">
      <div className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto min-h-0">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && messages[messages.length -1]?.sender !== 'ai' && ( // Show loading bubble if general isLoading is true and last message isn't already an AI loading bubble
            <MessageBubble key="loading-indicator" message={{
                id: 'loading-indicator',
                sender: 'ai',
                text: 'Procesando...',
                timestamp: new Date(),
                isLoading: true
            }}/>
        )}
        <div ref={messagesEndRef} />
      </div>
      {permissionError && <p className="text-red-500 dark:text-red-400 text-xs px-4 md:px-6 pb-2">{permissionError}</p>}
      <div className="bg-gray-200 dark:bg-gray-700 p-3 md:p-4 border-t border-gray-300 dark:border-gray-600 bg-transition">
        <div className="flex items-end space-x-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu comando o pregunta..."
            className="flex-1 p-3 bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none resize-none overflow-hidden min-h-[44px] max-h-40"
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
