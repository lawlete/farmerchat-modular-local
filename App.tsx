
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TopBar, TopBarHandles } from './components/TopBar';
import { ChatPanel, ChatPanelHandles } from './components/ChatPanel';
import { DataPanel } from './components/DataPanel';
import { Database, ChatMessage, LLMResponseAction, EntityType, GroupedResult, ALL_ENTITY_TYPES, Task, OfflineRequest, OfflineRequestPayload, ErrorClassification } from './types';
import { LOCAL_STORAGE_DB_KEY, INITIAL_DB, SYSTEM_PROMPT_HEADER, ENTITY_DISPLAY_NAMES, GEMINI_MODEL_TEXT, LOCAL_STORAGE_OFFLINE_QUEUE_KEY, MAX_OFFLINE_REQUEST_ATTEMPTS, INITIAL_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS, OFFLINE_PROCESSING_INTERVAL_MS } from './constants';
import { GoogleGenAI, Chat, GenerateContentResponse, Part } from "@google/genai";
import { processCsvData, generateUUID, convertEntityArrayToCsvString } from './services/dbService';
import { classifyError, isQueuableError, addRequestToOfflineQueue as addRequestToQueueUtil, attemptProcessRequest as attemptProcessRequestUtil, getOfflineQueueFromStorage, saveOfflineQueueToStorage } from './services/offlineService';
import { MultipleCsvUploadModal } from './components/MultipleCsvUploadModal';
import { ConfirmModal } from './components/ConfirmModal';
import { WelcomeBanner } from './components/WelcomeBanner'; 
import { FullScreenDataViewModal, FullScreenDataModalContent, getColumnOrderForDisplay } from './components/FullScreenDataViewModal';
import { LoadingIcon } from './components/icons/ChatIcons';


export type Theme = 'light' | 'dark';

const SPLITTER_WIDTH_PX = 8;

const isDatabaseEffectivelyEmpty = (db: Database): boolean => {
  if (!db) return true;
  return ALL_ENTITY_TYPES.every(key => !db[key] || db[key].length === 0);
};

