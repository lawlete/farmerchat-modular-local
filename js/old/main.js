// js/main.js

let geminiApiKey = null;
let isLLMLoading = false;
let mediaRecorder;
let audioChunks = [];

const MAIN_DOM = {}; 

document.addEventListener('DOMContentLoaded', () => {
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
        addMessageToChatLog("¡Bienvenido de nuevo a FarmerChat!", 'ai'); 
    }
    
    if (!dbLoadedSuccessfully && (!db.clients || db.clients.length === 0) && (!db.users || db.users.length === 0)) { 
        addMessageToChatLog("Inicia importando tus datos (Clientes, Usuarios, Campos, etc.) desde CSV o usa comandos de voz/texto.", 'ai');
    }

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

    // CORRECCIÓN AQUÍ: Pasar el valor del input directamente
    MAIN_DOM.sendButton.addEventListener('click', () => handleSendUserInput()); // No pasar el evento
    MAIN_DOM.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendUserInput(); // No pasar el evento
        }
    });
    MAIN_DOM.voiceButton.addEventListener('click', toggleAudioRecording); 

    MAIN_DOM.saveDbButton.addEventListener('click', handleSaveDbToFile);
    MAIN_DOM.loadDbButton.addEventListener('click', () => MAIN_DOM.loadDbFile.click());
    MAIN_DOM.loadDbFile.addEventListener('change', handleLoadDbFromFile);
    MAIN_DOM.importCsvButton.addEventListener('click', handleImportCsv);
});


async function handleSendUserInput(textOverride = null) {
    // Si textOverride es un objeto (como un evento), tomar el valor del input.
    // Si es null, tomar el valor del input.
    // Si es una cadena, usarla.
    let textToSend;
    if (typeof textOverride === 'string') {
        textToSend = textOverride.trim();
    } else {
        textToSend = MAIN_DOM.userInput.value.trim();
    }
    
    if (!textToSend || isLLMLoading) return;

    if (!geminiApiKey) {
        addMessageToChatLog("Error: La API Key de Gemini no está configurada.", 'ai', true);
        showApiKeyModal();
        return;
    }

    // Solo añadir al log si no es un textOverride proveniente de la transcripción de audio,
    // ya que el audio ya generó sus propios mensajes.
    if (textOverride === null || typeof textOverride !== 'string' || (typeof textOverride === 'string' && !textOverride.startsWith("Transcripción:"))) {
         addMessageToChatLog(textToSend, 'user');
    }
    MAIN_DOM.userInput.value = ''; // Limpiar siempre el input de texto
    isLLMLoading = true;
    enableChatControls(true); 
    const loadingIndicator = addMessageToChatLog("Procesando con IA...", 'ai', false, true);

    try {
        const aiResultJson = await callGeminiApiWithHistory(textToSend); 
        removeLoadingIndicator();
        if (aiResultJson) {
            await processLLMResponse(aiResultJson);
        }
    } catch (error) {
        removeLoadingIndicator();
        console.error("Error al procesar la entrada del usuario:", error);
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

async function toggleAudioRecording() {
    // ... (lógica de toggleAudioRecording como antes, pero asegurándose que...)
    // ... cuando llama a handleSendUserInput, pasa el texto transcrito correctamente
    if (isLLMLoading || !geminiApiKey) {
        if (!geminiApiKey) showApiKeyModal();
        return;
    }

    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        if(MAIN_DOM.voiceButton) MAIN_DOM.voiceButton.textContent = '🎙️'; 
        if(MAIN_DOM.voiceButton) MAIN_DOM.voiceButton.title = "Grabar Voz (Click para Iniciar/Detener)";
        addMessageToChatLog("Grabación detenida, procesando audio...", 'ai'); // No es isLoadingMessage
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // Especificar mimeType aquí
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop()); 
                
                if (audioChunks.length === 0) {
                    addMessageToChatLog("No se grabó audio o el audio está vacío.", 'ai', true);
                    if (geminiApiKey) enableChatControls(false); // Rehabilitar si no hay nada que procesar
                    return;
                }

                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioChunks = []; // Limpiar para la próxima grabación
                                
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64AudioWithPrefix = reader.result;
                    // Extraer solo la parte base64
                    const base64Audio = base64AudioWithPrefix.substring(base64AudioWithPrefix.indexOf(',') + 1);
                    
                    addMessageToChatLog("Audio grabado. Transcribiendo...", 'user'); // Mensaje de usuario
                    isLLMLoading = true;
                    enableChatControls(true);
                    const loadingTranscription = addMessageToChatLog("Transcribiendo con IA...", 'ai', false, true);

                    try {
                        const transcription = await transcribeAudioWithGemini(base64Audio, 'audio/webm'); 
                        removeLoadingIndicator(); 
                        if (transcription && transcription.trim() !== "") {
                            addMessageToChatLog(`Transcripción: "${transcription}"`, 'ai');
                            await handleSendUserInput(transcription); // Enviar la transcripción
                        } else {
                            addMessageToChatLog("No se pudo obtener la transcripción del audio o estaba vacía.", 'ai', true);
                             if (geminiApiKey) enableChatControls(false); // Rehabilitar si la transcripción falla
                        }
                    } catch (error) {
                        removeLoadingIndicator();
                        console.error("Error en transcripción de audio:", error);
                        addMessageToChatLog(`Error al transcribir: ${error.message}`, 'ai', true);
                         if (geminiApiKey) enableChatControls(false); // Rehabilitar en error
                    } 
                    // 'finally' para isLLMLoading y enableChatControls está en handleSendUserInput
                };
                 reader.onerror = (error) => {
                    console.error("Error leyendo el audioBlob:", error);
                    addMessageToChatLog("Error al procesar el audio grabado.", "ai", true);
                    if (geminiApiKey) enableChatControls(false);
                };
            };

            mediaRecorder.start();
            if(MAIN_DOM.voiceButton) MAIN_DOM.voiceButton.textContent = '🛑'; 
            if(MAIN_DOM.voiceButton) MAIN_DOM.voiceButton.title = "Detener Grabación";
            addMessageToChatLog("Grabando audio... Haz clic en 🛑 para detener.", 'ai');

        } catch (err) {
            console.error("Error al acceder al micrófono:", err);
            addMessageToChatLog("Error al acceder al micrófono. Asegúrate de haber dado permisos y que no esté en uso por otra app.", 'ai', true);
            if(MAIN_DOM.voiceButton) MAIN_DOM.voiceButton.textContent = '🎙️';
            if(MAIN_DOM.voiceButton) MAIN_DOM.voiceButton.title = "Grabar Voz (Click para Iniciar/Detener)";
        }
    }
}


