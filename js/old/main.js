// js/main.js

let geminiApiKey = null;
let isLLMLoading = false;
let mediaRecorder;
let audioChunks = [];

const MAIN_DOM = {}; 

document.addEventListener('DOMContentLoaded', () => {
    // ... (poblar MAIN_DOM como antes) ...
    MAIN_DOM.apiKeyOverlay = document.getElementById('api-key-overlay');
    MAIN_DOM.apiKeyInput = document.getElementById('api-key-input');
    MAIN_DOM.saveApiKeyButton = document.getElementById('save-api-key-button');
    MAIN_DOM.userInput = document.getElementById('user-input');
    MAIN_DOM.sendButton = document.getElementById('send-button');
    MAIN_DOM.voiceButton = document.getElementById('voice-button');
    MAIN_DOM.loadDbButton = document.getElementById('load-db-button');
    MAIN_DOM.loadDbFile = document.getElementById('load-db-file');
    MAIN_DOM.saveDbButton = document.getElementById('save-db-button');
    MAIN_DOM.entityTypeSelector = document.getElementById('entity-type-selector');
    MAIN_DOM.csvFileInput = document.getElementById('csv-file-input');
    MAIN_DOM.importCsvButton = document.getElementById('import-csv-button');

    const dbLoadedSuccessfully = loadDbFromStorage(); 
    updateAllDisplayedLists(); 

    geminiApiKey = localStorage.getItem('farmerChatApiKey');
    if (!geminiApiKey) {
        showApiKeyModal(); 
    } else {
        setApiKeyForLlmModule(geminiApiKey); 
        enableChatControls(false); 
        // No añadir mensaje de bienvenida aquí, esperar a que el usuario interactúe o el LLM salude si es necesario.
    }
    
    if (!dbLoadedSuccessfully && (!db.clients || db.clients.length === 0) && (!db.users || db.users.length === 0)) { 
        addMessageToChatLog("Inicia importando tus datos (Clientes, Usuarios, Campos, etc.) desde CSV o usa comandos de voz/texto.", 'ai');
    }

    // ----- MANEJADORES DE EVENTOS UI -----
    MAIN_DOM.saveApiKeyButton.addEventListener('click', () => {
        const key = MAIN_DOM.apiKeyInput.value.trim();
        if (key) {
            geminiApiKey = key;
            localStorage.setItem('farmerChatApiKey', key);
            setApiKeyForLlmModule(geminiApiKey);
            hideApiKeyModal();
            enableChatControls(false);
            addMessageToChatLog("API Key guardada. ¡Hola! Soy FarmerChat. ¿En qué puedo ayudarte?", 'ai');
        } else {
            alert("Por favor, ingresa una API Key válida.");
        }
    });

    // CORRECCIÓN AQUÍ:
    MAIN_DOM.sendButton.addEventListener('click', () => {
        handleSendUserInput(); // Llama sin argumentos, tomará el valor del input
    });
    MAIN_DOM.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevenir submit de formulario si estuviera en uno
            handleSendUserInput(); // Llama sin argumentos
        }
    });
    MAIN_DOM.voiceButton.addEventListener('click', toggleAudioRecording); 

    MAIN_DOM.saveDbButton.addEventListener('click', handleSaveDbToFile);
    MAIN_DOM.loadDbButton.addEventListener('click', () => MAIN_DOM.loadDbFile.click());
    MAIN_DOM.loadDbFile.addEventListener('change', handleLoadDbFromFile);
    MAIN_DOM.importCsvButton.addEventListener('click', handleImportCsv);
});


