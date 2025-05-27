
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TopBar, TopBarHandles } from './components/TopBar';
import { ChatPanel, ChatPanelHandles } from './components/ChatPanel';
import { DataPanel } from './components/DataPanel';
import { Database, ChatMessage, LLMResponseAction, EntityType, GroupedResult, ALL_ENTITY_TYPES } from './types';
import { LOCAL_STORAGE_DB_KEY, INITIAL_DB, SYSTEM_PROMPT_HEADER, ENTITY_DISPLAY_NAMES, GEMINI_MODEL_TEXT } from './constants';
import { GoogleGenAI, Chat, GenerateContentResponse, Part } from "@google/genai";
import { processCsvData, generateUUID, convertEntityArrayToCsvString } from './services/dbService';
import { MultipleCsvUploadModal } from './components/MultipleCsvUploadModal';
import { ConfirmModal } from './components/ConfirmModal';
import { WelcomeBanner } from './components/WelcomeBanner'; 

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

  const addMessageToChat = useCallback((text: string, sender: ChatMessage['sender'], isError: boolean = false, groupedData?: GroupedResult[], rawLLMResponse?: string) => {
    const newMessage: ChatMessage = { id: generateUUID(), text, sender, timestamp: new Date(), isError, groupedData, rawLLMResponse, isLoading: sender === 'ai' && !text };
    setChatMessages(prev => [...prev, newMessage]);
    
    if (groupedData) {
      setCurrentGroupedResults(groupedData);
    } else if (sender === 'user') { 
      setCurrentGroupedResults(null);
    }

    if (sender === 'system' && isInteractiveVoiceMode && text && !isError) {
        speakText(text);
    }
    
    const isInitialSystemMessage = sender === 'system' && (
        text.startsWith('Cargando base de datos') ||
        text.startsWith('Base de datos de prueba cargada') || 
        text.startsWith('Se corrigió la estructura') ||
        text.startsWith('Base de datos borrada exitosamente') ||
        text.startsWith('Si necesita una base de datos de prueba')
    );
    if (!isInitialSystemMessage && showWelcomeBanner) {
        setShowWelcomeBanner(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInteractiveVoiceMode, showWelcomeBanner]); 

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
      
      const message = isAutoLoad ? 'Base de datos local no encontrada o inválida, se cargó la BD de prueba.' : 'Base de datos de prueba cargada exitosamente.';
      addMessageToChat(message, 'system');
    } catch (error) {
      console.error("Error cargando la base de datos de prueba:", error);
      addMessageToChat(`Error al cargar la base de datos de prueba: ${(error as Error).message}`, 'system', true);
    }
  }, [addMessageToChat]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  const handleRequestDeleteDb = () => {
    setShowDeleteDbConfirm(true);
  };

  const handleConfirmDeleteDb = () => {
    setDatabase(INITIAL_DB);
    localStorage.removeItem(LOCAL_STORAGE_DB_KEY);
    setCurrentGroupedResults(null);
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
            const aiSpeakingKeywords = ["¿qué más puedo hacer por ti?", "¿en qué más te puedo ayudar?", "¿algo más?", "sugerencias", "¿es correcto?", "¿quieres ver más?", "activado."];
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
          const itemName = item.name || item.taskName || item.id || "Elemento";
          let details = `${itemName}. `;
          if(item.type) details += `Tipo: ${item.type}. `;
          if(item.status) details += `Estado: ${item.status}. `;
          if(item.description) details += `Descripción: ${item.description.substring(0, 50)}. `;
          if(item.additionalInfo) details += `Info adicional: ${item.additionalInfo.substring(0, 50)}. `;
          fullTextToSpeak += details;
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
    let envApiKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_KEY : undefined;

    if (!envApiKey) {
      envApiKey = process.env.API_KEY;
    }

    if (!envApiKey || envApiKey === "YOUR_GEMINI_API_KEY_PLACEHOLDER" || envApiKey === "AQUI_VA_TU_CLAVE_API_DE_GEMINI") {
      console.error("API Key for Gemini is missing or is a placeholder. Please set VITE_API_KEY in your .env file.");
      addMessageToChat(
        "Error de Configuración: La clave API para Gemini no está configurada. La funcionalidad de IA no estará disponible. Por favor, contacte al administrador.",
        "system",
        true
      );
      setIsLoading(false);
      return;
    }
    
    try {
      const genAI = new GoogleGenAI({ apiKey: envApiKey });
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
        addMessageToChat(`Error al inicializar el servicio de IA: ${(error as Error).message}`, 'system', true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

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
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
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

  const handleLLMAction = (actionResponse: LLMResponseAction) => {
    const { action, entity, data, query, messageForUser, groupedData, rawResponse } = actionResponse;

    addMessageToChat(messageForUser, 'ai', false, groupedData, rawResponse);
    if (isInteractiveVoiceMode) {
      if (groupedData && groupedData.length > 0) {
        speakGroupedResults(groupedData, () => {
           if (!messageForUser.toLowerCase().includes("¿es correcto?") && !messageForUser.toLowerCase().includes("sugerencias")) {
             speakText(messageForUser);
           }
        });
      } else {
        speakText(messageForUser);
      }
    }


    setCurrentGroupedResults(groupedData || null);

    switch (action) {
      case 'CREATE_ENTITY':
        if (entity && data && !Array.isArray(data)) {
          const newId = data.id || generateUUID(); 
          const newItem = { ...data, id: newId };

          setDatabase(prevDb => {
            const currentEntityArray = prevDb[entity] || [];
            const updatedEntityArray = [...currentEntityArray, newItem];
            const updatedDb = { ...prevDb, [entity]: updatedEntityArray };
            localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(updatedDb));

            if (entity === 'tasks' && (newItem.machineryIds || newItem.personnelIds || newItem.productInsumeDetails)) {
                const newLinks: Partial<Database> = {
                    taskMachineryLinks: [...(updatedDb.taskMachineryLinks || [])],
                    taskPersonnelLinks: [...(updatedDb.taskPersonnelLinks || [])],
                    taskInsumeLinks: [...(updatedDb.taskInsumeLinks || [])]
                };
                (newItem.machineryIds as string[] | undefined)?.forEach(machId => {
                    newLinks.taskMachineryLinks!.push({
                        id: generateUUID(),
                        taskId: newId,
                        machineryId: machId,
                    });
                });
                (newItem.personnelIds as string[] | undefined)?.forEach(persId => {
                     newLinks.taskPersonnelLinks!.push({
                        id: generateUUID(),
                        taskId: newId,
                        personnelId: persId,
                    });
                });
                (newItem.productInsumeDetails as {id: string, quantityUsed: number, unitUsed: string}[] | undefined)?.forEach(insumeDetail => {
                    newLinks.taskInsumeLinks!.push({
                        id: generateUUID(),
                        taskId: newId,
                        productInsumeId: insumeDetail.id,
                        quantityUsed: insumeDetail.quantityUsed,
                        unitUsed: insumeDetail.unitUsed,
                    });
                });
                
                const finalDb = {...updatedDb, ...newLinks};
                localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(finalDb));
                return finalDb;
            }
            return updatedDb;
          });
        } else {
          addMessageToChat(`Error de IA: Datos inválidos para crear entidad ${entity}.`, 'system', true);
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
        if (actionResponse.data && Array.isArray(actionResponse.data) && (!groupedData || groupedData.length === 0)) {
             setCurrentGroupedResults([{ groupTitle: `Listado: ${ENTITY_DISPLAY_NAMES[entity!] || entity}`, items: actionResponse.data, count: actionResponse.data.length }]);
        }
        break;

      case 'GROUPED_QUERY':
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
        addMessageToChat(`Acción desconocida recibida de la IA: ${action}`, 'system', true);
    }
  };


  const sendMessageToAI = async (messageText: string, audioBase64?: string, audioMimeType?: string) => {
    if (showWelcomeBanner) setShowWelcomeBanner(false); 

    if (!geminiService || !chatSession) {
      addMessageToChat("El servicio de IA no está disponible. Revisa la configuración.", 'system', true);
      return;
    }

    addMessageToChat(messageText, 'user');
    setIsLoading(true);
    
    setChatMessages(prev => {
        const newMessages = [...prev];
        const loadingAiMessage: ChatMessage = { 
            id: generateUUID(), 
            text: 'Procesando...', 
            sender: 'ai', 
            timestamp: new Date(), 
            isLoading: true 
        };
        return [...newMessages, loadingAiMessage];
    });


    const currentDBStateString = JSON.stringify(database);
    const parts: Part[] = [
        { text: `Contexto de Base de Datos (NO MOSTRAR AL USUARIO, USAR PARA REFERENCIA INTERNA):\n${currentDBStateString}\n\nComando del Usuario:` },
    ];
    
    if (audioBase64 && audioMimeType) {
        parts.push({ inlineData: { data: audioBase64, mimeType: audioMimeType } });
        if (messageText === "Comando de voz grabado (procesando...)") {
          // If it's only audio, don't add empty text part.
        } else {
           parts.push({ text: messageText }); 
        }
    } else {
        parts.push({ text: messageText });
    }
    
    try {
      const response: GenerateContentResponse = await chatSession.sendMessage({ message: parts });
      setIsLoading(false);
      setChatMessages(prev => prev.filter(msg => !(msg.sender === 'ai' && msg.isLoading)));


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
      setIsLoading(false);
      setChatMessages(prev => prev.filter(msg => !(msg.sender === 'ai' && msg.isLoading)));
      
      let errorMessage = `Error al comunicarse con la IA: ${(error as Error).message}`;
      if ((error as any).message?.includes('API key not valid')) {
          errorMessage = "Error de API Key: La clave proporcionada no es válida. Por favor, verifique la configuración.";
      } else if ((error as any).message?.includes('quota')) {
          errorMessage = "Error de Cuota: Se ha excedido la cuota de la API. Intente más tarde.";
      }
      
      addMessageToChat(errorMessage, 'system', true);
      if (isInteractiveVoiceMode) speakText(errorMessage);
    }
  };

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
                  />
                </div>
                <div
                  className="w-full md:w-auto h-[${SPLITTER_WIDTH_PX}px] md:h-full md:w-[${SPLITTER_WIDTH_PX}px] bg-gray-300 dark:bg-gray-700 cursor-col-resize flex-shrink-0 hover:bg-green-500 dark:hover:bg-green-600 transition-colors"
                  onMouseDown={startResizing}
                  onTouchStart={startResizing}
                  role="separator"
                  aria-label="Resize panels"
                />
                <div style={{ width: `${100 - chatPanelWidthPercent}%`}} className="h-1/2 md:h-full md:min-w-[300px] md:max-w-[calc(100%-300px)]">
                  <DataPanel database={database} groupedResults={currentGroupedResults} />
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
                    />
                 </div>
              ) : (
                <div className="h-full w-full">
                    <DataPanel database={database} groupedResults={currentGroupedResults} />
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
    </div>
  );
};

export default App;