const App: React.FC = () => {
  const [database, setDatabase] = useState<Database>(INITIAL_DB);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentGroupedResults, setCurrentGroupedResults] = useState<GroupedResult[] | null>(null);
  const [geminiService, setGeminiService] = useState<GoogleGenAI | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [isInteractiveVoiceMode, setIsInteractiveVoiceMode] = useState<boolean>(false);
  const chatPanelRef = useRef<ChatPanelHandles>(null);
  const topBarRef = useRef<TopBarHandles>(null);

  const [isMultiCsvModalOpen, setIsMultiCsvModalOpen] = useState(false);
  const [filesForMultiUpload, setFilesForMultiUpload] = useState<File[]>([]);

  const speechQueueRef = useRef<SpeechSynthesisUtterance[]>([]);
  const isSpeakingRef = useRef(false);

  const [chatPanelWidthPercent, setChatPanelWidthPercent] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const resizableContainerRef = useRef<HTMLDivElement>(null);
  const [isMdScreen, setIsMdScreen] = useState(window.innerWidth >= 768);

  const [showDeleteDbConfirm, setShowDeleteDbConfirm] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true); 

  const [isFullScreenDataModalOpen, setIsFullScreenDataModalOpen] = useState(false);
  const [fullScreenDataModalContent, setFullScreenDataModalContent] = useState<FullScreenDataModalContent | null>(null);

  // Offline Queue State
  const [offlineRequestQueue, setOfflineRequestQueue] = useState<OfflineRequest[]>([]);
  const processingRequestIdRef = useRef<string | null>(null);
  const offlineRequestQueueRef = useRef<OfflineRequest[]>([]); // Ref for interval access

  useEffect(() => {
    saveOfflineQueueToStorage(offlineRequestQueue);
    offlineRequestQueueRef.current = offlineRequestQueue;
  }, [offlineRequestQueue]);


  const handleOpenFullScreenDataModal = (content: FullScreenDataModalContent) => {
    setFullScreenDataModalContent(content);
    setIsFullScreenDataModalOpen(true);
  };

  const handleCloseFullScreenDataModal = () => {
    setIsFullScreenDataModalOpen(false);
    setFullScreenDataModalContent(null);
  };


  useEffect(() => {
    const checkScreenSize = () => {
      const mdScreen = window.innerWidth >= 768;
      setIsMdScreen(mdScreen);
      if (mdScreen && resizableContainerRef.current) {
         setChatPanelWidthPercent(prev => (prev === 100 || prev === 0 ? 50 : prev));
      }
    };
    window.addEventListener('resize', checkScreenSize);
    checkScreenSize(); 
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
      if (storedTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    } else {
      document.documentElement.classList.add('dark'); 
    }
  }, []);

  const addMessageToChat = useCallback((
    text: string, 
    sender: ChatMessage['sender'], 
    isError: boolean = false, 
    groupedData?: GroupedResult[], 
    rawLLMResponse?: string, 
    relatedOfflineRequestId?: string,
    actionType?: LLMResponseAction['action'] // Added actionType
  ) => {
    const newMessage: ChatMessage = { 
      id: generateUUID(), 
      text, 
      sender, 
      timestamp: new Date(), 
      isError, 
      groupedData, 
      rawLLMResponse, 
      isLoading: sender === 'ai' && !text, 
      relatedOfflineRequestId,
      actionType // Store actionType
    };
    setChatMessages(prev => [...prev, newMessage]);
    
    if (groupedData) {
      setCurrentGroupedResults(groupedData);
    } else if (sender === 'user') { 
      setCurrentGroupedResults(null);
      if (isFullScreenDataModalOpen) handleCloseFullScreenDataModal();
    }

    if (sender === 'system' && isInteractiveVoiceMode && text && !isError) {
        speakText(text);
    }
    
    const isInitialSystemMessage = sender === 'system' && (
        text.startsWith('Cargando base de datos') ||
        text.startsWith('Base de datos de prueba cargada') || 
        text.startsWith('Se corrigió la estructura') ||
        text.startsWith('Base de datos borrada exitosamente') ||
        text.startsWith('Si necesita una base de datos de prueba') ||
        text.startsWith('Historial de chat') || // For history load/save messages
        text.includes("solicitud encolada") || // For offline queue messages
        text.includes("solicitudes pendientes") ||
        text.includes("ubicación seleccionada") || // For File System Access API save
        text.includes("Error de Configuración (API Key)") || // For API key error messages
        text.includes("ha sido guardado") // For API key queue confirmation
    );
    if (!isInitialSystemMessage && showWelcomeBanner) {
        setShowWelcomeBanner(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInteractiveVoiceMode, showWelcomeBanner, isFullScreenDataModalOpen]); 

  const loadTestDatabase = useCallback(async (isAutoLoad: boolean = true) => {
    try {
      if(isAutoLoad) addMessageToChat('Verificando base de datos local...', 'system');
      
      const response = await fetch('/BD_testing.json'); 
      if (!response.ok) {
        throw new Error(`Error al cargar BD_testing.json: ${response.statusText} (status: ${response.status})`);
      }
      const testDb = await response.json() as Database;
      
      let isValidDB = true;
      for (const key of ALL_ENTITY_TYPES) {
        if (!Array.isArray(testDb[key as EntityType])) {
          isValidDB = false;
          console.warn(`BD_testing.json: Falta o es inválido el array para la entidad ${key}.`);
          if (!isAutoLoad) addMessageToChat(`Error en BD_testing.json: Falta o es inválida la entidad '${ENTITY_DISPLAY_NAMES[key as EntityType] || key}'. No se pudo cargar.`, 'system', true);
          return; 
        }
      }
      if (!isValidDB) { 
        throw new Error("El archivo BD_testing.json no tiene la estructura esperada.");
      }

      setDatabase(testDb);
      localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(testDb));
      setCurrentGroupedResults(null); 
      if (isFullScreenDataModalOpen) handleCloseFullScreenDataModal();
      
      const message = isAutoLoad ? 'Base de datos local no encontrada o inválida, se cargó la BD de prueba.' : 'Base de datos de prueba cargada exitosamente.';
      addMessageToChat(message, 'system');
    } catch (error) {
      console.error("Error cargando la base de datos de prueba:", error);
      addMessageToChat(`Error al cargar la base de datos de prueba: ${(error as Error).message}`, 'system', true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addMessageToChat, isFullScreenDataModalOpen]);

  useEffect(() => {
    const storedDB = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
    if (storedDB) {
      try {
        const parsedDB = JSON.parse(storedDB) as Database;
        if (isDatabaseEffectivelyEmpty(parsedDB)) {
          console.log("LocalStorage DB está vacía o es inválida, cargando BD_testing.json");
          loadTestDatabase(true); 
        } else {
            let isValidDBStructure = true;
            const tempDB: Record<string, any> = {};
            for (const key of ALL_ENTITY_TYPES) {
              if (!Array.isArray(parsedDB[key as EntityType])) {
                isValidDBStructure = false;
                console.warn(`LocalStorage: Falta o es inválido el array para la entidad ${key}. Usando array vacío para esta clave.`);
                tempDB[key] = INITIAL_DB[key as EntityType] || [];
              } else {
                tempDB[key] = parsedDB[key as EntityType];
              }
            }
            setDatabase(tempDB as Database);
            if (!isValidDBStructure) {
                 localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(tempDB));
                 addMessageToChat("Se corrigió la estructura de la base de datos local.", "system");
            }
        }
      } catch (error) {
        console.error("Error al parsear la BD almacenada, cargando BD_testing.json:", error);
        loadTestDatabase(true); 
      }
    } else {
      console.log("LocalStorage vacío, cargando BD_testing.json");
      loadTestDatabase(true);
    }
    if (chatMessages.length === 0) {
        addMessageToChat("¡Bienvenido a FarmerChat AI! Escribe 'Ayuda' para ver ejemplos de comandos o utiliza los botones superiores para gestionar tus datos.", 'system');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  const handleRequestDeleteDb = () => {
    setShowDeleteDbConfirm(true);
  };

  const handleConfirmDeleteDb = () => {
    setDatabase(INITIAL_DB);
    localStorage.removeItem(LOCAL_STORAGE_DB_KEY);
    setCurrentGroupedResults(null);
    if (isFullScreenDataModalOpen) handleCloseFullScreenDataModal();
    addMessageToChat('Base de datos borrada exitosamente.', 'system');
    setShowDeleteDbConfirm(false);
  };

  const handleCancelDeleteDb = () => {
    setShowDeleteDbConfirm(false);
  };

  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
      return newTheme;
    });
  };

  const handleBeforeStartRecording = () => {
    if (isInteractiveVoiceMode && window.speechSynthesis.speaking) {
      console.log("User interrupted speech. Cancelling synthesis and clearing queue.");
      window.speechSynthesis.cancel(); 
      speechQueueRef.current = [];
      isSpeakingRef.current = false;
    }
  };
  
  const toggleInteractiveVoiceMode = (enable?: boolean) => {
    setIsInteractiveVoiceMode(prev => {
      const newMode = typeof enable === 'boolean' ? enable : !prev;
      if (!newMode) { 
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
          }
          speechQueueRef.current = []; 
          isSpeakingRef.current = false;
      }
      return newMode;
    });
  };
  
  const processSpeechQueue = useCallback(() => {
    if (isSpeakingRef.current || speechQueueRef.current.length === 0 || !isInteractiveVoiceMode) {
      if (speechQueueRef.current.length === 0 && !isSpeakingRef.current && isInteractiveVoiceMode && chatPanelRef.current) {
          const lastMessage = chatMessages[chatMessages.length -1];
          if(lastMessage && (lastMessage.sender === 'ai' || lastMessage.sender === 'system') && !lastMessage.isError && !lastMessage.isLoading){
            const aiSpeakingKeywords = ["¿qué más puedo hacer por ti?", "¿en qué más te puedo ayudar?", "¿algo más?", "sugerencias", "¿es correcto?", "¿quieres ver más?", "activado.", "para poder continuar", "encolado", "procesada con éxito", "falló"];
            const shouldTriggerMic = aiSpeakingKeywords.some(keyword => lastMessage.text.toLowerCase().includes(keyword.toLowerCase()));
            if(shouldTriggerMic || lastMessage.groupedData){
                 console.log("Speech queue empty, last AI/System message seems to prompt for input. Triggering mic.");
                 chatPanelRef.current.triggerStartRecording();
            }
          }
      }
      return;
    }
    isSpeakingRef.current = true;
    const utterance = speechQueueRef.current.shift();

    if (utterance) {
      const originalOnEnd = utterance.onend;
      utterance.onend = function(event: SpeechSynthesisEvent) {
        isSpeakingRef.current = false;
        if (typeof originalOnEnd === 'function') {
          originalOnEnd.call(this, event); 
        }
        processSpeechQueue(); 
      };

      const originalOnError = utterance.onerror;
      utterance.onerror = function(event: SpeechSynthesisErrorEvent) {
        if (event.error === 'interrupted') {
          console.log('SpeechSynthesisUtterance: Speech was interrupted.', event);
        } else {
          console.error('SpeechSynthesisUtterance.onerror - Error reason:', event.error, 'Full event details:', event);
          addMessageToChat(`Error al reproducir voz: ${event.error}`, 'system', true);
        }
        isSpeakingRef.current = false;
        if (typeof originalOnError === 'function') {
            originalOnError.call(this, event); 
        }
        processSpeechQueue(); 
      };
      window.speechSynthesis.speak(utterance);
    } else {
        isSpeakingRef.current = false; 
        processSpeechQueue(); 
    }
  }, [addMessageToChat, chatMessages, isInteractiveVoiceMode]);

  const speakText = useCallback((text: string, onEndCallback?: () => void) => {
    if (!isInteractiveVoiceMode || !text) {
      if(onEndCallback) onEndCallback();
      processSpeechQueue(); 
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    if (onEndCallback) {
      utterance.onend = onEndCallback;
    }
    
    speechQueueRef.current.push(utterance);
    processSpeechQueue();
  }, [isInteractiveVoiceMode, processSpeechQueue]);

  const speakGroupedResults = useCallback((results: GroupedResult[], onAllSpoken?: () => void) => {
    if (!isInteractiveVoiceMode || !results || results.length === 0) {
      if (onAllSpoken) onAllSpoken();
      processSpeechQueue();
      return;
    }
  
    let fullTextToSpeak = "";
    results.forEach(group => {
      fullTextToSpeak += `${group.groupTitle}. `;
      if (group.items.length > 0) {
        group.items.forEach(item => {
          let itemDetails = "";
          const itemKeys = getColumnOrderForDisplay([item]);
          
          const primaryName = item.name || item.taskName || (item.id && itemKeys.length <= 2 ? `ID ${item.id}`: null) ; 
          if (primaryName) {
            itemDetails += `${primaryName}. `;
          } else if (item.id) {
            itemDetails += `Elemento con ID ${item.id}. `;
          } else {
            itemDetails += `Siguiente elemento. `;
          }
  
          itemKeys.forEach(key => {
            const lowerKey = key.toLowerCase();
            if ((lowerKey === 'name' || lowerKey === 'taskname' || lowerKey === 'title') && primaryName) return;
            if (lowerKey === 'id' && (primaryName || item.id)) return; 
  
            if (item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '') {
              const value = item[key];
              let displayValue = '';
              if (typeof value === 'boolean') {
                displayValue = value ? 'Sí' : 'No';
              } else if (typeof value === 'object') {
                displayValue = 'tiene datos complejos asociados'; 
              } else {
                displayValue = String(value);
              }
              const speakableKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase();
              itemDetails += `${speakableKey}: ${displayValue}. `;
            }
          });
          fullTextToSpeak += itemDetails.trim() + " "; 
        });
      } else {
        fullTextToSpeak += "No se encontraron elementos. ";
      }
    });
    
    if (fullTextToSpeak.trim()) {
      speakText(fullTextToSpeak.trim(), onAllSpoken);
    } else {
       if (onAllSpoken) onAllSpoken();
       processSpeechQueue();
    }
  }, [isInteractiveVoiceMode, processSpeechQueue, speakText]);


  useEffect(() => {
    let apiKey: string | undefined = undefined;
    let apiKeySource: string = '';

    // 1. Try Vite's environment variable
    try {
        // @ts-ignore
        const viteApiKey = import.meta.env?.VITE_API_KEY;
        if (viteApiKey && viteApiKey !== "YOUR_GEMINI_API_KEY_PLACEHOLDER" && viteApiKey !== "AQUI_VA_TU_CLAVE_API_DE_GEMINI" && String(viteApiKey).trim() !== '') {
            apiKey = String(viteApiKey).trim();
            apiKeySource = 'VITE_API_KEY (import.meta.env)';
        }
    } catch (e) {
        console.warn("Could not access import.meta.env for VITE_API_KEY. This is expected in non-Vite environments.", e);
    }
    
    // 2. If Vite's key wasn't found or valid, try process.env
    if (!apiKey) {
        const processEnvApiKey = process.env.API_KEY;
        if (processEnvApiKey && processEnvApiKey !== "YOUR_GEMINI_API_KEY_PLACEHOLDER" && processEnvApiKey !== "AQUI_VA_TU_CLAVE_API_DE_GEMINI" && processEnvApiKey.trim() !== '') {
            apiKey = processEnvApiKey.trim();
            apiKeySource = 'process.env.API_KEY';
        }
    }

    if (!apiKey) {
        const errorMessage = "Error de Configuración: La clave API para Gemini no está configurada o es un placeholder. " +
                             "Por favor, asegúrese de que VITE_API_KEY (para entornos Vite) o process.env.API_KEY (para otros entornos) esté correctamente configurada. " +
                             "La funcionalidad de IA no estará disponible. Contacte al administrador. Puede guardar su historial de chat actual.";
        console.error("API Key for Gemini is missing or is a placeholder. Checked import.meta.env.VITE_API_KEY and process.env.API_KEY.");
        addMessageToChat(errorMessage, "system", true);
        // setIsLoading(false); // isLoading state is primarily for chat operations, not initial setup failure.
        return;
    }

    console.log(`Using API Key from: ${apiKeySource}`);
    
    try {
      const genAI = new GoogleGenAI({ apiKey: apiKey });
      setGeminiService(genAI);
       const newChat = genAI.chats.create({
         model: GEMINI_MODEL_TEXT,
         config: {
           systemInstruction: SYSTEM_PROMPT_HEADER,
           temperature: 0.3, 
           topK: 30,
           topP: 0.85,
         },
       });
      setChatSession(newChat);
    } catch (error) {
        console.error("Error initializing Gemini Service:", error);
        addMessageToChat(`Error al inicializar el servicio de IA: ${(error as Error).message}. Puede guardar su historial de chat actual.`, 'system', true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addMessageToChat]); 

  const handleFileUpload = async (file: File, type: 'json_db' | EntityType) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        addMessageToChat("Si necesita una base de datos de prueba, comuníquese con el administrador de la aplicación.", 'system');

        if (type === 'json_db') {
          const newDb = JSON.parse(content) as Database;
          let isValidDB = true;
          for (const key of ALL_ENTITY_TYPES) {
            if (!Array.isArray(newDb[key as EntityType])) {
                isValidDB = false;
                addMessageToChat(`Error en archivo de base de datos importado: Falta o es inválida la entidad '${ENTITY_DISPLAY_NAMES[key as EntityType] || key}'.`, 'system', true);
                break;
            }
          }
          if (isValidDB) {
            setDatabase(newDb);
            localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(newDb));
            addMessageToChat('Base de datos importada correctamente desde el archivo.', 'system');
            setCurrentGroupedResults(null);
            if (isFullScreenDataModalOpen) handleCloseFullScreenDataModal();
          }
        } else {
          const processedData = processCsvData(content, type);
          if (processedData.length > 0) {
            setDatabase(prevDb => {
              const updatedDb = {
                ...prevDb,
                [type]: processedData
              };
              localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(updatedDb));
              return updatedDb;
            });
            addMessageToChat(`Datos para '${ENTITY_DISPLAY_NAMES[type]}' importados desde el archivo de tabla. ${processedData.length} registros cargados.`, 'system');
            setCurrentGroupedResults(null);
             if (isFullScreenDataModalOpen) handleCloseFullScreenDataModal();
          } else {
            addMessageToChat(`No se pudieron procesar datos válidos del archivo de tabla para '${ENTITY_DISPLAY_NAMES[type]}'. Verifique el formato y encabezados.`, 'system', true);
          }
        }
      } catch (err) {
        console.error("Error processing file:", err);
        addMessageToChat(`Error al procesar el archivo: ${(err as Error).message}`, 'system', true);
      }
    };
    reader.readAsText(file);
  };

  const handleMultipleFileUploadRequest = (files: File[]) => {
    setFilesForMultiUpload(files);
    setIsMultiCsvModalOpen(true);
  };

  const handleProcessMultipleCsvs = (filesToProcess: { file: File, entityType: EntityType }[]) => {
    setIsMultiCsvModalOpen(false);
    if (filesToProcess.length === 0) {
        addMessageToChat("No se seleccionaron archivos para procesar.", "system");
        return;
    }

    addMessageToChat(`Iniciando importación de ${filesToProcess.length} archivo(s) de tabla...`, "system");
    let currentDbSnapshot = { ...database }; 
    let changesMade = false;
    let allSuccessful = true;

    const processFilePromises = filesToProcess.map(async ({ file, entityType }) => {
        try {
            const content = await file.text();
            const processedData = processCsvData(content, entityType);
            if (processedData.length > 0) {
                currentDbSnapshot = {
                    ...currentDbSnapshot,
                    [entityType]: processedData
                };
                changesMade = true;
                addMessageToChat(`Archivo de tabla '${file.name}' (${ENTITY_DISPLAY_NAMES[entityType]}): ${processedData.length} registros cargados.`, 'system');
            } else {
                addMessageToChat(`Archivo de tabla '${file.name}' (${ENTITY_DISPLAY_NAMES[entityType]}): No se procesaron datos válidos.`, 'system', true);
                allSuccessful = false;
            }
        } catch (err) {
            console.error(`Error processing file ${file.name}:`, err);
            addMessageToChat(`Error al procesar archivo de tabla '${file.name}': ${(err as Error).message}`, 'system', true);
            allSuccessful = false;
        }
    });

    Promise.all(processFilePromises).then(() => {
        if (changesMade) {
            setDatabase(currentDbSnapshot);
            localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(currentDbSnapshot));
            setCurrentGroupedResults(null);
            if (isFullScreenDataModalOpen) handleCloseFullScreenDataModal();
            const summaryMessage = allSuccessful ? "Todos los archivos de tabla seleccionados fueron procesados." : "Algunos archivos de tabla tuvieron problemas durante el procesamiento. Revisa los mensajes anteriores.";
            addMessageToChat(`Importación Múltiple: ${summaryMessage}`, "system", !allSuccessful);
        } else if (!allSuccessful) {
            addMessageToChat("Importación Múltiple: Ningún archivo de tabla pudo ser procesado exitosamente.", "system", true);
        } else {
            addMessageToChat("Importación Múltiple: No se realizaron cambios en la base de datos.", "system");
        }
    });
};


  const handleFileExport = (type: 'json_db') => {
    if (type === 'json_db') {
      const jsonData = JSON.stringify(database, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `farmerChatDB_v5_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addMessageToChat('Base de datos exportada a un archivo.', 'system');
    }
  };

  const handleExportToCsvs = () => {
    let filesExportedCount = 0;
    ALL_ENTITY_TYPES.forEach(entityType => {
      const dataArray = database[entityType];
      if (dataArray && dataArray.length > 0) {
        try {
          const csvString = convertEntityArrayToCsvString(dataArray, entityType);
          if (csvString) {
            const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' }); 
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fileNameBase = entityType.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
            a.download = `${fileNameBase}_export_${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            filesExportedCount++;
          }
        } catch (error) {
            console.error(`Error exporting ${entityType} to CSV: `, error);
            addMessageToChat(`Error al exportar ${ENTITY_DISPLAY_NAMES[entityType]} como tabla (CSV): ${(error as Error).message}`, "system", true);
        }
      }
    });
    if (filesExportedCount > 0) {
        addMessageToChat(`${filesExportedCount} tipo(s) de entidad exportados a archivos de tabla (formato CSV).`, 'system');
    } else {
        addMessageToChat('No hay datos para exportar como tablas.', 'system');
    }
  };

  const handleSaveChatHistory = async () => {
    if (chatMessages.length === 0) {
      addMessageToChat("No hay historial de chat para guardar.", "system");
      if (isInteractiveVoiceMode) speakText("No hay historial de chat para guardar.");
      return;
    }

    const historyData = JSON.stringify(chatMessages, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const suggestedFilename = `farmerchat_historial_${timestamp}.json`;

    // @ts-ignore
    if (window.showSaveFilePicker) {
      try {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: suggestedFilename,
          types: [
            {
              description: 'Archivos JSON',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(historyData);
        await writable.close();
        addMessageToChat(`Historial de chat guardado en: ${fileHandle.name}`, 'system');
        if (isInteractiveVoiceMode) speakText(`Historial de chat guardado en la ubicación seleccionada.`);
      } catch (err) {
        // User likely cancelled the save dialog or an error occurred
        if ((err as Error).name !== 'AbortError') {
          console.error("Error guardando historial con File System Access API:", err);
          addMessageToChat(`Error al guardar historial: ${(err as Error).message}`, 'system', true);
          if (isInteractiveVoiceMode) speakText(`Error al guardar historial.`);
        } else {
          addMessageToChat('Guardado de historial cancelado por el usuario.', 'system');
        }
      }
    } else {
      // Fallback for browsers that don't support showSaveFilePicker
      const blob = new Blob([historyData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = suggestedFilename;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const userMessage = `Historial de chat guardado como '${suggestedFilename}'. Generalmente se encuentra en tu carpeta de Descargas.`;
      addMessageToChat(userMessage, 'system');
      if (isInteractiveVoiceMode) speakText(userMessage);
    }
  };

  const handleLoadChatHistoryFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsedHistory = JSON.parse(content);

        if (Array.isArray(parsedHistory) && parsedHistory.every(
          (msg: any) => typeof msg === 'object' && msg !== null &&
                        'id' in msg && 'sender' in msg && 
                        'text' in msg && 'timestamp' in msg
        )) {
          const typedHistory: ChatMessage[] = parsedHistory.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp), 
            isLoading: msg.isLoading || false,
            isError: msg.isError || false,
            groupedData: msg.groupedData || undefined,
            rawLLMResponse: msg.rawLLMResponse || undefined,
            relatedOfflineRequestId: msg.relatedOfflineRequestId || undefined,
            actionType: msg.actionType || undefined, // Include actionType
          }));

          setChatMessages(typedHistory);
          if (typedHistory.length > 0) {
            const lastMessage = typedHistory[typedHistory.length - 1];
            if (lastMessage.groupedData) {
              setCurrentGroupedResults(lastMessage.groupedData);
            } else {
              setCurrentGroupedResults(null);
            }
            if (isFullScreenDataModalOpen) handleCloseFullScreenDataModal();
          }
          if (showWelcomeBanner) setShowWelcomeBanner(false);
          addMessageToChat('Historial de chat cargado exitosamente.', 'system');
        } else {
          throw new Error("Formato de archivo de historial inválido. Verifique que el archivo no esté corrupto y que sea un historial de FarmerChat.");
        }
      } catch (err) {
        console.error("Error cargando historial de chat:", err);
        addMessageToChat(`Error al cargar el historial de chat: ${(err as Error).message}`, 'system', true);
      }
    };
    reader.readAsText(file);
  };


  const parseLLMResponse = (responseText: string): LLMResponseAction | null => {
    let jsonStr = responseText.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed.action === 'string' && typeof parsed.messageForUser === 'string') {
        return parsed as LLMResponseAction;
      }
      console.warn("Parsed LLM response doesn't match expected structure:", parsed);
      return null;
    } catch (e) {
      console.error("Failed to parse LLM JSON response:", e, "Raw text:", responseText);
      return null;
    }
  };

  const handleLLMAction = useCallback((actionResponse: LLMResponseAction, relatedOfflineRequestId?: string) => {
    const { action, entity, data, query, messageForUser, groupedData, rawResponse, followUpAction } = actionResponse;

    let displayableGroupedData = groupedData;

    // Fallback: If action is LIST_ENTITIES and groupedData is missing/empty,
    // but actionResponse.data is present and is an array, construct groupedData from it.
    if (action === 'LIST_ENTITIES' && 
        (!displayableGroupedData || displayableGroupedData.length === 0) && 
        entity && 
        Array.isArray(data) && 
        data.length > 0) {
        console.warn("LIST_ENTITIES: LLM response used 'data' field or 'groupedData' was empty. Adapting to 'groupedData' structure.");
        displayableGroupedData = [{
            groupTitle: ENTITY_DISPLAY_NAMES[entity] || `Listado: ${entity}`,
            items: data,
            count: data.length,
            entityType: entity
        }];
    }
    
    addMessageToChat(messageForUser, 'ai', false, displayableGroupedData, rawResponse, relatedOfflineRequestId, action);
    if (isInteractiveVoiceMode) {
      speakText(messageForUser, () => {
        if (displayableGroupedData && displayableGroupedData.length > 0) {
            speakGroupedResults(displayableGroupedData);
        }
      });
    }

    setCurrentGroupedResults(displayableGroupedData || null);
    if (isFullScreenDataModalOpen && displayableGroupedData) {
        const newContent = displayableGroupedData.length > 0 ? { title: displayableGroupedData[0].groupTitle, items: displayableGroupedData[0].items, entityType: displayableGroupedData[0].entityType } : null;
        if (newContent) handleOpenFullScreenDataModal(newContent); else handleCloseFullScreenDataModal();
    } else if (isFullScreenDataModalOpen && !displayableGroupedData) {
        handleCloseFullScreenDataModal();
    }


    const updateDatabase = (newDbState: Database) => {
        setDatabase(newDbState);
        localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(newDbState));
    };

    switch (action) {
      case 'CREATE_ENTITY':
        if (entity && data && !Array.isArray(data)) {
          const newId = data.id || generateUUID();
          const newEntityData = { ...data, id: newId };
          
          setDatabase(prevDb => {
            const entityArray = prevDb[entity] as any[];
            const updatedDb = {
              ...prevDb,
              [entity]: [...entityArray, newEntityData]
            };
            // Handle linked entities for Tasks
            if (entity === 'tasks') {
                const task = newEntityData as Task;
                if (task.machineryIds && task.machineryIds.length > 0) {
                    task.machineryIds.forEach(machId => {
                        updatedDb.taskMachineryLinks.push({
                            id: generateUUID(),
                            taskId: newId,
                            machineryId: machId,
                            // hoursUsed: undefined, // Can be added later or by AI
                            // notes: ''
                        });
                    });
                }
                if (task.personnelIds && task.personnelIds.length > 0) {
                    task.personnelIds.forEach(persId => {
                        updatedDb.taskPersonnelLinks.push({
                            id: generateUUID(),
                            taskId: newId,
                            personnelId: persId,
                            // roleInTask: '',
                            // hoursWorked: undefined
                        });
                    });
                }
                if (task.productInsumeDetails && task.productInsumeDetails.length > 0) {
                    task.productInsumeDetails.forEach(detail => {
                        updatedDb.taskInsumeLinks.push({
                            id: generateUUID(),
                            taskId: newId,
                            productInsumeId: detail.id,
                            quantityUsed: detail.quantityUsed,
                            unitUsed: detail.unitUsed,
                            // applicationDetails: ''
                        });
                    });
                }
            }
            localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(updatedDb));
            return updatedDb;
          });
        } else {
            console.error("CREATE_ENTITY: 'entity' o 'data' faltantes o 'data' es un array.", actionResponse);
            addMessageToChat(`Error interno procesando CREATE_ENTITY: 'entity' o 'data' inválidos.`, 'system', true);
        }
        break;
      case 'UPDATE_ENTITY':
        if (entity && data && query && query.id && !Array.isArray(data)) {
          updateDatabase({
            ...database,
            [entity]: (database[entity] as any[]).map(e => (e.id === query.id ? { ...e, ...data } : e))
          });
        } else {
             console.error("UPDATE_ENTITY: Faltan 'entity', 'data', 'query', o 'query.id', o 'data' es un array.", actionResponse);
             addMessageToChat(`Error interno procesando UPDATE_ENTITY: Faltan campos requeridos.`, 'system', true);
        }
        break;
      case 'DELETE_ENTITY':
        if (entity && query && query.id) {
          updateDatabase({
            ...database,
            [entity]: (database[entity] as any[]).filter(e => e.id !== query.id)
          });
        } else {
            console.error("DELETE_ENTITY: Faltan 'entity', 'query', o 'query.id'.", actionResponse);
            addMessageToChat(`Error interno procesando DELETE_ENTITY: Faltan campos requeridos.`, 'system', true);
        }
        break;
      case 'LIST_ENTITIES':
      case 'GROUPED_QUERY':
         // Data is already handled by addMessageToChat and setCurrentGroupedResults via displayableGroupedData
        break;
      case 'TOGGLE_VOICE_MODE':
        if (data && typeof (data as { enable: boolean }).enable === 'boolean') {
            toggleInteractiveVoiceMode((data as {enable: boolean}).enable);
        }
        break;
      case 'ANSWER_QUERY':
      case 'HELP':
      case 'ERROR':
      case 'PROPOSE_OPTIONS':
      case 'CONFIRM_CREATION':
      case 'PROMPT_CREATE_MISSING_ENTITY':
        // These actions are primarily informational or conversational, no direct DB op here.
        // PROMPT_CREATE_MISSING_ENTITY might have pendingTaskData, but it's for the AI's next turn.
        break;
      default:
        console.warn("Acción LLM desconocida o no manejada:", action);
    }
    
    // Handle follow-up action if present (e.g., after creating a missing entity)
    if (followUpAction && geminiService && chatSession) {
        addMessageToChat('Procesando siguiente paso...', 'system'); // Indicate something is happening
        // Simulate the follow-up action being processed by the "AI" (handleLLMAction)
        // This avoids making another actual API call immediately if the followUpAction is self-contained.
        // If followUpAction requires new user input or a new LLM turn, that's more complex.
        // For now, assume followUpAction is a direct action like CONFIRM_CREATION or another PROMPT.
        
        // A small delay to make it seem like a new turn for UI updates
        setTimeout(() => {
            setIsLoading(true); // Show loading for the follow-up
            handleLLMAction(followUpAction); // Recursive call, but for a different step
            setIsLoading(false);
        }, 500);

    } else if (!followUpAction && isInteractiveVoiceMode && !displayableGroupedData) { // Check displayableGroupedData
        // If no follow-up and no data to speak, and voice mode is on, prompt for next command
        // This check might need refinement.
        // processSpeechQueue(); // This will trigger mic if conditions are met.
    }

  }, [addMessageToChat, database, chatSession, isInteractiveVoiceMode, geminiService, processSpeechQueue, speakText, speakGroupedResults, toggleInteractiveVoiceMode, isFullScreenDataModalOpen]);


  const sendMessageToAI = async (message: string, audioBase64?: string, audioMimeType?: string) => {
    if (!geminiService || !chatSession) {
      addMessageToChat("Error: El servicio de IA no está inicializado. Verifica la configuración de la API Key.", 'system', true);
      return;
    }
    
    const userMessageId = generateUUID();
    addMessageToChat(message, 'user', false, undefined, undefined, userMessageId);
    const loadingMessageId = generateUUID();
    addMessageToChat('', 'ai', false, undefined, undefined, loadingMessageId); // Placeholder for AI loading
    setIsLoading(true);

    const currentDBStateString = JSON.stringify(database);

    const partsForThisTurn: Part[] = [];

    // Part 1: Database Context (NO MOSTRAR AL USUARIO)
    partsForThisTurn.push({ text: `Contexto de Base de Datos (NO MOSTRAR AL USUARIO, USAR PARA REFERENCIA INTERNA):\n${currentDBStateString}` });
    
    // Part 2: User's command (audio + text, or just text)
    if (audioBase64 && audioMimeType) {
        partsForThisTurn.push({ inlineData: { data: audioBase64, mimeType: audioMimeType } });
        if (message && message.trim() !== "" && message !== "Comando de voz grabado (procesando...)") {
           partsForThisTurn.push({ text: `\n\nComando del Usuario (puede ser transcripción de audio o texto directo):\n${message}` });
        }
    } else { // Text-only message
        partsForThisTurn.push({ text: `\n\nComando del Usuario:\n${message}` });
    }

    try {
      const response: GenerateContentResponse = await chatSession.sendMessage({ message: partsForThisTurn });
      setChatMessages(prev => prev.filter(msg => msg.id !== loadingMessageId)); // Remove loading message
      
      const llmResponseText = response.text;
      const parsedAction = parseLLMResponse(llmResponseText);

      if (parsedAction) {
        handleLLMAction(parsedAction);
      } else {
        addMessageToChat(`Respuesta no estructurada de la IA: ${llmResponseText}`, 'ai', false, undefined, llmResponseText);
        if (isInteractiveVoiceMode) speakText(`Respuesta no estructurada de la IA: ${llmResponseText}`);
      }
    } catch (error) {
      console.error("Error sending message to Gemini:", error);
      setChatMessages(prev => prev.filter(msg => msg.id !== loadingMessageId)); // Remove loading message

      const classifiedError = classifyError(error);
      const errorMessageForUser = `Error al comunicarse con la IA: ${classifiedError.message}`;
      
      if (classifiedError.type === 'API_KEY_INVALID') {
          addMessageToChat(classifiedError.message, 'system', true); // Shows detailed API key error
          if (isInteractiveVoiceMode) speakText(classifiedError.message);

          // If chatSession exists (meaning initial setup wasn't blocked by API key), try to queue
          if (chatSession) { 
              const offlinePayload: OfflineRequestPayload = { messageText: message, audioBase64, audioMimeType };
              const queuedRequest = addRequestToQueueUtil(offlinePayload, classifiedError.type, classifiedError.message, setOfflineRequestQueue, userMessageId);
              
              const queueConfirmMsg = `Tu comando "${message.substring(0,30)}..." ha sido guardado. Se intentará procesar automáticamente cuando la configuración de la API Key sea corregida.`;
              addMessageToChat(queueConfirmMsg, 'system', false, undefined, undefined, queuedRequest.id); // Not an error, but system info
              if (isInteractiveVoiceMode) speakText(queueConfirmMsg);
          } else {
              addMessageToChat("El comando no pudo ser encolado porque el chat no está inicializado debido al error de API Key.", 'system', true);
              if (isInteractiveVoiceMode) speakText("El comando no pudo ser encolado.");
          }
      } else if (isQueuableError(classifiedError.type) && chatSession) {
          addMessageToChat(errorMessageForUser, 'system', true); // Show generic error
          if (isInteractiveVoiceMode) speakText(errorMessageForUser);
          
          const offlinePayload: OfflineRequestPayload = { messageText: message, audioBase64, audioMimeType };
          const queuedRequest = addRequestToQueueUtil(offlinePayload, classifiedError.type, classifiedError.message, setOfflineRequestQueue, userMessageId);
          
          const queueConfirmMsg = `⚠️ Tu mensaje "${message.substring(0, 30)}..." fue ENCOLADO. Razón: ${classifiedError.message.substring(0,50)}. Se reintentará automáticamente.`;
          addMessageToChat(queueConfirmMsg, 'system', true, undefined, undefined, queuedRequest.id); // Mark as error to be noticeable
          if (isInteractiveVoiceMode) speakText(`Tu mensaje fue encolado. ${classifiedError.message}`);

      } else {
          addMessageToChat(errorMessageForUser, 'system', true);
          if (isInteractiveVoiceMode) speakText(errorMessageForUser);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Offline Queue Processing Logic
  const processQueue = useCallback(async () => {
    if (processingRequestIdRef.current || !navigator.onLine || !chatSession || !geminiService) {
      if (!navigator.onLine) console.log("Offline Queue: Paused, no connection.");
      if (!chatSession || !geminiService) console.log("Offline Queue: Paused, AI service not ready.");
      return;
    }

    const pendingRequest = offlineRequestQueueRef.current.find(r => r.status === 'pending' || (r.status === 'processing' && r.id !== processingRequestIdRef.current));
    if (!pendingRequest) {
      // console.log("Offline Queue: No pending requests to process.");
      return;
    }
    
    processingRequestIdRef.current = pendingRequest.id;
    setOfflineRequestQueue(prev => prev.map(r => r.id === pendingRequest.id ? { ...r, status: 'processing', lastAttemptTimestamp: new Date() } : r));
    
    addMessageToChat(`🔄 Reintentando solicitud encolada: "${pendingRequest.payload.messageText.substring(0, 30)}..." (Intento ${pendingRequest.attempts + 1})`, 'system', false, undefined, undefined, pendingRequest.id);

    await attemptProcessRequestUtil(
        pendingRequest,
        chatSession,
        database,
        (requestId, responseText, llmResponse) => { // onSuccess
            setOfflineRequestQueue(prev => prev.map(r => r.id === requestId ? { ...r, status: 'processed' } : r));
            const parsedAction = parseLLMResponse(responseText);
            if (parsedAction) {
                handleLLMAction(parsedAction, requestId); // Pass requestId to link AI response to original offline item
            } else {
                addMessageToChat(`Respuesta (de cola) no estructurada: ${responseText}`, 'ai', false, undefined, llmResponse.text, requestId);
                if (isInteractiveVoiceMode) speakText(`Respuesta de solicitud encolada: ${responseText}`);
            }
            processingRequestIdRef.current = null;
            addMessageToChat(`✅ Solicitud encolada "${pendingRequest.payload.messageText.substring(0, 30)}..." procesada con éxito.`, 'system', false, undefined, undefined, requestId);
            if (isInteractiveVoiceMode) speakText("Solicitud encolada procesada con éxito.");
            setTimeout(processQueue, 1000); // Check for next item quickly
        },
        (requestId, errorInfo) => { // onFailure (retryable)
            setOfflineRequestQueue(prev => prev.map(r => r.id === requestId ? { 
                ...r, 
                status: 'pending', 
                attempts: r.attempts + 1,
                errorInfo: { 
                    type: errorInfo.type, 
                    message: errorInfo.message, 
                    history: [...(r.errorInfo?.history || []), { timestamp: new Date(), type: errorInfo.type, message: errorInfo.message }]
                }
            } : r));
            processingRequestIdRef.current = null;
            addMessageToChat(`⚠️ Reintento ${pendingRequest.attempts + 1} falló para "${pendingRequest.payload.messageText.substring(0, 30)}...". Razón: ${errorInfo.message}. Se reintentará más tarde.`, 'system', true, undefined, undefined, requestId);
            // No need to speak this every time it fails and retries automatically, could be noisy.
            setTimeout(processQueue, 1000); // Try next item in queue even if this one failed to avoid blocking
        },
        (requestId, errorInfo) => { // onPermanentFailure
            setOfflineRequestQueue(prev => prev.map(r => r.id === requestId ? { 
                ...r, 
                status: 'failed',
                errorInfo: {
                    type: errorInfo.type, 
                    message: errorInfo.message,
                    history: [...(r.errorInfo?.history || []), { timestamp: new Date(), type: errorInfo.type, message: errorInfo.message }]
                }
            } : r));
            processingRequestIdRef.current = null;
            addMessageToChat(`❌ Solicitud encolada "${pendingRequest.payload.messageText.substring(0, 30)}..." falló permanentemente después de ${MAX_OFFLINE_REQUEST_ATTEMPTS} intentos. Razón: ${errorInfo.message}`, 'system', true, undefined, undefined, requestId);
            if (isInteractiveVoiceMode) speakText("Una solicitud encolada falló permanentemente.");
            setTimeout(processQueue, 1000); // Check for next item
        }
    );
  }, [chatSession, database, handleLLMAction, addMessageToChat, isInteractiveVoiceMode, speakText, geminiService, parseLLMResponse]);

  useEffect(() => {
    const storedQueue = getOfflineQueueFromStorage();
    setOfflineRequestQueue(storedQueue);
    
    const handleOnline = () => {
      addMessageToChat('Conexión a internet restablecida. Intentando procesar solicitudes pendientes...', 'system');
      if (isInteractiveVoiceMode) speakText('Conexión a internet restablecida.');
      processQueue();
    };
    const handleOffline = () => {
      addMessageToChat('Se ha perdido la conexión a internet. Las nuevas solicitudes se guardarán para procesar más tarde.', 'system', true);
      if (isInteractiveVoiceMode) speakText('Se ha perdido la conexión a internet.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const intervalId = setInterval(processQueue, OFFLINE_PROCESSING_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [processQueue, addMessageToChat, isInteractiveVoiceMode, speakText]);


  const startResizing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resizePanel = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizing || !resizableContainerRef.current || !isMdScreen) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const containerRect = resizableContainerRef.current.getBoundingClientRect();
    let newWidthPercent = ((clientX - containerRect.left) / containerRect.width) * 100;
    
    // Clamp width between 20% and 80%
    newWidthPercent = Math.max(20, Math.min(80, newWidthPercent));
    setChatPanelWidthPercent(newWidthPercent);
  }, [isResizing, isMdScreen]);

  useEffect(() => {
    if (isMdScreen) {
        document.addEventListener('mousemove', resizePanel);
        document.addEventListener('mouseup', stopResizing);
        document.addEventListener('touchmove', resizePanel);
        document.addEventListener('touchend', stopResizing);
    }
    return () => {
        document.removeEventListener('mousemove', resizePanel);
        document.removeEventListener('mouseup', stopResizing);
        document.removeEventListener('touchmove', resizePanel);
        document.removeEventListener('touchend', stopResizing);
    };
  }, [resizePanel, stopResizing, isMdScreen]);


  if (!geminiService && !chatSession && !localStorage.getItem(LOCAL_STORAGE_DB_KEY)) {
    return ( 
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
            <LoadingIcon className="h-12 w-12 text-green-500 animate-spin mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Cargando Aplicación...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-screen overflow-hidden">
       {showWelcomeBanner && (
            <WelcomeBanner 
                isVoiceModeActive={isInteractiveVoiceMode}
                onToggleVoiceMode={() => {
                    const newMode = !isInteractiveVoiceMode;
                    toggleInteractiveVoiceMode(newMode);
                    if (chatSession && geminiService) { 
                        addMessageToChat(`Modo voz interactiva ${newMode ? 'activado' : 'desactivado'}.`, 'ai');
                        if(isInteractiveVoiceMode) speakText(`Modo voz interactiva ${newMode ? 'activado' : 'desactivado'}.`);
                    }
                }}
                onDismiss={() => setShowWelcomeBanner(false)}
            />
        )}
      <TopBar
        ref={topBarRef}
        onFileUpload={handleFileUpload}
        onFileExport={handleFileExport}
        onExportToCsvs={handleExportToCsvs}
        entityTypes={ALL_ENTITY_TYPES}
        currentTheme={theme}
        onToggleTheme={toggleTheme}
        isInteractiveVoiceMode={isInteractiveVoiceMode}
        onToggleInteractiveVoiceMode={() => {
          const newMode = !isInteractiveVoiceMode;
          toggleInteractiveVoiceMode(newMode);
          if (chatSession && geminiService) {
            addMessageToChat(`Modo voz interactiva ${newMode ? 'activado' : 'desactivado'}.`, 'ai');
            if(isInteractiveVoiceMode) speakText(`Modo voz interactiva ${newMode ? 'activado' : 'desactivado'}.`);
          }
        }}
        onMultipleFileUploadRequest={handleMultipleFileUploadRequest}
        onDeleteDatabaseRequest={handleRequestDeleteDb}
        onSaveChatHistory={handleSaveChatHistory}
        onLoadChatHistoryFile={handleLoadChatHistoryFile}
        pendingOfflineRequestCount={offlineRequestQueue.filter(r => r.status === 'pending' || r.status === 'processing').length}
      />
      
      <div ref={resizableContainerRef} className={`flex-grow flex ${!isMdScreen ? 'flex-col' : 'flex-row'} overflow-hidden min-h-0`}>
        <div 
            className={`${isMdScreen ? 'overflow-hidden' : 'h-3/5 pb-1'} flex flex-col bg-transition`}
            style={isMdScreen ? { width: `${chatPanelWidthPercent}%` } : {}}
        >
            <ChatPanel
                ref={chatPanelRef}
                messages={chatMessages}
                onSendMessage={sendMessageToAI}
                isLoading={isLoading || processingRequestIdRef.current !== null}
                currentDb={database}
                onBeforeStartRecording={handleBeforeStartRecording}
                onViewFullScreen={handleOpenFullScreenDataModal}
            />
        </div>

        {isMdScreen && (
            <div 
                className="w-2 cursor-col-resize bg-gray-300 dark:bg-gray-700 hover:bg-green-500 dark:hover:bg-green-600 transition-colors duration-150 ease-in-out flex-shrink-0"
                onMouseDown={startResizing}
                onTouchStart={startResizing}
                role="separator"
                aria-label="Redimensionar paneles"
            />
        )}
        
        <div 
            className={`${isMdScreen ? 'overflow-hidden' : 'h-2/5 pt-1'} flex flex-col bg-transition`}
            style={isMdScreen ? { width: `${100 - chatPanelWidthPercent - (SPLITTER_WIDTH_PX / (resizableContainerRef.current?.offsetWidth || 1) * 100)}%` } : {}}
        >
            <DataPanel 
                database={database} 
                groupedResults={currentGroupedResults}
                onViewFullScreen={handleOpenFullScreenDataModal}
            />
        </div>
      </div>

      {isMultiCsvModalOpen && (
        <MultipleCsvUploadModal
          files={filesForMultiUpload}
          onClose={() => setIsMultiCsvModalOpen(false)}
          onSubmit={handleProcessMultipleCsvs}
          entityTypes={ALL_ENTITY_TYPES}
        />
      )}
      {showDeleteDbConfirm && (
        <ConfirmModal
          isOpen={showDeleteDbConfirm}
          title="Confirmar Borrado de Base de Datos"
          message={
            <>
                <p className="mb-2">¿Estás seguro de que quieres borrar TODA la base de datos local?</p>
                <p className="font-semibold text-red-500">Esta acción es irreversible y eliminará todos los clientes, campos, tareas y demás registros.</p>
                <p className="mt-2">Se recomienda <strong className="text-yellow-500">Guardar BD</strong> como respaldo antes de continuar.</p>
            </>
          }
          onConfirm={handleConfirmDeleteDb}
          onCancel={handleCancelDeleteDb}
          confirmText="Sí, Borrar Todo"
          cancelText="No, Cancelar"
        />
      )}
       {isFullScreenDataModalOpen && fullScreenDataModalContent && (
        <FullScreenDataViewModal
          isOpen={isFullScreenDataModalOpen}
          onClose={handleCloseFullScreenDataModal}
          title={fullScreenDataModalContent.title}
          items={fullScreenDataModalContent.items}
          entityTypeForHeaders={fullScreenDataModalContent.entityType}
        />
      )}
    </div>
  );
};

export default App;