async function processLLMResponse(aiResult) {
    // ... (Misma función processLLMResponse que antes, ya debería estar bien) ...
    // (Asegúrate que usa addMessageToChatLog de ui.js y saveDbToStorage/updateAllDisplayedLists de sus respectivos módulos)
    if (typeof aiResult !== 'object' || aiResult === null) {
        addMessageToChatLog("Error: La respuesta de la IA no es un objeto JSON válido.", 'ai', true);
        console.error("Respuesta inválida de IA recibida en processLLMResponse:", aiResult);
        return;
    }

    const responseTextForUser = aiResult.responseText || "Acción procesada."; 
    let messageType = 'ai';
    if (aiResult.action === 'CLARIFY') {
        messageType = 'clarification';
    }
    addMessageToChatLog(responseTextForUser, messageType);


    if (aiResult.action === 'CLARIFY') return;
    if (aiResult.action === 'INFO_EXTERNAL') {
        console.log("INFO_EXTERNAL solicitada, query:", aiResult.externalQuery);
        return;
    }

    const entity = aiResult.entity;
    let rawDataFromLLM = aiResult.data || {};
    let data = resolveEntityNamesToIds(rawDataFromLLM, entity); 

    const collectionName = getCollectionNameForEntity(entity); 

    if (!collectionName && (aiResult.action === 'CREATE' || aiResult.action === 'READ' || aiResult.action === 'UPDATE' || aiResult.action === 'DELETE')) {
        addMessageToChatLog(`Error: Entidad "${entity}" no reconocida o no mapeada a una colección válida.`, 'ai', true);
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
                addMessageToChatLog(`Error: Colección "${collectionName}" para entidad "${entity}" no existe.`, 'ai', true); break;
            }
            if (entity === 'Lot' && !data.fieldId) {
                addMessageToChatLog(`Error: Campo "${data.fieldName || 'desconocido'}" no encontrado para crear el Lote "${data.lotName || ''}".`, 'ai', true); break;
            }
            if (entity === 'Parcel' && !data.lotId) {
                addMessageToChatLog(`Error: Lote "${data.lotName || 'desconocido'}" no encontrado para crear la Parcela "${data.parcelName || ''}".`, 'ai', true); break;
            }
            if (entity === 'JobEvent' && (!data.taskId || !data.parcelId || !data.dateTimeScheduled)) {
                let missing = [];
                if(!data.taskId) missing.push(`tarea (nombre: "${data.taskName || '?'}")`);
                if(!data.parcelId) missing.push(`parcela (nombre: "${data.parcelName || '?'}")`);
                if(!data.dateTimeScheduled) missing.push("fecha programada");
                addMessageToChatLog(`Error: Faltan datos críticos para JobEvent: ${missing.join(', ')}. Asegúrate que las entidades referenciadas existan.`, 'ai', true); break;
            }

            const newItem = { id: generateId(entity.substring(0, 3).toLowerCase() + '_'), ...data };
            if (['Field', 'Campaign'].includes(entity)) newItem.clientId = db.config.currentClientId;
            // Para Client y User, el clientId debería venir del LLM o de un contexto superior (ej. registro de nuevo cliente)
            // Por ahora, si se crea un User sin clientId, se le podría asignar el currentClientId, pero es una suposición.
            if (entity === 'User' && !newItem.clientId) newItem.clientId = db.config.currentClientId;

            if (entity === 'JobEvent' && !newItem.status) newItem.status = 'Scheduled';

            db[collectionName].push(newItem);
            operationSuccessful = true;
            break;

        case 'READ':
            if (!db[collectionName]) {
                addMessageToChatLog(`Error: Colección "${collectionName}" para entidad "${entity}" no existe.`, 'ai', true); break;
            }
            console.log(`Consulta READ para ${entity} con filtros:`, data.filters);
            break;

        case 'UPDATE':
            if (!db[collectionName]) {
                addMessageToChatLog(`Error: Colección "${collectionName}" para entidad "${entity}" no existe.`, 'ai', true); break;
            }
            const criteriaToUpdate = data.criteria || { id: data.id, name: data.name }; 
            const newData = data.nuevosDatos;

            if (!newData || Object.keys(newData).length === 0) {
                addMessageToChatLog(`Error: No se especificaron datos para actualizar en ${entity}.`, 'ai', true); break;
            }
            
            let itemIndex = -1;
            // La lógica para encontrar el itemIndex debe ser robusta, usando IDs resueltos si es posible
            if (criteriaToUpdate.id) { // Idealmente el LLM provee el ID resuelto
                itemIndex = db[collectionName].findIndex(item => item.id === criteriaToUpdate.id);
            } else if (criteriaToUpdate.name) { 
                let potentialMatches = db[collectionName].filter(item => normalizeString(item.name) === normalizeString(criteriaToUpdate.name));
                // Desambiguar usando contexto si es Lote o Parcela
                if (entity === 'Lot' && data.fieldId) { // 'data' ya tiene fieldId resuelto si se dio fieldName
                    potentialMatches = potentialMatches.filter(item => item.fieldId === data.fieldId);
                } else if (entity === 'Parcel' && data.lotId) { // 'data' ya tiene lotId resuelto
                    potentialMatches = potentialMatches.filter(item => item.lotId === data.lotId);
                }
                if (potentialMatches.length === 1) {
                    itemIndex = db[collectionName].indexOf(potentialMatches[0]);
                } else if (potentialMatches.length > 1) {
                     addMessageToChatLog(`Error: Múltiples ${entity} con nombre "${criteriaToUpdate.name}" encontrados. Sea más específico (ej. con ID o contexto de campo/lote).`, 'ai', true); break;
                }
            }

            if (itemIndex > -1) {
                // Antes de actualizar, resolvemos cualquier nombre en newData a IDs
                const resolvedNewData = resolveEntityNamesToIds(newData, entity); // Asumiendo que newData podría tener nombres
                db[collectionName][itemIndex] = { ...db[collectionName][itemIndex], ...resolvedNewData };
                operationSuccessful = true;
            } else {
                addMessageToChatLog(`No se encontró ${entity} con criterios (ID: ${criteriaToUpdate.id}, Nombre: ${criteriaToUpdate.name}) para actualizar.`, 'ai', true);
            }
            break;

        case 'DELETE':
            if (!db[collectionName]) {
                addMessageToChatLog(`Error: Colección "${collectionName}" para entidad "${entity}" no existe.`, 'ai', true); break;
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
                    if (entity === 'Lot' && data.fieldId && item.fieldId !== data.fieldId) { // data.fieldId es el resuelto
                        contextMatch = false;
                    } else if (entity === 'Parcel' && data.lotId && item.lotId !== data.lotId) { // data.lotId es el resuelto
                        contextMatch = false;
                    }
                    if (contextMatch) shouldDelete = true;
                }
                if (shouldDelete) itemsActuallyDeleted++;
                return !shouldDelete;
            });

            if (itemsActuallyDeleted > 0) {
                operationSuccessful = true;
            } else if (originalLength > 0) { 
                 addMessageToChatLog(`No se encontró ${entity} con criterios (ID: ${criteriaToDelete.id}, Nombre: ${criteriaToDelete.name}) para eliminar.`, 'ai', true);
            }
            break;
        default:
            addMessageToChatLog(`Acción "${aiResult.action}" no reconocida o no implementada.`, 'ai', true);
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
            if (typeof loadedDbData === 'object' && loadedDbData !== null && loadedDbData.config && loadedDbData.clients && loadedDbData.users) {
                db = loadedDbData; 
                saveDbToStorage(); 
                updateAllDisplayedLists();
                conversationHistoryLLM = []; 
                addMessageToChatLog("Base de datos cargada desde archivo JSON. El historial de chat ha sido reiniciado.", 'ai');
            } else {
                throw new Error("El archivo JSON no parece ser una base de datos válida de FarmerChat.");
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
                addMessageToChatLog(`No se importaron nuevos registros para "${entityNameToImport}". Ver consola.`, 'ai', true);
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