async function handleSendUserInput(textOverride = null) {
    let textToSend;
    if (typeof textOverride === 'string') {
        textToSend = textOverride.trim(); // Usar el override si es string
    } else {
        textToSend = MAIN_DOM.userInput.value.trim(); // Sino, tomar del input
    }
    
    if (!textToSend || isLLMLoading) {
        if (!textToSend && textOverride !== null) { // Si textOverride era algo pero se trimeó a vacío
            console.warn("textOverride resultó en string vacío, no se envía.");
        }
        return;
    }


    if (!geminiApiKey) {
        addMessageToChatLog("Error: La API Key de Gemini no está configurada.", 'ai', true);
        showApiKeyModal();
        return;
    }

    // Solo añadir al log de usuario si NO es un textOverride que ya se mostró (ej. transcripción)
    // O si es el input directo del usuario.
    const isFromDirectInput = (textOverride === null || typeof textOverride !== 'string');
    if (isFromDirectInput) {
         addMessageToChatLog(textToSend, 'user');
    }
    // Siempre limpiar el input de texto si el comando vino de ahí
    if (isFromDirectInput) {
        MAIN_DOM.userInput.value = '';
    }
    
    isLLMLoading = true;
    enableChatControls(true); 
    const loadingIndicator = addMessageToChatLog("Procesando con IA...", 'ai', false, true);

    try {
        const aiResultJson = await callGeminiApiWithHistory(textToSend); 
        removeLoadingIndicator();
        if (aiResultJson) {
            await processLLMResponse(aiResultJson);
        } else {
            // Esto no debería pasar si callGeminiApiWithHistory siempre devuelve o tira error.
            addMessageToChatLog("La IA no devolvió una respuesta procesable.", 'ai', true);
        }
    } catch (error) {
        removeLoadingIndicator();
        console.error("Error al procesar la entrada del usuario (desde handleSendUserInput):", error);
        let errorMessage = error.message || "Hubo un problema al contactar la IA.";
        if (error.isApiKeyError) {
            errorMessage = "Error con la API Key de Gemini. Verifica que sea correcta y esté habilitada.";
            showApiKeyModal();
        }
        addMessageToChatLog(`Error: ${errorMessage}`, 'ai', true);
    } finally {
        isLLMLoading = false;
        if (geminiApiKey) {
            enableChatControls(false); 
        }
    }
}

