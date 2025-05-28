
import { GoogleGenAI, Chat, GenerateContentResponse, Part } from "@google/genai";
import { Database, OfflineRequest, ErrorClassification, OfflineRequestPayload, ChatMessage, ErrorInfoHistoryItem } from '../types';
import { LOCAL_STORAGE_OFFLINE_QUEUE_KEY, MAX_OFFLINE_REQUEST_ATTEMPTS, SYSTEM_PROMPT_HEADER, GEMINI_MODEL_TEXT } from '../constants';
import { generateUUID } from './dbService';

export const getOfflineQueueFromStorage = (): OfflineRequest[] => {
  const storedQueue = localStorage.getItem(LOCAL_STORAGE_OFFLINE_QUEUE_KEY);
  if (!storedQueue) return [];
  try {
    return JSON.parse(storedQueue).map((r: any) => ({
        ...r,
        timestamp: new Date(r.timestamp),
        lastAttemptTimestamp: r.lastAttemptTimestamp ? new Date(r.lastAttemptTimestamp) : undefined,
        errorInfo: r.errorInfo ? {
            ...r.errorInfo,
            history: (r.errorInfo.history || []).map((h: any) => ({...h, timestamp: new Date(h.timestamp)}))
        } : undefined
    }));
  } catch (error) {
    console.error("Error parsing offline queue from localStorage:", error);
    return [];
  }
};

export const saveOfflineQueueToStorage = (queue: OfflineRequest[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Error saving offline queue to localStorage:", error);
  }
};

export const classifyError = (error: any): { type: ErrorClassification, message: string } => {
  const errorMessage = (error as Error).message || 'Unknown error';
  const errorStatus = (error as any).status || (error as any).code; // Gemini might use 'code'

  if (!navigator.onLine) {
    return { type: 'NO_CONNECTION', message: 'No internet connection detected.' };
  }
  if (errorMessage.includes('API key not valid') || (errorStatus === 400 && errorMessage.toLowerCase().includes('api key'))) {
    return { type: 'API_KEY_INVALID', message: `API Key Error: ${errorMessage}` };
  }
  if (errorMessage.includes('quota') || errorStatus === 429) {
    return { type: 'QUOTA_EXCEEDED', message: `Quota Exceeded: ${errorMessage}` };
  }
  if (errorMessage.toLowerCase().includes('fetch') || errorMessage.toLowerCase().includes('networkerror') || errorMessage.toLowerCase().includes('failed to connect')) {
      return { type: 'NO_CONNECTION', message: `Network Error: ${errorMessage}` };
  }
  if (errorStatus === 503 || errorStatus === 500 || (errorMessage.toLowerCase().includes('service unavailable') || errorMessage.toLowerCase().includes('internal error'))) {
      return { type: 'MODEL_UNAVAILABLE', message: `LLM Service Unavailable (${errorStatus || 'N/A'}): ${errorMessage}` };
  }
  
  // Check for specific Gemini API error patterns if the error object has a specific structure
  // This is a heuristic, actual error structure from @google/genai might vary.
  if (error.name === 'GoogleGenerativeAIError' || errorMessage.toLowerCase().includes('gemini') || errorMessage.toLowerCase().includes('google generative ai')) {
      return { type: 'GEMINI_API_ERROR', message: `Gemini API Error: ${errorMessage}` };
  }
  return { type: 'UNKNOWN', message: `Unknown Error: ${errorMessage}` };
};

export const isQueuableError = (errorType: ErrorClassification): boolean => {
  return [
    'NO_CONNECTION', 
    'API_KEY_INVALID', // Queued because admin might fix it
    'QUOTA_EXCEEDED', 
    'MODEL_UNAVAILABLE', 
    'GEMINI_API_ERROR', // Generic API errors that might be transient
    'UNKNOWN' // Assume unknown errors might be transient network blips
  ].includes(errorType);
};


