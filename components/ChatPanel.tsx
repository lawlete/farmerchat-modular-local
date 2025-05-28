
import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { ChatMessage, Database, GroupedResult, EntityType } from '../types';
import { MessageBubble } from './MessageBubble';
import { SendIcon, MicrophoneIcon, StopIcon, LoadingIcon } from './icons/ChatIcons';
import { FullScreenDataModalContent } from './FullScreenDataViewModal';


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
  onViewFullScreen: (content: FullScreenDataModalContent) => void;
}

// ###################################################################################
// AJUSTA ESTE VALOR SEGÚN TU ENTORNO Y LOS LOGS DE LA CONSOLA
// ###################################################################################
// Mira los mensajes "Max audio level detected: X" en la consola cuando estás en SILENCIO.
// SILENCE_THRESHOLD debe ser un POCO MÁS ALTO que el nivel máximo de ruido que ves en silencio.
// Por ejemplo, si en silencio ves "Max audio level detected: 70", prueba con SILENCE_THRESHOLD = 75 o 80.
// El valor original era 10, lo que puede ser muy bajo para muchos entornos.
const SILENCE_THRESHOLD = 80; // <-- !!! AJUSTA ESTE NÚMERO !!! (Ej. si tu ruido es 70, prueba 75-80)
// ###################################################################################

const SILENCE_DURATION_MS = 3000; // 3 seconds of silence
const SILENCE_CHECK_INTERVAL_MS = 500; // Check for silence every 500ms

export const ChatPanel = forwardRef<ChatPanelHandles, ChatPanelProps>((
  { messages, onSendMessage, isLoading, onBeforeStartRecording, onViewFullScreen }, 
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
  const silenceCheckIntervalIdRef = useRef<number | null>(null); // Changed NodeJS.Timeout to number
  const silenceTimeoutIdRef = useRef<number | null>(null); // Changed NodeJS.Timeout to number
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

    // --- TEMPORARY LOGGING FOR DIAGNOSIS ---
    const maxLevel = dataArray.length > 0 ? Math.max(...dataArray) : 0;
    console.log(`Max audio level detected: ${maxLevel}, Current SILENCE_THRESHOLD: ${SILENCE_THRESHOLD}`);
    // --- END TEMPORARY LOGGING ---

    const isSilent = dataArray.every(value => value < SILENCE_THRESHOLD);

    if (isSilent) {
      if (!silenceTimeoutIdRef.current) { 
        silenceTimeoutIdRef.current = window.setTimeout(() => { // Explicitly use window.setTimeout for browser
          console.log(`Silence detected for ${SILENCE_DURATION_MS / 1000} seconds, stopping recording.`);
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

      silenceCheckIntervalIdRef.current = window.setInterval(checkSilence, SILENCE_CHECK_INTERVAL_MS); // Explicitly use window.setInterval

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
    <div 
      className="flex flex-col h-full w-full shadow-xl dark:border-gray-700 bg-transition"
      style={{
        backgroundImage: "url('/images/Asistente_Virtual_IA.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto min-h-0">
        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            onViewFullScreen={onViewFullScreen} 
          />
        ))}
        {isLoading && messages[messages.length -1]?.sender !== 'ai' && ( // Show loading bubble if general isLoading is true and last message isn't already an AI loading bubble
            <MessageBubble key="loading-indicator" message={{
                id: 'loading-indicator',
                sender: 'ai',
                text: 'Procesando...',
                timestamp: new Date(),
                isLoading: true
            }}
            onViewFullScreen={onViewFullScreen} 
            />
        )}
        <div ref={messagesEndRef} />
      </div>
      {permissionError && <p className="text-red-500 bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 p-1 rounded text-xs px-4 md:px-6 pb-2">{permissionError}</p>}
      <div className="bg-gray-200 dark:bg-gray-700 bg-opacity-90 dark:bg-opacity-90 p-3 md:p-4 border-t border-gray-300 dark:border-gray-600 bg-transition">
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
      <footer className="bg-gray-100 dark:bg-gray-900 bg-opacity-90 dark:bg-opacity-90 p-2 border-t border-gray-300 dark:border-gray-700 text-center text-xs text-gray-600 dark:text-gray-400">
        <span>Instagram: @lawertechnology</span> | 
        <a href="mailto:lawertechnology@gmail.com" className="hover:text-green-500 dark:hover:text-green-400 transition-colors px-1">Email: lawertechnology@gmail.com</a> | 
        <a 
          href="https://drive.google.com/drive/folders/1kwIgpwTdERhLveb97XGz-Epb1sqdP0HD?usp=drive_link" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="hover:text-green-500 dark:hover:text-green-400 transition-colors px-1"
        >
          Manual de FarmerChat
        </a>
      </footer>
    </div>
  );
});