// ... (toggleAudioRecording como antes) ...
// ... (processLLMResponse como antes) ...
// ... (handleSaveDbToFile, handleLoadDbFromFile, handleImportCsv como antes) ...
async function toggleAudioRecording() {
    if (isLLMLoading || !geminiApiKey) {
        if (!geminiApiKey) showApiKeyModal();
        return;
    }

    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        if(MAIN_DOM.voiceButton) MAIN_DOM.voiceButton.textContent = '🎙️'; 
        if(MAIN_DOM.voiceButton) MAIN_DOM.voiceButton.title = "Grabar Voz (Click para Iniciar/Detener)";
        // No añadir "procesando audio" aquí, se hará en onstop si hay chunks
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Intentar especificar codecs si es posible para mejor compatibilidad con Gemini
            const options = { mimeType: 'audio/webm; codecs=opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.warn(`${options.mimeType} no soportado, usando default.`);
                delete options.mimeType; // Usar el default del navegador
            }
            mediaRecorder = new MediaRecorder(stream, options);
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop()); 
                
                if (audioChunks.length === 0) {
                    addMessageToChatLog("No se grabó audio o el audio está vacío.", 'ai', true);
                    if (geminiApiKey && !isLLMLoading) enableChatControls(false);
                    return;
                }

                // Crear el Blob con el mimeType usado por MediaRecorder
                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                audioChunks = []; 
                                
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64AudioWithPrefix = reader.result;
                    const base64Audio = base64AudioWithPrefix.substring(base64AudioWithPrefix.indexOf(',') + 1);
                    
                    addMessageToChatLog("Audio grabado. Transcribiendo...", 'user'); 
                    isLLMLoading = true;
                    enableChatControls(true);
                    const loadingTranscription = addMessageToChatLog("Transcribiendo con IA...", 'ai', false, true);

                    try {
                        const transcription = await transcribeAudioWithGemini(base64Audio, mediaRecorder.mimeType || 'audio/webm'); 
                        removeLoadingIndicator(); 
                        if (transcription && transcription.trim() !== "") {
                            addMessageToChatLog(`Transcripción: "${transcription}"`, 'ai');
                            await handleSendUserInput(transcription); 
                        } else {
                            addMessageToChatLog("No se pudo obtener la transcripción del audio o estaba vacía.", 'ai', true);
                             if (geminiApiKey && !isLLMLoading) enableChatControls(false);
                        }
                    } catch (error) {
                        removeLoadingIndicator();
                        console.error("Error en transcripción de audio:", error);
                        addMessageToChatLog(`Error al transcribir: ${error.message}`, 'ai', true);
                         if (geminiApiKey && !isLLMLoading) enableChatControls(false);
                    } 
                };
                 reader.onerror = (error) => {
                    console.error("Error leyendo el audioBlob:", error);
                    addMessageToChatLog("Error al procesar el audio grabado.", "ai", true);
                    if (geminiApiKey && !isLLMLoading) enableChatControls(false);
                };
            };
            mediaRecorder.onerror = (event) => {
                console.error("Error en MediaRecorder:", event.error);
                addMessageToChatLog(`Error de grabación: ${event.error.name} - ${event.error.message}`, "ai", true);
                if(MAIN_DOM.voiceButton) MAIN_DOM.voiceButton.textContent = '🎙️';
                if(MAIN_DOM.voiceButton) MAIN_DOM.voiceButton.title = "Grabar Voz (Click para Iniciar/Detener)";
                if (geminiApiKey && !isLLMLoading) enableChatControls(false);
                 stream.getTracks().forEach(track => track.stop()); 
            };

            mediaRecorder.start();
            if(MAIN_DOM.voiceButton) MAIN_DOM.voiceButton.textContent = '🛑'; 
            if(MAIN_DOM.voiceButton) MAIN_DOM.voiceButton.title = "Detener Grabación";
            addMessageToChatLog("Grabando audio... Haz clic en 🛑 para detener.", 'ai');

        } catch (err) {
            console.error("Error al acceder al micrófono o iniciar grabación:", err);
            let userMessage = "Error al acceder al micrófono. Asegúrate de haber dado permisos.";
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                userMessage = "Permiso para acceder al micrófono denegado. Por favor, habilítalo en la configuración de tu navegador.";
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError"){
                userMessage = "No se encontró un dispositivo de micrófono.";
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                userMessage = "El micrófono está siendo usado por otra aplicación o hay un problema con el hardware.";
            }
            addMessageToChatLog(userMessage, 'ai', true);
            if(MAIN_DOM.voiceButton) MAIN_DOM.voiceButton.textContent = '🎙️';
            if(MAIN_DOM.voiceButton) MAIN_DOM.voiceButton.title = "Grabar Voz (Click para Iniciar/Detener)";
        }
    }
}

