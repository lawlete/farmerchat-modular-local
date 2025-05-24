
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TopBar, TopBarHandles } from './components/TopBar';
import { ChatPanel, ChatPanelHandles } from './components/ChatPanel';
import { DataPanel } from './components/DataPanel';
import { Database, ChatMessage, LLMResponseAction, EntityType, GroupedResult, ALL_ENTITY_TYPES, TaskMachineryLink, TaskPersonnelLink, TaskInsumeLink, Task } from './types';
import { LOCAL_STORAGE_DB_KEY, INITIAL_DB, SYSTEM_PROMPT_HEADER, ENTITY_DISPLAY_NAMES, GEMINI_MODEL_TEXT, CSV_HEADERS } from './constants';
import { GoogleGenAI, Chat, GenerateContentResponse, Part } from "@google/genai";
import { processCsvData, generateUUID, convertEntityArrayToCsvString } from './services/dbService';
import { MultipleCsvUploadModal } from './components/MultipleCsvUploadModal';

export type Theme = 'light' | 'dark';

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
      document.documentElement.classList.add('dark'); // Default to dark
    }
  }, []);

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
      if (newMode) {
        if (!prev) addMessageToChat('Modo Voz Interactiva Activado. Las respuestas del AI se leerán en voz alta y el micrófono se activará automáticamente después.', 'system');
      } else {
        if (prev) addMessageToChat('Modo Voz Interactiva Desactivado.', 'system');
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
    }
  };

  const speakText = (text: string, onEndCallback?: () => void) => {
    if (!isInteractiveVoiceMode || !text) {
      if(onEndCallback) onEndCallback();
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
    }
  };


  useEffect(() => {
    const envApiKey = process.env.API_KEY;
    if (!envApiKey || envApiKey === "YOUR_GEMINI_API_KEY_PLACEHOLDER" || envApiKey === "AQUI_VA_TU_CLAVE_API_DE_GEMINI") {
      console.warn("API Key no configurada. Funcionalidad LLM desactivada.");
      addMessageToChat("API Key de Gemini no configurada. Por favor, asegúrese de que la variable de entorno API_KEY esté configurada.", 'system', true);
      setGeminiService(null);
      setChatSession(null);
    } else {
      try {
        const ai = new GoogleGenAI({ apiKey: envApiKey });
        setGeminiService(ai);
        const newChat = ai.chats.create({
          model: GEMINI_MODEL_TEXT,
          config: {
            systemInstruction: SYSTEM_PROMPT_HEADER,
            temperature: 0.5,
            topP: 0.9,
            topK: 40,
          },
        });
        setChatSession(newChat);
      } catch (error) {
        console.error("Error initializing Gemini Service or Chat:", error);
        addMessageToChat(`Error al inicializar el servicio de IA: ${(error as Error).message}`, 'system', true);
        setGeminiService(null);
        setChatSession(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    const storedDB = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
    if (storedDB) {
      try {
        const parsedDB = JSON.parse(storedDB) as Database;
        let isValidDB = true;
        const tempDB: Record<string, any> = {};
        for (const key of ALL_ENTITY_TYPES) {
          if (!Array.isArray(parsedDB[key as EntityType])) {
            isValidDB = false;
            console.warn(`Missing or invalid array for entity ${key}. Reverting for this key.`);
            tempDB[key] = INITIAL_DB[key as EntityType] || [];
          } else {
            tempDB[key] = parsedDB[key as EntityType];
          }
        }
        setDatabase(tempDB as Database);
        if (!isValidDB) {
             localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(tempDB));
        }

      } catch (error) {
        console.error("Error parsing stored DB:", error);
        localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(INITIAL_DB)); 
        setDatabase(INITIAL_DB);
      }
    } else {
        localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(INITIAL_DB));
        setDatabase(INITIAL_DB);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(database));
  }, [database]);

  const addMessageToChat = (text: string, sender: ChatMessage['sender'], isError: boolean = false, groupedData?: GroupedResult[], rawLLMResponse?: string) => {
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
  };

  const processLLMResponse = useCallback((response: LLMResponseAction, onDbUpdated?: () => void) => {
    if (['ERROR', 'HELP', 'ANSWER_QUERY', 'PROPOSE_OPTIONS', 'CONFIRM_CREATION'].includes(response.action)) {
      if (onDbUpdated) onDbUpdated();
      return;
    }
    
    if (response.action === 'TOGGLE_VOICE_MODE') {
      if (response.data && typeof response.data.enable === 'boolean') {
        toggleInteractiveVoiceMode(response.data.enable);
      } else {
        toggleInteractiveVoiceMode(); // Toggle current state if enable not specified
      }
      if (onDbUpdated) onDbUpdated();
      return;
    }

    setDatabase(prevDb => {
      let newDb = { ...prevDb };
      try {
        switch (response.action) {
          case 'CREATE_ENTITY':
            if (response.entity && response.data && newDb[response.entity]) {
              const entityKey = response.entity;
              const entityDataFromLLM = response.data; 
              
              if (!entityDataFromLLM.id) entityDataFromLLM.id = generateUUID();
              
              const currentEntityArray = Array.isArray(newDb[entityKey]) ? newDb[entityKey] : [];
              
              const entityToStore: Record<string, any> = {...entityDataFromLLM};
              if (entityKey === 'tasks') {
                delete entityToStore.machineryIds;
                delete entityToStore.personnelIds;
                delete entityToStore.productInsumeDetails;
              }

              newDb = { ...newDb, [entityKey]: [...currentEntityArray, entityToStore] };

              if (entityKey === 'tasks' && entityDataFromLLM.id) {
                const newTaskId = entityDataFromLLM.id;
                const taskData = entityDataFromLLM as Task & { machineryIds?: string[], personnelIds?: string[], productInsumeDetails?: any[] };

                if (taskData.machineryIds && Array.isArray(taskData.machineryIds)) {
                  const newMachineryLinks: TaskMachineryLink[] = taskData.machineryIds.map((machId: string) => ({
                    id: generateUUID(),
                    taskId: newTaskId,
                    machineryId: machId,
                  }));
                  newDb.taskMachineryLinks = [...(newDb.taskMachineryLinks || []), ...newMachineryLinks];
                }

                if (taskData.personnelIds && Array.isArray(taskData.personnelIds)) {
                  const newPersonnelLinks: TaskPersonnelLink[] = taskData.personnelIds.map((persId: string) => ({
                    id: generateUUID(),
                    taskId: newTaskId,
                    personnelId: persId,
                  }));
                  newDb.taskPersonnelLinks = [...(newDb.taskPersonnelLinks || []), ...newPersonnelLinks];
                }
                
                if (taskData.productInsumeDetails && Array.isArray(taskData.productInsumeDetails)) {
                  const newInsumeLinks: TaskInsumeLink[] = taskData.productInsumeDetails.map((detail: any) => ({
                    id: generateUUID(),
                    taskId: newTaskId,
                    productInsumeId: detail.id,
                    quantityUsed: detail.quantityUsed,
                    unitUsed: detail.unitUsed,
                    applicationDetails: detail.applicationDetails,
                  }));
                  newDb.taskInsumeLinks = [...(newDb.taskInsumeLinks || []), ...newInsumeLinks];
                }
              }
            }
            break;
          case 'UPDATE_ENTITY':
            if (response.entity && response.data && response.query?.id && newDb[response.entity]) {
              const entityKey = response.entity;
              const currentEntityArray = Array.isArray(newDb[entityKey]) ? newDb[entityKey] : [];
              newDb = {
                ...newDb,
                [entityKey]: currentEntityArray.map((item: any) =>
                  item.id === response.query.id ? { ...item, ...response.data } : item
                ),
              };
            }
            break;
          case 'DELETE_ENTITY':
            if (response.entity && response.query?.id && newDb[response.entity]) {
              const entityKey = response.entity;
              const currentEntityArray = Array.isArray(newDb[entityKey]) ? newDb[entityKey] : [];
              newDb = {
                ...newDb,
                [entityKey]: currentEntityArray.filter((item: any) => item.id !== response.query.id),
              };
            }
            break;
          case 'LIST_ENTITIES':
            if(response.data && Array.isArray(response.data)){
               const entityName = response.entity ? ENTITY_DISPLAY_NAMES[response.entity] : "Resultados";
               setCurrentGroupedResults([{ groupTitle: `Listado: ${entityName}`, items: response.data, count: response.data.length }]);
            } else if (response.data && !Array.isArray(response.data)){ 
               const entityName = response.entity ? ENTITY_DISPLAY_NAMES[response.entity] : "Resultado";
               setCurrentGroupedResults([{ groupTitle: `Detalle: ${entityName}`, items: [response.data], count: 1 }]);
            } else { 
               const entityName = response.entity ? ENTITY_DISPLAY_NAMES[response.entity] : "Resultados";
               setCurrentGroupedResults([{ groupTitle: `Listado: ${entityName}`, items: [], count:0 }]);
            }
            break;
          case 'GROUPED_QUERY':
            if (response.groupedData) {
              setCurrentGroupedResults(response.groupedData);
            }
            break;
          default:
            console.warn("Unhandled LLM action:", response.action);
        }
      } catch (error) {
        console.error("Error processing LLM DB action:", error, response);
        setChatMessages(prev => [...prev, { id: generateUUID(), text: `Error interno al procesar la acción en la base de datos: ${(error as Error).message}.`, sender: 'system', timestamp: new Date(), isError: true }]);
        return prevDb; 
      }
      if (onDbUpdated) onDbUpdated();
      return newDb;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleSendMessage = useCallback(async (message: string, audioBase64?: string, audioMimeType?: string) => {
    if (!chatSession) {
      const errorMsg = "Error: Chat no inicializado. Verifica API_KEY.";
      addMessageToChat(errorMsg, 'system', true);
      speakText(errorMsg);
      return;
    }

    const userMessageText = audioBase64 ? "Comando de voz procesado." : message;
    addMessageToChat(userMessageText, 'user');
    
    if (isInteractiveVoiceMode) {
      const speakableUserMessage = audioBase64 ? "Procesando tu comando de voz." : `Has dicho: ${message}`;
      speakText(speakableUserMessage);
    }

    setIsLoading(true);
    const aiMessageId = generateUUID();
    setChatMessages(prev => [...prev, { id: aiMessageId, text: '', sender: 'ai', timestamp: new Date(), isLoading: true }]);

    try {
      const dbContextString = JSON.stringify(database);
      const contextForLLM = `Contexto de la Base de Datos (JSON completo):
\`\`\`json
${dbContextString}
\`\`\`
Fin del Contexto de la Base de Datos.

Comando del usuario: ${message}`;
      
      const messageParts: Part[] = [{ text: contextForLLM }];
      if (audioBase64 && audioMimeType) {
        messageParts.push({
          inlineData: {
            mimeType: audioMimeType,
            data: audioBase64,
          },
        });
      }
      
      const stream = await chatSession.sendMessageStream({ message: messageParts });
      
      let llmResponseText = "";
      for await (const chunk of stream) {
        const chunkText = chunk.text; 
        if (chunkText) {
            llmResponseText += chunkText;
            setChatMessages(prev => prev.map(msg => 
                msg.id === aiMessageId ? {...msg, text: llmResponseText, isLoading: true, isError: false } : msg
            ));
        }
      }

      let parsedResponse: LLMResponseAction;
      try {
        let jsonStr = llmResponseText.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
          jsonStr = match[2].trim();
        }
        parsedResponse = JSON.parse(jsonStr) as LLMResponseAction;
        parsedResponse.rawResponse = llmResponseText;
      } catch (e) {
        console.warn("LLM response not valid JSON, treating as text:", llmResponseText);
        parsedResponse = { 
          action: 'ANSWER_QUERY', 
          messageForUser: llmResponseText || "No se pudo obtener una respuesta estructurada.",
          rawResponse: llmResponseText
        };
      }
      
      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? {...msg, text: parsedResponse.messageForUser, isLoading: false, isError: parsedResponse.action === 'ERROR', groupedData: parsedResponse.groupedData, rawLLMResponse: parsedResponse.rawResponse } 
          : msg
      ));
      
      const finalAiMessageForUser = parsedResponse.messageForUser;
      const finalGroupedData = parsedResponse.action === 'LIST_ENTITIES' || parsedResponse.action === 'GROUPED_QUERY' 
                             ? (parsedResponse.data && Array.isArray(parsedResponse.data) ? [{groupTitle: `Resultado: ${parsedResponse.entity ? ENTITY_DISPLAY_NAMES[parsedResponse.entity] : ''}`, items: parsedResponse.data as any[]}] : parsedResponse.groupedData)
                             : parsedResponse.groupedData;


      const activateMicCallback = () => {
          if (isInteractiveVoiceMode) {
            chatPanelRef.current?.triggerStartRecording();
          }
      };

      const speakResultsCallback = () => {
        if (finalGroupedData && finalGroupedData.length > 0) {
            speakGroupedResults(finalGroupedData, activateMicCallback);
        } else {
            activateMicCallback();
        }
      };

      if (finalAiMessageForUser) {
         speakText(finalAiMessageForUser, speakResultsCallback);
      } else {
          speakResultsCallback(); 
      }

      processLLMResponse(parsedResponse); 

    } catch (error) {
      console.error("Error sending message to Gemini Chat:", error);
      const errorMessage = `Error al comunicarse con la IA: ${(error as Error).message}`;
      setChatMessages(prev => prev.map(msg => {
        if (msg.id === aiMessageId) {
          speakText(`Error: ${errorMessage}`, () => { 
            if (isInteractiveVoiceMode) chatPanelRef.current?.triggerStartRecording();
          });
          return {...msg, text: errorMessage, isLoading: false, isError: true };
        }
        return msg;
      }));
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSession, database, processLLMResponse, isInteractiveVoiceMode]);


  const handleFileUpload = (file: File, type: 'json_db' | EntityType) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (type === 'json_db') {
          const newDb = JSON.parse(content) as Database;
          let valid = true;
          for(const key of ALL_ENTITY_TYPES) {
            if(!newDb[key as EntityType] || !Array.isArray(newDb[key as EntityType])) {
              valid = false;
              break;
            }
          }
          if (valid) {
            setDatabase(newDb);
            addMessageToChat('Base de datos cargada desde JSON.', 'system');
          } else {
            throw new Error("El archivo JSON no tiene la estructura esperada.");
          }
        } else { 
          const entityData = processCsvData(content, type);
          if (entityData.length > 0) {
            const currentEntityArray = Array.isArray(database[type]) ? database[type] : [];
            setDatabase(prevDb => ({
              ...prevDb,
              [type]: [...currentEntityArray, ...entityData] 
            }));
            addMessageToChat(`Datos para '${ENTITY_DISPLAY_NAMES[type] || type}' importados (${entityData.length} registros).`, 'system');
          } else {
            addMessageToChat(`No se encontraron datos válidos en CSV para '${ENTITY_DISPLAY_NAMES[type] || type}'.`, 'system', true);
          }
        }
      } catch (error) {
        console.error("Error processing file:", error);
        addMessageToChat(`Error al procesar archivo: ${(error as Error).message}`, 'system', true);
      }
    };
    reader.readAsText(file);
  };

  const handleMultipleFileUploadRequest = (files: File[]) => {
    setFilesForMultiUpload(files);
    setIsMultiCsvModalOpen(true);
  };

  const processMultipleCsvFiles = (filesToProcess: { file: File, entityType: EntityType }[]) => {
    setIsMultiCsvModalOpen(false);
    let successfulImports = 0;
    let failedImports = 0;
    let totalRecordsImported = 0;

    filesToProcess.forEach(({ file, entityType }) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const entityData = processCsvData(content, entityType);
          if (entityData.length > 0) {
            setDatabase(prevDb => {
              const currentEntityArray = Array.isArray(prevDb[entityType]) ? prevDb[entityType] : [];
              return {
                ...prevDb,
                [entityType]: [...currentEntityArray, ...entityData]
              };
            });
            successfulImports++;
            totalRecordsImported += entityData.length;
            addMessageToChat(`Archivo '${file.name}' (${ENTITY_DISPLAY_NAMES[entityType]}): ${entityData.length} registros importados.`, 'system');
          } else {
            failedImports++;
            addMessageToChat(`Archivo '${file.name}' (${ENTITY_DISPLAY_NAMES[entityType]}): No se encontraron datos válidos.`, 'system', true);
          }
        } catch (error) {
          failedImports++;
          console.error(`Error processing file ${file.name}:`, error);
          addMessageToChat(`Error al procesar archivo '${file.name}': ${(error as Error).message}`, 'system', true);
        } finally {
          if (successfulImports + failedImports === filesToProcess.length) {
            addMessageToChat(`Carga múltiple completada. Exitosos: ${successfulImports}, Fallidos: ${failedImports}. Total registros: ${totalRecordsImported}.`, 'system');
          }
        }
      };
      reader.readAsText(file);
    });
     setFilesForMultiUpload([]); 
  };


  const handleFileExport = (type: 'json_db') => {
    if (type === 'json_db') {
      const jsonString = JSON.stringify(database, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'farmerchat_db_v5.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addMessageToChat('Base de datos exportada como JSON.', 'system');
    }
  };

  const handleExportToCsvs = () => {
    try {
      let filesExported = 0;
      ALL_ENTITY_TYPES.forEach(entityType => {
        const entityData = database[entityType];
        if (Array.isArray(entityData) && entityData.length > 0) {
          const csvString = convertEntityArrayToCsvString(entityData, entityType);
          const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const safeEntityName = entityType.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          link.download = `${safeEntityName}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          filesExported++;
        }
      });
      if (filesExported > 0) {
        addMessageToChat(`${filesExported} archivos CSV exportados.`, 'system');
      } else {
        addMessageToChat('No hay datos para exportar a CSV.', 'system');
      }
    } catch (error) {
      console.error("Error exporting all to CSVs:", error);
      addMessageToChat(`Error al exportar a CSVs: ${(error as Error).message}`, 'system', true);
    }
  };

  const csvImportableEntities = ALL_ENTITY_TYPES.filter(et => 
    !['tasks', 'taskMachineryLinks', 'taskPersonnelLinks', 'taskInsumeLinks', 'userAccess'].includes(et)
  );

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white bg-transition">
      <TopBar
        ref={topBarRef}
        onFileUpload={handleFileUpload}
        onFileExport={handleFileExport}
        onExportToCsvs={handleExportToCsvs} // New prop
        entityTypes={csvImportableEntities}
        currentTheme={theme}
        onToggleTheme={toggleTheme}
        isInteractiveVoiceMode={isInteractiveVoiceMode}
        onToggleInteractiveVoiceMode={() => toggleInteractiveVoiceMode()} // Pass as a function
        onMultipleFileUploadRequest={handleMultipleFileUploadRequest}
      />
      <div className="flex flex-1 overflow-hidden">
        <ChatPanel
          ref={chatPanelRef}
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          currentDb={database}
          onBeforeStartRecording={handleBeforeStartRecording}
        />
        <DataPanel database={database} groupedResults={currentGroupedResults} />
      </div>
      {isMultiCsvModalOpen && (
        <MultipleCsvUploadModal
          files={filesForMultiUpload}
          onClose={() => {
            setIsMultiCsvModalOpen(false);
            setFilesForMultiUpload([]);
          }}
          onSubmit={processMultipleCsvFiles}
          entityTypes={ALL_ENTITY_TYPES}
        />
      )}
    </div>
  );
};

export default App;