export const addRequestToOfflineQueue = (
  payload: OfflineRequestPayload,
  errorType: ErrorClassification,
  errorMessage: string,
  setOfflineQueue: React.Dispatch<React.SetStateAction<OfflineRequest[]>>,
  originalMessageId?: string
): OfflineRequest => {
  const newRequest: OfflineRequest = {
    id: generateUUID(),
    timestamp: new Date(),
    type: 'sendMessageToAI',
    payload,
    status: 'pending',
    attempts: 0,
    errorInfo: { 
        type: errorType, 
        message: errorMessage, 
        history: [{ timestamp: new Date(), type: errorType, message: errorMessage }] 
    },
    originalMessageId,
  };
  setOfflineQueue(prevQueue => {
      const updatedQueue = [...prevQueue, newRequest];
      // saveOfflineQueueToStorage(updatedQueue); // Saving is now handled by useEffect in App.tsx
      return updatedQueue;
  });
  return newRequest;
};

export const attemptProcessRequest = async (
    request: OfflineRequest,
    chatSession: Chat | null,
    currentDB: Database,
    currentChatMessages: ChatMessage[], // For context construction
    onSuccess: (requestId: string, responseText: string, llmResponse: GenerateContentResponse) => void,
    onFailure: (requestId: string, errorInfo: { type: ErrorClassification, message: string }) => void,
    onPermanentFailure: (requestId: string, errorInfo: { type: ErrorClassification, message: string }) => void
): Promise<void> => {
    if (!chatSession) {
        const errInfo = { type: 'GEMINI_API_ERROR' as ErrorClassification, message: 'Chat session not initialized for retry.' };
        if (request.attempts + 1 >= MAX_OFFLINE_REQUEST_ATTEMPTS) {
            onPermanentFailure(request.id, {type: 'MAX_ATTEMPTS_REACHED', message: `Max attempts reached. Last error: ${errInfo.message}`});
        } else {
            onFailure(request.id, errInfo);
        }
        return;
    }

    const { messageText, audioBase64, audioMimeType } = request.payload;
    const currentDBStateString = JSON.stringify(currentDB); 
    
    // Reconstruct parts for the API call
    // It's important that this logic matches the one in App.tsx's sendMessageToAI
    const parts: Part[] = [
        { text: `${SYSTEM_PROMPT_HEADER}\n\nContexto de Base de Datos (NO MOSTRAR AL USUARIO, USAR PARA REFERENCIA INTERNA):\n${currentDBStateString}\n\nHistorial de Conversación Reciente (últimos mensajes, para referencia contextual, NO MOSTRAR AL USUARIO):\n${currentChatMessages.slice(-10).map(m => `${m.sender}: ${m.text}`).join('\n')}\n\nComando del Usuario (Reintentando solicitud en cola):` },
        // Note: SYSTEM_PROMPT_HEADER is included here again in the parts, which might be redundant if chatSession was created with it.
        // However, for a stateless retry, it's safer. If chatSession is long-lived and maintains systemInstruction, this could be simplified.
        // For now, including it to ensure context.
    ];
    
    if (audioBase64 && audioMimeType) {
        parts.push({ inlineData: { data: audioBase64, mimeType: audioMimeType } });
        if (messageText !== "Comando de voz grabado (procesando...)") { 
           parts.push({ text: messageText }); 
        }
    } else {
        parts.push({ text: messageText });
    }

    try {
        // Use ai.models.generateContent directly for retries to ensure fresh context application,
        // instead of chatSession.sendMessage which relies on internal history that might be stale or complex for retries.
        // This requires GeminiService instance to be available or passed.
        // For simplicity with current structure, we'll try with chatSession.sendMessage, assuming it's robust enough or re-initialized.
        // If chatSession proves problematic for retries, this is where direct ai.models.generateContent would be better.
        
        const response: GenerateContentResponse = await chatSession.sendMessage({ message: parts }); 
        onSuccess(request.id, response.text, response);

    } catch (error) {
        const classifiedError = classifyError(error);
        if (request.attempts + 1 >= MAX_OFFLINE_REQUEST_ATTEMPTS) {
            onPermanentFailure(request.id, {type: 'MAX_ATTEMPTS_REACHED', message: `Max attempts reached. Last error (${classifiedError.type}): ${classifiedError.message}`});
        } else {
            onFailure(request.id, classifiedError);
        }
    }
};