async function processLLMResponse(aiResult) {
    if (typeof aiResult !== 'object' || aiResult === null) {
        addMessageToChatLog("Error: La respuesta de la IA no es un objeto JSON válido.", 'ai', true);
        console.error("Respuesta inválida de IA recibida en processLLMResponse:", aiResult);
        return;
    }

    const responseTextForUser = aiResult.responseText || "Acción procesada."; 
    let messageType = 'ai';
    if (aiResult.action === 'CLARIFY') {
        messageType = 'clarification';
    } else if (aiResult.action === 'NOT_UNDERSTOOD') {
        // No hacer nada especial, el responseText ya debería ser adecuado.
    }
    // Solo añadir el responseText si es diferente del último mensaje de IA (evitar duplicados si el LLM no da buen responseText)
    const chatLogChildren = UI_DOM.chatLog.children;
    const lastAiMessage = chatLogChildren.length > 0 ? Array.from(chatLogChildren).reverse().find(el => el.classList.contains('ai-message') || el.classList.contains('clarification-message')) : null;
    if (!lastAiMessage || lastAiMessage.innerHTML.replace(/<br>/g, '\n') !== responseTextForUser) {
        addMessageToChatLog(responseTextForUser, messageType);
    }


    if (aiResult.action === 'CLARIFY' || aiResult.action === 'GREETING' || aiResult.action === 'NOT_UNDERSTOOD') {
        // Para GREETING, si el LLM responde con una acción GREETING, no hacemos nada más en la DB.
        // NOT_UNDERSTOOD tampoco requiere acción en DB.
        return;
    }
    if (aiResult.action === 'INFO_EXTERNAL') {
        console.log("INFO_EXTERNAL solicitada, query:", aiResult.externalQuery);
        // El responseText del LLM ya debería contener la información.
        return;
    }

    const entity = aiResult.entity;
    let rawDataFromLLM = aiResult.data || {};
    let data = resolveEntityNamesToIds(rawDataFromLLM, entity); 

    const collectionName = getCollectionNameForEntity(entity); 

    if (!collectionName && (aiResult.action === 'CREATE' || aiResult.action === 'READ' || aiResult.action === 'UPDATE' || aiResult.action === 'DELETE')) {
        addMessageToChatLog(`Error interno: Entidad "${entity}" no reconocida o no mapeada a una colección válida.`, 'ai', true);
        return;
    }
    
    console.groupCollapsed(`LLM Action: ${aiResult.action} on Entity: ${entity}`);
    console.log("Raw Data from LLM:", JSON.parse(JSON.stringify(rawDataFromLLM)));
    console.log("Resolved Data for DB:", JSON.parse(JSON.stringify(data)));
    console.groupEnd();

    let operationSuccessful = false;

    switch (aiResult.action) {
        case 'CREATE':
            if (!db[collectionName]) {
                addMessageToChatLog(`Error interno: Colección "${collectionName}" para entidad "${entity}" no existe.`, 'ai', true); break;
            }
            // Validaciones robustas
            if (entity === 'Field' && (!data.name || data.name.trim() === '')) {
                addMessageToChatLog(`Error: Se necesita un nombre para crear un Campo.`, 'ai', true); break;
            }
            if (entity === 'Lot' && (!data.name || !data.fieldId)) {
                addMessageToChatLog(`Error: Para crear un Lote se necesita un nombre y asociarlo a un Campo existente (ID: ${data.fieldId}, Nombre buscado: "${data.fieldName || ''}").`, 'ai', true); break;
            }
            if (entity === 'Parcel' && (!data.name || !data.lotId)) {
                addMessageToChatLog(`Error: Para crear una Parcela se necesita un nombre y asociarla a un Lote existente (ID: ${data.lotId}, Nombre buscado: "${data.lotName || ''}").`, 'ai', true); break;
            }
            if (entity === 'JobEvent' && (!data.taskId || !data.parcelId || !data.dateTimeScheduled)) {
                let missing = [];
                if(!data.taskId) missing.push(`tarea (buscada como: "${data.taskName || '?'}")`);
                if(!data.parcelId) missing.push(`parcela (buscada como: "${data.parcelName || '?'}")`);
                if(!data.dateTimeScheduled) missing.push("fecha programada");
                addMessageToChatLog(`Error: Faltan datos críticos para crear el Trabajo/Evento: ${missing.join(', ')}. Asegúrate que las entidades referenciadas existan y la fecha sea válida.`, 'ai', true); break;
            }

            const newItem = { id: generateId(entity.substring(0, 3).toLowerCase() + '_'), ...data };
            // Asignar clientId correctamente
            if (['Field', 'Campaign'].includes(entity)) {
                 newItem.clientId = db.config.currentClientId;
            } else if (entity === 'User') {
                if (!newItem.clientId) { // Si el LLM no lo asignó, es un problema. Debería pedirlo.
                    addMessageToChatLog(`Error: Para crear un Usuario se necesita especificar a qué Cliente pertenece.`, 'ai', true); break;
                }
            } else if (entity === 'Client') {
                // No necesita clientId
            } else { // Lotes, Parcelas, JobEvents heredan cliente indirectamente.
                // Maquinaria, Personal, Productos, Tareas pueden ser generales o del cliente.
                // Si tienen un campo clientId en el CSV o el LLM lo infiere, se usa.
                // Si no, y deberían tenerlo (ej. Maquinaria propia), se podría asignar el currentClientId
                // pero esto depende de la lógica de negocio. Por ahora, si viene, se usa.
            }


            if (entity === 'JobEvent' && !newItem.status) newItem.status = 'Scheduled';

            // Verificar si ya existe un item con el mismo nombre en el mismo contexto (si aplica)
            let alreadyExists = false;
            if (entity === 'Field' && db.fields.some(f => f.clientId === newItem.clientId && normalizeString(f.name) === normalizeString(newItem.name))) alreadyExists = true;
            if (entity === 'Lot' && db.lots.some(l => l.fieldId === newItem.fieldId && normalizeString(l.name) === normalizeString(newItem.name))) alreadyExists = true;
            if (entity === 'Parcel' && db.parcels.some(p => p.lotId === newItem.lotId && normalizeString(p.name) === normalizeString(newItem.name))) alreadyExists = true;
            // Añadir más chequeos para otras entidades si es necesario (ej. TaskDefinition, ProductInsume por nombre)
            if (['TaskDefinition', 'ProductInsume', 'Machinery', 'Personnel', 'Campaign'].includes(entity) && 
                db[collectionName].some(item => normalizeString(item.name) === normalizeString(newItem.name) && ((entity === 'Campaign' && item.clientId === newItem.clientId) || entity !== 'Campaign'))) {
                alreadyExists = true;
            }


            if (alreadyExists) {
                addMessageToChatLog(`Error: Ya existe un/a ${entity} con el nombre "${newItem.name}" en el contexto actual. No se creó un duplicado.`, 'ai', true);
                break;
            }

            db[collectionName].push(newItem);
            operationSuccessful = true;
            break;

        case 'READ':
            if (!db[collectionName]) {
                addMessageToChatLog(`Error interno: Colección "${collectionName}" para entidad "${entity}" no existe.`, 'ai', true); break;
            }
            console.log(`Solicitud READ para ${entity} con filtros:`, data.filters);
            // El responseText del LLM debería contener la información. Si queremos mostrar una tabla específica:
            if (entity === 'Field' && data.filters && Object.keys(data.filters).length === 0) { // "listar los campos"
                const fieldsOfClient = db.fields.filter(f => f.clientId === db.config.currentClientId);
                if (fieldsOfClient.length > 0) {
                    let fieldListMsg = "Campos del cliente actual:\n";
                    fieldsOfClient.forEach(f => fieldListMsg += `- ${f.name} (ID: ${f.id}, Ubicación: ${f.location || 'N/A'})\n`);
                    // addMessageToChatLog(fieldListMsg, 'ai'); // El LLM ya debería dar un responseText. Esto es para debug o si el LLM falla.
                } else {
                    // addMessageToChatLog("No hay campos registrados para el cliente actual.", 'ai');
                }
            }
            break;

        case 'UPDATE':
            if (!db[collectionName]) {
                addMessageToChatLog(`Error interno: Colección "${collectionName}" para entidad "${entity}" no existe.`, 'ai', true); break;
            }
            const criteriaToUpdate = data.criteria || { id: data.id, name: data.name }; 
            const newData = data.nuevosDatos;

            if (!newData || Object.keys(newData).length === 0) {
                addMessageToChatLog(`Error: No se especificaron datos para actualizar en ${entity}.`, 'ai', true); break;
            }
            
            let itemIndex = -1;
            if (criteriaToUpdate.id) { 
                itemIndex = db[collectionName].findIndex(item => item.id === criteriaToUpdate.id);
            } else if (criteriaToUpdate.name) { 
                let potentialMatches = db[collectionName].filter(item => normalizeString(item.name) === normalizeString(criteriaToUpdate.name));
                // Desambiguar usando contexto (IDs resueltos en `data`)
                if (entity === 'Lot' && data.fieldId) {
                    potentialMatches = potentialMatches.filter(item => item.fieldId === data.fieldId);
                } else if (entity === 'Parcel' && data.lotId) { 
                    potentialMatches = potentialMatches.filter(item => item.lotId === data.lotId);
                } else if ((entity === 'Field' || entity === 'Campaign') && db.config.currentClientId) {
                    // Asegurar que sea del cliente actual si no se especifica ID
                    potentialMatches = potentialMatches.filter(item => item.clientId === db.config.currentClientId);
                }

                if (potentialMatches.length === 1) {
                    itemIndex = db[collectionName].indexOf(potentialMatches[0]);
                } else if (potentialMatches.length > 1) {
                     addMessageToChatLog(`Error: Múltiples ${entity} con nombre "${criteriaToUpdate.name}" encontrados en el contexto actual. Sea más específico (ej. con ID).`, 'ai', true); break;
                }
            }

            if (itemIndex > -1) {
                const resolvedNewData = resolveEntityNamesToIds(newData, entity); 
                db[collectionName][itemIndex] = { ...db[collectionName][itemIndex], ...resolvedNewData };
                operationSuccessful = true;
            } else {
                addMessageToChatLog(`No se encontró ${entity} con criterios (ID: ${criteriaToUpdate.id}, Nombre: ${criteriaToUpdate.name}) para actualizar en el contexto actual.`, 'ai', true);
            }
            break;

        case 'DELETE':
            if (!db[collectionName]) {
                addMessageToChatLog(`Error interno: Colección "${collectionName}" para entidad "${entity}" no existe.`, 'ai', true); break;
            }
            const criteriaToDelete = data.criteria || { id: data.id, name: data.name };
            let originalLength = db[collectionName].length;
            let itemsActuallyDeleted = 0;
            
            db[collectionName] = db[collectionName].filter(item => {
                let shouldDelete = false;
                if (criteriaToDelete.id && item.id === criteriaToDelete.id) {
                    shouldDelete = true;
                } else if (!criteriaToDelete.id && criteriaToDelete.name && normalizeString(item.name) === normalizeString(criteriaToDelete.name)) {
                    let contextMatch = true; 
                    if (entity === 'Lot' && data.fieldId && item.fieldId !== data.fieldId) contextMatch = false;
                    else if (entity === 'Parcel' && data.lotId && item.lotId !== data.lotId) contextMatch = false;
                    else if ((entity === 'Field' || entity === 'Campaign') && item.clientId !== db.config.currentClientId) contextMatch = false; // Solo borrar del cliente actual por nombre
                    
                    if (contextMatch) shouldDelete = true;
                }
                if (shouldDelete) itemsActuallyDeleted++;
                return !shouldDelete;
            });

            if (itemsActuallyDeleted > 0) {
                operationSuccessful = true;
            } else if (originalLength > 0) { 
                 addMessageToChatLog(`No se encontró ${entity} con criterios (ID: ${criteriaToDelete.id}, Nombre: ${criteriaToDelete.name}) para eliminar en el contexto actual.`, 'ai', true);
            }
            break;
        default:
            addMessageToChatLog(`Acción "${aiResult.action || 'desconocida'}" no reconocida o no implementada por el sistema.`, 'ai', true);
    }

    if (operationSuccessful) {
        saveDbToStorage();
    }
    updateAllDisplayedLists();
}


