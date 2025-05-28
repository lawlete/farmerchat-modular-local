
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

  const addMessageToChat = useCallback((text: string, sender: ChatMessage['sender'], isError: boolean = false, groupedData?: GroupedResult[], rawLLMResponse?: string, relatedOfflineRequestId?: string) => {
    const newMessage: ChatMessage = { id: generateUUID(), text, sender, timestamp: new Date(), isError, groupedData, rawLLMResponse, isLoading: sender === 'ai' && !text, relatedOfflineRequestId };
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
        text.includes("ubicación seleccionada") // For File System Access API save
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
  
  const processSpeechQueue = () => {
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
  };

  const speakText = (text: string, onEndCallback?: () => void) => {
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
  };

  const speakGroupedResults = (results: GroupedResult[], onAllSpoken?: () => void) => {
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
  };


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

    addMessageToChat(messageForUser, 'ai', false, groupedData, rawResponse, relatedOfflineRequestId);
    if (isInteractiveVoiceMode) {
      speakText(messageForUser, () => {
        if (groupedData && groupedData.length > 0) {
            speakGroupedResults(groupedData);
        }
      });
    }


    setCurrentGroupedResults(groupedData || null);
    if (groupedData && isFullScreenDataModalOpen && 
        JSON.stringify(fullScreenDataModalContent?.items) !== JSON.stringify(groupedData[0]?.items)) {
      handleCloseFullScreenDataModal();
    }


    switch (action) {
      case 'CREATE_ENTITY':
        if (entity && data && !Array.isArray(data)) {
          const newId = data.id || generateUUID(); 
          const newItem = { ...data, id: newId };

          setDatabase(prevDb => {
            const currentEntityArray = prevDb[entity] || [];
            const updatedEntityArray = [...currentEntityArray, newItem];
            let updatedDb = { ...prevDb, [entity]: updatedEntityArray };
            
            if (entity === 'tasks' && (newItem.machineryIds || newItem.personnelIds || newItem.productInsumeDetails)) {
                const newLinks: Partial<Database> = {
                    taskMachineryLinks: [...(updatedDb.taskMachineryLinks || [])],
                    taskPersonnelLinks: [...(updatedDb.taskPersonnelLinks || [])],
                    taskInsumeLinks: [...(updatedDb.taskInsumeLinks || [])]
                };
                (newItem.machineryIds as string[] | undefined)?.forEach(machId => {
                    newLinks.taskMachineryLinks!.push({ id: generateUUID(), taskId: newId, machineryId: machId });
                });
                (newItem.personnelIds as string[] | undefined)?.forEach(persId => {
                     newLinks.taskPersonnelLinks!.push({ id: generateUUID(), taskId: newId, personnelId: persId });
                });
                (newItem.productInsumeDetails as {id: string, quantityUsed: number, unitUsed: string}[] | undefined)?.forEach(insumeDetail => {
                    newLinks.taskInsumeLinks!.push({
                        id: generateUUID(), taskId: newId, productInsumeId: insumeDetail.id,
                        quantityUsed: insumeDetail.quantityUsed, unitUsed: insumeDetail.unitUsed
                    });
                });
                updatedDb = {...updatedDb, ...newLinks};
            }
            localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(updatedDb));
            return updatedDb;
          });
          
          if (followUpAction) {
            setTimeout(() => {
                handleLLMAction(followUpAction, relatedOfflineRequestId);
            }, 100); 
          }

        } else {
          addMessageToChat(`Error de IA: Datos inválidos para crear entidad ${entity}.`, 'system', true, undefined, undefined, relatedOfflineRequestId);
        }
        break;
      
      case 'UPDATE_ENTITY':
        if (entity && query && data) {
          setDatabase(prevDb => {
            const items = prevDb[entity] || [];
            const queryKeys = Object.keys(query);
            const updatedItems = items.map(item => {
              const match = queryKeys.every(key => item[key] === query[key]);
              return match ? { ...item, ...data } : item;
            });
            const updatedDb = { ...prevDb, [entity]: updatedItems };
            localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(updatedDb));
            return updatedDb;
          });
        }
        break;

      case 'DELETE_ENTITY':
        if (entity && query) {
           setDatabase(prevDb => {
            const items = prevDb[entity] || [];
            const queryKeys = Object.keys(query);
            const updatedItems = items.filter(item => {
              return !queryKeys.every(key => item[key] === query[key]);
            });
            const updatedDb = { ...prevDb, [entity]: updatedItems };
            localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(updatedDb));
            return updatedDb;
          });
        }
        break;

      case 'LIST_ENTITIES':
      case 'GROUPED_QUERY':
          const resultsWithEntityType = (actionResponse.groupedData || []).map(group => ({
              ...group,
              entityType: group.entityType || entity 
          }));
          setCurrentGroupedResults(resultsWithEntityType);
  
          if (action === 'LIST_ENTITIES' && actionResponse.data && Array.isArray(actionResponse.data) && (!resultsWithEntityType || resultsWithEntityType.length === 0)) {
               const inferredEntityType = entity;
               setCurrentGroupedResults([{ 
                   groupTitle: `Listado: ${ENTITY_DISPLAY_NAMES[inferredEntityType!] || inferredEntityType}`, 
                   items: actionResponse.data, 
                   count: actionResponse.data.length,
                   entityType: inferredEntityType
               }]);
          }
          break;
        
      case 'PROMPT_CREATE_MISSING_ENTITY':
        break;

      case 'ANSWER_QUERY':
      case 'HELP':
      case 'ERROR':
      case 'PROPOSE_OPTIONS':
      case 'CONFIRM_CREATION':
        break;

      case 'TOGGLE_VOICE_MODE':
        if (data && typeof (data as {enable?: boolean}).enable === 'boolean') {
          const shouldEnable = (data as {enable: boolean}).enable;
          toggleInteractiveVoiceMode(shouldEnable);
        }
        break;

      default:
        console.warn("Unknown LLM action:", action);
        addMessageToChat(`Acción desconocida recibida de la IA: ${action}`, 'system', true, undefined, undefined, relatedOfflineRequestId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addMessageToChat, isInteractiveVoiceMode, speakText, speakGroupedResults, isFullScreenDataModalOpen, fullScreenDataModalContent]);


  const sendMessageToAI = async (messageText: string, audioBase64?: string, audioMimeType?: string, originalUserMessageId?: string) => {
    if (showWelcomeBanner) setShowWelcomeBanner(false); 

    if (!geminiService || !chatSession) {
      addMessageToChat("El servicio de IA no está disponible. Revisa la configuración. Puedes guardar tu historial de chat actual.", 'system', true);
      if (isInteractiveVoiceMode) speakText("El servicio de IA no está disponible. Revisa la configuración. Puedes guardar tu historial de chat actual.");
      return;
    }
    
    // If it's not a retry, add the user message. Retries will have specific system messages.
    if(!originalUserMessageId) { // originalUserMessageId implies it's a retry from queue.
        const userMsgId = generateUUID();
        addMessageToChat(messageText, 'user', false, undefined, undefined, userMsgId);
        // Placeholder for the actual ID that will be used if this msg is queued
        originalUserMessageId = userMsgId; 
    }


    setIsLoading(true); // Global loading for direct attempt
    const loadingAiMessageId = generateUUID();
    setChatMessages(prev => {
        const newMessages = [...prev];
        const loadingAiMessage: ChatMessage = { 
            id: loadingAiMessageId, 
            text: 'Procesando...', 
            sender: 'ai', 
            timestamp: new Date(), 
            isLoading: true 
        };
        return [...newMessages, loadingAiMessage];
    });


    const currentDBStateString = JSON.stringify(database);
    const parts: Part[] = [
        { text: `Contexto de Base de Datos (NO MOSTRAR AL USUARIO, USAR PARA REFERENCIA INTERNA):\n${currentDBStateString}\n\nHistorial de Conversación Reciente (últimos mensajes, para referencia contextual, NO MOSTRAR AL USUARIO):\n${chatMessages.slice(-6).map(m => `${m.sender}: ${m.text}`).join('\n')}\n\nComando del Usuario:` },
    ];
    
    if (audioBase64 && audioMimeType) {
        parts.push({ inlineData: { data: audioBase64, mimeType: audioMimeType } });
        if (messageText === "Comando de voz grabado (procesando...)") {
          // Don't add empty text part.
        } else {
           parts.push({ text: messageText }); 
        }
    } else {
        parts.push({ text: messageText });
    }
    
    try {
      const response: GenerateContentResponse = await chatSession.sendMessage({ message: parts });

      setIsLoading(false);
      setChatMessages(prev => prev.filter(msg => msg.id !== loadingAiMessageId));

      const llmResponseText = response.text;
      const actionResponse = parseLLMResponse(llmResponseText);

      if (actionResponse) {
        handleLLMAction({ ...actionResponse, rawResponse: llmResponseText });
      } else {
        addMessageToChat(
          `IA (respuesta no estructurada): ${llmResponseText}`,
          'ai',
          false,
          undefined,
          llmResponseText
        );
        if (isInteractiveVoiceMode) speakText(llmResponseText);
      }
    } catch (error) {
      console.error("Error sending message to Gemini:", error);
      setIsLoading(false); // Stop global loading if direct attempt fails
      setChatMessages(prev => prev.filter(msg => msg.id !== loadingAiMessageId));

      const classified = classifyError(error);
      const requestPayload: OfflineRequestPayload = { messageText, audioBase64, audioMimeType };

      if (isQueuableError(classified.type) && chatSession) {
        const queuedRequest = addRequestToQueueUtil(requestPayload, classified.type, classified.message, setOfflineRequestQueue);
        queuedRequest.originalMessageId = originalUserMessageId; // Link the queued request to the original user message
        setOfflineRequestQueue(prev => prev.map(r => r.id === queuedRequest.id ? queuedRequest : r)); // Save updated queue

        addMessageToChat(
          `⚠️ Tu mensaje "${messageText.substring(0,30)}..." fue ENCOLADO. Razón: ${classified.message}. Se reintentará automáticamente.`,
          'system',
          true,
          undefined,
          undefined,
          queuedRequest.id 
        );
        if (isInteractiveVoiceMode) speakText(`Tu mensaje fue encolado debido a: ${classified.message}. Se reintentará automáticamente.`);
      } else {
        let userErrorMessage = `Error al comunicarse con la IA: ${classified.message}.`;
         if (classified.type === 'API_KEY_INVALID') {
            userErrorMessage = `Error de Configuración (API Key): ${classified.message}. Por favor, contacte al administrador.`;
        } else if (!chatSession) {
            userErrorMessage = "Error: La sesión de chat con la IA no está inicializada. Intenta recargar la aplicación.";
        }
        addMessageToChat(userErrorMessage, 'system', true);
        if (isInteractiveVoiceMode) speakText(userErrorMessage);
      }
    }
  };
  
  const processQueue = useCallback(async () => {
    if (processingRequestIdRef.current) return;

    const currentQueue = offlineRequestQueueRef.current;
    const requestToProcess = currentQueue.find(req => req.status === 'pending');

    if (!requestToProcess) {
      return;
    }

    if (!navigator.onLine) {
      // Log locally or briefly mention if needed, but primary feedback is via online/offline events
      console.log("Offline queue processing paused: No internet connection.");
      return;
    }
    if (!chatSession) {
      addMessageToChat("Intentando procesar cola, pero la sesión de IA no está lista.", "system", true, undefined, undefined, requestToProcess.id);
      return;
    }

    processingRequestIdRef.current = requestToProcess.id;
    
    setOfflineRequestQueue(prev => prev.map(r => r.id === requestToProcess.id ? {...r, status: 'processing', lastAttemptTimestamp: new Date()} : r));
    
    addMessageToChat(`🔄 Intentando procesar solicitud encolada: "${requestToProcess.payload.messageText.substring(0, 30)}..." (Intento ${requestToProcess.attempts + 1})`, 'system', false, undefined, undefined, requestToProcess.id);
    if (isInteractiveVoiceMode) speakText(`Intentando procesar una solicitud encolada.`);

    await attemptProcessRequestUtil(
      requestToProcess,
      chatSession,
      database,
      chatMessages, // Pass current chat messages
      (requestId, responseText, llmResponseObject) => { // onSuccess
        addMessageToChat(`✅ Solicitud encolada "${requestToProcess.payload.messageText.substring(0,30)}..." procesada con éxito.`, 'system', false, undefined, undefined, requestId);
        if (isInteractiveVoiceMode) speakText(`Solicitud encolada procesada con éxito.`);
        
        const actionResponse = parseLLMResponse(responseText);
        if (actionResponse) {
          handleLLMAction({ ...actionResponse, rawResponse: responseText }, requestId);
        } else {
          addMessageToChat(`IA (respuesta de cola): ${responseText}`, 'ai', false, undefined, responseText, requestId);
          if (isInteractiveVoiceMode) speakText(responseText);
        }

        setOfflineRequestQueue(prev => prev.map(r => r.id === requestId ? {...r, status: 'processed'} : r));
        processingRequestIdRef.current = null;
        setTimeout(processQueue, 1000); // Check for next
      },
      (requestId, errorInfo) => { // onFailure (retryable)
        const req = offlineRequestQueueRef.current.find(r => r.id === requestId);
        const currentAttempts = req ? req.attempts : requestToProcess.attempts; // Use fresh attempt count
        const nextAttemptDelay = Math.min(INITIAL_RETRY_DELAY_MS * Math.pow(2, currentAttempts + 1), MAX_RETRY_DELAY_MS);
        
        addMessageToChat(
          `⚠️ Falló el reintento para "${requestToProcess.payload.messageText.substring(0,30)}...". Razón: ${errorInfo.message}. Se reintentará en ${Math.round(nextAttemptDelay/1000)}s. (Intento ${currentAttempts + 1}/${MAX_OFFLINE_REQUEST_ATTEMPTS})`,
          'system', true, undefined, undefined, requestId
        );
        if (isInteractiveVoiceMode) speakText(`Falló el reintento. Se intentará más tarde.`);

        setOfflineRequestQueue(prev => prev.map(r => r.id === requestId ? {
            ...r,
            status: 'pending',
            attempts: r.attempts + 1,
            errorInfo: {
                type: errorInfo.type,
                message: errorInfo.message,
                history: [...(r.errorInfo?.history || []), {timestamp: new Date(), type: errorInfo.type, message: errorInfo.message}]
            }
        } : r));
        processingRequestIdRef.current = null;
        // Rely on interval for next attempt with implicit backoff due to not processing immediately
      },
      (requestId, errorInfo) => { // onPermanentFailure
         addMessageToChat(
          `❌ Falló permanentemente la solicitud encolada "${requestToProcess.payload.messageText.substring(0,30)}..." después de ${MAX_OFFLINE_REQUEST_ATTEMPTS} intentos. Error final: ${errorInfo.message}`,
          'system', true, undefined, undefined, requestId
        );
        if (isInteractiveVoiceMode) speakText(`Una solicitud encolada falló permanentemente.`);

        setOfflineRequestQueue(prev => prev.map(r => r.id === requestId ? {
            ...r,
            status: 'failed',
            errorInfo: {
                type: errorInfo.type,
                message: errorInfo.message,
                history: [...(r.errorInfo?.history || []), {timestamp: new Date(), type: errorInfo.type, message: errorInfo.message}]
            }
        } : r));
        processingRequestIdRef.current = null;
        setTimeout(processQueue, 1000); // Check for next
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSession, database, chatMessages, isInteractiveVoiceMode, addMessageToChat, handleLLMAction, parseLLMResponse]); 


  useEffect(() => {
    const loadedQueue = getOfflineQueueFromStorage();
    setOfflineRequestQueue(loadedQueue);
    offlineRequestQueueRef.current = loadedQueue;

    const handleOnline = () => {
      addMessageToChat("Conexión a internet restablecida. Intentando procesar solicitudes pendientes...", "system");
      if (offlineRequestQueueRef.current.some(req => req.status === 'pending')) {
          processQueue();
      }
    };
    const handleOffline = () => {
      addMessageToChat("Se ha perdido la conexión a internet. Las nuevas solicitudes se guardarán para procesar más tarde.", "system", true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (navigator.onLine && loadedQueue.some(req => req.status === 'pending')) {
        addMessageToChat("Detectadas solicitudes pendientes. Intentando procesar...", "system");
        processQueue();
    }

    const intervalId = setInterval(() => {
      if (navigator.onLine && offlineRequestQueueRef.current.some(req => req.status === 'pending' && !processingRequestIdRef.current)) {
          processQueue();
      }
    }, OFFLINE_PROCESSING_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processQueue]); // processQueue is now a dependency


  const startResizing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isMdScreen) return; 
    e.preventDefault();
    setIsResizing(true);
  }, [isMdScreen]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resizePanel = useCallback((e: MouseEvent | TouchEvent) => {
    if (isResizing && resizableContainerRef.current && isMdScreen) {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const containerRect = resizableContainerRef.current.getBoundingClientRect();
      const newChatPanelWidth = clientX - containerRect.left;
      let newChatPanelWidthPercent = (newChatPanelWidth / containerRect.width) * 100;
      
      newChatPanelWidthPercent = Math.max(25, Math.min(newChatPanelWidthPercent, 75));
      
      setChatPanelWidthPercent(newChatPanelWidthPercent);
    }
  }, [isResizing, isMdScreen]);

  useEffect(() => {
    if (isMdScreen) {
        window.addEventListener('mousemove', resizePanel as EventListener);
        window.addEventListener('touchmove', resizePanel as EventListener);
        window.addEventListener('mouseup', stopResizing);
        window.addEventListener('touchend', stopResizing);
    }
    return () => {
      if (isMdScreen) {
        window.removeEventListener('mousemove', resizePanel as EventListener);
        window.removeEventListener('touchmove', resizePanel as EventListener);
        window.removeEventListener('mouseup', stopResizing);
        window.removeEventListener('touchend', stopResizing);
      }
    };
  }, [resizePanel, stopResizing, isMdScreen]);


  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {showWelcomeBanner && (
        <WelcomeBanner
          isVoiceModeActive={isInteractiveVoiceMode}
          onToggleVoiceMode={() => {
            const newMode = !isInteractiveVoiceMode;
            toggleInteractiveVoiceMode(newMode);
            addMessageToChat(
              `Modo Voz Interactiva ${newMode ? 'Activado' : 'Desactivado'}.`,
              'system'
            );
          }}
          onDismiss={() => setShowWelcomeBanner(false)} 
        />
      )}
      {!showWelcomeBanner && (
        <>
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
                addMessageToChat( 
                    `Modo Voz Interactiva ${newMode ? 'Activado' : 'Desactivado'}.`,
                    'system'
                );
            }}
            onMultipleFileUploadRequest={handleMultipleFileUploadRequest}
            onDeleteDatabaseRequest={handleRequestDeleteDb}
            onSaveChatHistory={handleSaveChatHistory}
            onLoadChatHistoryFile={handleLoadChatHistoryFile}
            pendingOfflineRequestCount={offlineRequestQueue.filter(r => r.status === 'pending').length}
          />
          <div ref={resizableContainerRef} className="flex-1 flex flex-col md:flex-row min-h-0">
            {isMdScreen ? (
              <>
                <div style={{ width: `${chatPanelWidthPercent}%` }} className="h-1/2 md:h-full md:min-w-[300px] md:max-w-[calc(100%-300px)]">
                  <ChatPanel
                    ref={chatPanelRef}
                    messages={chatMessages}
                    onSendMessage={sendMessageToAI}
                    isLoading={isLoading}
                    currentDb={database}
                    onBeforeStartRecording={handleBeforeStartRecording}
                    onViewFullScreen={handleOpenFullScreenDataModal}
                  />
                </div>
                <div
                  className="w-full md:w-auto h-[8px] md:h-full md:w-[8px] bg-gray-300 dark:bg-gray-700 cursor-col-resize flex-shrink-0 hover:bg-green-500 dark:hover:bg-green-600 transition-colors"
                  onMouseDown={startResizing}
                  onTouchStart={startResizing}
                  role="separator"
                  aria-label="Resize panels"
                />
                <div style={{ width: `${100 - chatPanelWidthPercent}%`}} className="h-1/2 md:h-full md:min-w-[300px] md:max-w-[calc(100%-300px)]">
                  <DataPanel 
                    database={database} 
                    groupedResults={currentGroupedResults} 
                    onViewFullScreen={handleOpenFullScreenDataModal}
                  />
                </div>
              </>
            ) : (
              chatPanelWidthPercent > 0 ? ( 
                 <div className="h-full w-full">
                    <ChatPanel
                        ref={chatPanelRef}
                        messages={chatMessages}
                        onSendMessage={sendMessageToAI}
                        isLoading={isLoading}
                        currentDb={database}
                        onBeforeStartRecording={handleBeforeStartRecording}
                        onViewFullScreen={handleOpenFullScreenDataModal}
                    />
                 </div>
              ) : (
                <div className="h-full w-full">
                    <DataPanel 
                        database={database} 
                        groupedResults={currentGroupedResults} 
                        onViewFullScreen={handleOpenFullScreenDataModal}
                    />
                </div>
              )
            )}
          </div>
        </>
      )}
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
              <p className="mb-2">Está a punto de borrar COMPLETAMENTE la base de datos actual de la aplicación.</p>
              <p className="mb-2 font-semibold text-red-600 dark:text-red-400">¡TODOS LOS DATOS almacenados en la aplicación y en su navegador SE PERDERÁN PERMANENTEMENTE!</p>
              <p>Esta acción no se puede deshacer. Asegúrese de haber respaldado sus datos si son importantes (botón 'Exportar BD').</p>
              <p className="mt-3">¿Está seguro de que desea borrar toda la base de datos?</p>
            </>
          }
          onConfirm={handleConfirmDeleteDb}
          onCancel={handleCancelDeleteDb}
          confirmText="Sí, Borrar Todo"
          cancelText="Cancelar"
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