// ----- FUNCIONES DE MANEJO DE ARCHIVOS -----
function handleSaveDbToFile() {
    if (!db) {
        alert("No hay base de datos para guardar."); return;
    }
    try {
        const dbString = JSON.stringify(db, null, 2); 
        const blob = new Blob([dbString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `farmerchat_db_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addMessageToChatLog("Base de datos descargada como archivo JSON.", 'ai');
    } catch (e) {
        console.error("Error al guardar DB en archivo:", e);
        addMessageToChatLog("Error al intentar guardar la base de datos en un archivo.", 'ai', true);
    }
}

function handleLoadDbFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const loadedDbData = JSON.parse(e.target.result);
            // Validación más estricta de la estructura
            if (typeof loadedDbData === 'object' && loadedDbData !== null && 
                loadedDbData.config && typeof loadedDbData.config === 'object' &&
                Array.isArray(loadedDbData.clients) && Array.isArray(loadedDbData.users) &&
                Array.isArray(loadedDbData.fields) && Array.isArray(loadedDbData.lots) &&
                Array.isArray(loadedDbData.parcels) && Array.isArray(loadedDbData.tasksList) &&
                Array.isArray(loadedDbData.productsInsumes) && Array.isArray(loadedDbData.machineries) &&
                Array.isArray(loadedDbData.personnel) && Array.isArray(loadedDbData.campaigns) &&
                Array.isArray(loadedDbData.jobsEvents)
            ) {
                db = loadedDbData; 
                saveDbToStorage(); 
                updateAllDisplayedLists();
                conversationHistoryLLM = []; 
                addMessageToChatLog("Base de datos cargada desde archivo JSON. El historial de chat ha sido reiniciado.", 'ai');
            } else {
                throw new Error("El archivo JSON no tiene la estructura esperada completa de la base de datos FarmerChat.");
            }
        } catch (err) {
            console.error("Error al cargar DB desde archivo:", err);
            addMessageToChatLog(`Error al cargar el archivo: ${err.message}`, 'ai', true);
        } finally {
            if (MAIN_DOM.loadDbFile) MAIN_DOM.loadDbFile.value = ''; 
        }
    };
    reader.readAsText(file);
}

function handleImportCsv() {
    const selectedCollectionKey = MAIN_DOM.entityTypeSelector.value; 
    let entityNameToImport; 
    
    switch (selectedCollectionKey) {
        case 'clients': entityNameToImport = 'Client'; break;
        case 'users': entityNameToImport = 'User'; break;
        case 'fields': entityNameToImport = 'Field'; break;
        case 'lots': entityNameToImport = 'Lot'; break;
        case 'parcels': entityNameToImport = 'Parcel'; break;
        case 'tasksList': entityNameToImport = 'TaskDefinition'; break;
        case 'productsInsumes': entityNameToImport = 'ProductInsume'; break;
        case 'machineries': entityNameToImport = 'Machinery'; break;
        case 'personnel': entityNameToImport = 'Personnel'; break;
        case 'campaigns': entityNameToImport = 'Campaign'; break;
        default:
            addMessageToChatLog("Tipo de entidad no válido seleccionado para importación CSV.", 'ai', true);
            return;
    }

    const file = MAIN_DOM.csvFileInput.files[0];
    if (!file) {
        addMessageToChatLog("Por favor, selecciona un archivo CSV para importar.", 'ai', true);
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const csvText = event.target.result;
        try {
            const itemsAdded = importDataFromCSV(csvText, entityNameToImport, selectedCollectionKey); 
            if (itemsAdded > 0) {
                addMessageToChatLog(`${itemsAdded} registros de "${entityNameToImport}" importados desde CSV.`, 'ai');
            } else if (itemsAdded === 0 && csvText.split('\n').filter(line => line.trim() !== '').length > 1) { 
                addMessageToChatLog(`No se importaron nuevos registros para "${entityNameToImport}". Ver consola (posibles duplicados o datos incorrectos).`, 'ai', true);
            } else if (csvText.split('\n').filter(line => line.trim() !== '').length <= 1) {
                 addMessageToChatLog(`CSV para "${entityNameToImport}" vacío o solo con encabezados.`, 'ai', true);
            }
        } catch (e) {
            console.error("Error al importar CSV:", e);
            addMessageToChatLog(`Error al procesar CSV: ${e.message}`, 'ai', true);
        } finally {
            if (MAIN_DOM.csvFileInput) MAIN_DOM.csvFileInput.value = ''; 
        }
    };
    reader.readAsText(file);
}