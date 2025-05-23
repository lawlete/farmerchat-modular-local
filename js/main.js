// js/main.js

let geminiApiKey = null;
let isLLMLoading = false;
let mediaRecorder;
let audioChunks = [];

const MAIN_DOM = {}; // Will be empty after refactor, but kept for structure if needed later for main.js specific elements.

document.addEventListener('DOMContentLoaded', () => {
    // Selections moved to UI_DOM in ui.js for shared elements.
    // MAIN_DOM.apiKeyOverlay = document.getElementById('api-key-overlay');
    // MAIN_DOM.apiKeyInput = document.getElementById('api-key-input');
    // MAIN_DOM.saveApiKeyButton = document.getElementById('save-api-key-button');
    // MAIN_DOM.userInput = document.getElementById('user-input');
    // MAIN_DOM.sendButton = document.getElementById('send-button');
    // MAIN_DOM.voiceButton = document.getElementById('voice-button');
    // MAIN_DOM.loadDbButton = document.getElementById('load-db-button');
    // MAIN_DOM.loadDbFile = document.getElementById('load-db-file');
    // MAIN_DOM.saveDbButton = document.getElementById('save-db-button');
    // MAIN_DOM.entityTypeSelector = document.getElementById('entity-type-selector');
    // MAIN_DOM.csvFileInput = document.getElementById('csv-file-input');
    // MAIN_DOM.importCsvButton = document.getElementById('import-csv-button');
    
    initializeTabs(); // Initialize tab switching logic from ui.js
    const dbLoadedSuccessfully = loadDbFromStorage(); 
    updateAllDisplayedLists(); 

    geminiApiKey = localStorage.getItem('farmerChatApiKey');
    if (!geminiApiKey) {
        showApiKeyModal(); 
    } else {
        setApiKeyForLlmModule(geminiApiKey); 
        enableChatControls(false); 
        // No añadir mensaje de bienvenida aquí, el LLM lo hará si el usuario saluda.
    }
    
    if (!dbLoadedSuccessfully && (!db.clients || db.clients.length === 0) && (!db.users || db.users.length === 0)) { 
        addMessageToChatLog("Inicia importando tus datos (Clientes, Usuarios, Campos, etc.) desde CSV o usa comandos de voz/texto.", 'ai');
    }

    // Use UI_DOM for elements previously in MAIN_DOM
    // Use UI_DOM for elements previously in MAIN_DOM
    UI_DOM.saveApiKeyButton.addEventListener('click', () => {
        const key = UI_DOM.apiKeyInput.value.trim();
        const feedbackSpan = document.getElementById('api-key-feedback'); // Get feedback span

        // Clear previous feedback
        feedbackSpan.textContent = '';
        feedbackSpan.classList.remove('feedback-success', 'feedback-alert');

        if (key) {
            geminiApiKey = key;
            localStorage.setItem('farmerChatApiKey', key);
            setApiKeyForLlmModule(geminiApiKey);
            hideApiKeyModal(); // This is now a no-op for hiding, but fine to call.
            enableChatControls(false);
            addMessageToChatLog("API Key guardada. ¡Hola! Soy FarmerChat. ¿En qué puedo ayudarte?", 'ai');
            
            // Display success feedback
            feedbackSpan.textContent = '✓ Guardada';
            feedbackSpan.classList.add('feedback-success');
            
            // Switch to Chatbot tab after saving API key
            const chatTabButton = document.querySelector('.tab-nav li[data-tab="tab-panel-chat"]');
            if (chatTabButton) {
                chatTabButton.click();
            }
        } else {
            // Display alert feedback
            feedbackSpan.textContent = 'Por favor, ingresa una clave.';
            feedbackSpan.classList.add('feedback-alert');
            alert("Por favor, ingresa una API Key válida."); // Original alert can remain or be removed
        }

        // Clear feedback after a few seconds
        setTimeout(() => {
            feedbackSpan.textContent = '';
            feedbackSpan.classList.remove('feedback-success', 'feedback-alert');
        }, 3000); // Clear after 3 seconds
    });

    UI_DOM.sendButton.addEventListener('click', () => handleSendUserInput());
    UI_DOM.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            handleSendUserInput(); 
        }
    });
    UI_DOM.voiceButton.addEventListener('click', toggleAudioRecording); 

    UI_DOM.saveDbButton.addEventListener('click', handleSaveDbToFile);
    UI_DOM.loadDbButton.addEventListener('click', () => UI_DOM.loadDbFile.click()); // Corrected: UI_DOM.loadDbFile
    UI_DOM.loadDbFile.addEventListener('change', handleLoadDbFromFile);
    UI_DOM.importCsvButton.addEventListener('click', handleImportCsv);
});


async function handleSendUserInput(textOverride = null) {
    let textToSend;
    if (typeof textOverride === 'string') {
        textToSend = textOverride.trim();
    } else {
        textToSend = UI_DOM.userInput.value.trim(); // Corrected: UI_DOM.userInput
    }
    
    if (!textToSend || isLLMLoading) {
        if (isLLMLoading) console.warn("LLM está cargando, input ignorado:", textToSend);
        else if (!textToSend) console.warn("Input vacío, no se envía.");
        return;
    }

    if (!geminiApiKey) {
        addMessageToChatLog("Error: La API Key de Gemini no está configurada.", 'ai', true);
        showApiKeyModal();
        return;
    }

    // Solo añadir al log de usuario si es un input directo del teclado
    const isFromDirectKeyInput = (textOverride === null);
    if (isFromDirectKeyInput) {
         addMessageToChatLog(textToSend, 'user');
    }
    UI_DOM.userInput.value = ''; // Corrected: UI_DOM.userInput
    
    isLLMLoading = true;
    enableChatControls(true); 
    
    let currentLoadingIndicatorId = null;
    if (isFromDirectKeyInput) { // Only show "pensando" if it's a typed message. Transcription has its own.
        // If a "Transcribiendo..." message exists, remove it before showing "pensando..."
        const existingTranscriptionIndicator = document.querySelector('.loading-indicator');
        if (existingTranscriptionIndicator && existingTranscriptionIndicator.textContent.includes("Transcribiendo")) {
            removeLoadingIndicator(); // Remove specific transcription indicator
        }
        currentLoadingIndicatorId = addMessageToChatLog("FarmerChat está pensando...", 'ai', false, true);
    } else { // For voice input, the "Transcribiendo..." was already shown. This is now the main processing.
        currentLoadingIndicatorId = addMessageToChatLog("Procesando con IA...", 'ai', false, true);
    }

    try {
        console.log(`Enviando a LLM: "${textToSend}"`); // Log para ver qué se envía
        const aiResultJson = await callGeminiApiWithHistory(textToSend); 
        
        // Remove the specific loading indicator ("pensando" or "procesando")
        if (currentLoadingIndicatorId) {
            const elToRemove = document.getElementById(currentLoadingIndicatorId);
            if (elToRemove) elToRemove.remove();
        } else { // Fallback if ID wasn't captured, remove any generic one
            removeLoadingIndicator();
        }
        
        if (aiResultJson) {
            await processLLMResponse(aiResultJson);
        } else {
            addMessageToChatLog("La IA no devolvió una respuesta procesable (resultado nulo o indefinido).", 'ai', true);
        }
    } catch (error) {
        // Ensure loading indicator is removed on error too
        if (currentLoadingIndicatorId) {
            const elToRemove = document.getElementById(currentLoadingIndicatorId);
            if (elToRemove) elToRemove.remove();
        } else {
            removeLoadingIndicator();
        }
        console.error("Error al procesar la entrada del usuario (desde handleSendUserInput):", error);
        let errorMessage = error.message || "Hubo un problema al contactar la IA.";
        if (error.isApiKeyError) { // Flag que podríamos setear en llm.js
            errorMessage = "Error con la API Key de Gemini. Verifica que sea correcta y esté habilitada.";
            showApiKeyModal();
        }
        addMessageToChatLog(`Error: ${errorMessage}`, 'ai', true);
    } finally {
        isLLMLoading = false; // Asegurar que se resetea en todos los caminos
        if (geminiApiKey) {
            enableChatControls(false); 
        }
    }
}

async function toggleAudioRecording() {
    if (isLLMLoading || !geminiApiKey) {
        if (!geminiApiKey) showApiKeyModal();
        return;
    }

    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop(); // onstop se encargará del resto
        // No cambiar el ícono aquí, esperar a onstop para asegurar que realmente paró.
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = { mimeType: 'audio/webm; codecs=opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.warn(`${options.mimeType} no soportado, usando default (audio/webm).`);
                options.mimeType = 'audio/webm'; 
            }
            mediaRecorder = new MediaRecorder(stream, options);
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                // Indicar que la grabación paró y los controles se pueden rehabilitar momentáneamente
                if(UI_DOM.voiceButton) UI_DOM.voiceButton.textContent = '🎙️'; // Corrected: UI_DOM.voiceButton
                if(UI_DOM.voiceButton) UI_DOM.voiceButton.title = "Grabar Voz (Click para Iniciar/Detener)"; // Corrected: UI_DOM.voiceButton
                if (geminiApiKey && !isLLMLoading) enableChatControls(false); // Habilitar mientras procesa audio
                
                stream.getTracks().forEach(track => track.stop()); 
                
                if (audioChunks.length === 0) {
                    addMessageToChatLog("No se grabó audio o el audio está vacío.", 'ai', true);
                    return;
                }

                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                audioChunks = []; 
                                
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64AudioWithPrefix = reader.result;
                    const base64Audio = base64AudioWithPrefix.substring(base64AudioWithPrefix.indexOf(',') + 1);
                    
                    addMessageToChatLog("Audio grabado. Transcribiendo...", 'user'); 
                    
                    // Moved isLLMLoading and enableChatControls before the async call
                    isLLMLoading = true; 
                    enableChatControls(true); 
                    const loadingTranscription = addMessageToChatLog("Transcribiendo con IA...", 'ai', false, true);

                    try {
                        const transcription = await transcribeAudioWithGemini(base64Audio, mediaRecorder.mimeType); 
                        removeLoadingIndicator(); 
                        if (transcription && transcription.trim() !== "") {
                            addMessageToChatLog(`Transcripción: "${transcription}"`, 'ai');
                            // handleSendUserInput will manage isLLMLoading and enableChatControls upon its completion/failure.
                            await handleSendUserInput(transcription); 
                        } else {
                            addMessageToChatLog("No se pudo obtener la transcripción del audio o estaba vacía.", 'ai', true);
                            isLLMLoading = false; 
                            if (geminiApiKey) enableChatControls(false);
                        }
                    } catch (error) {
                        removeLoadingIndicator();
                        console.error("Error en transcripción de audio (desde toggleAudioRecording):", error);
                        addMessageToChatLog(`Error al transcribir: ${error.message}`, 'ai', true);
                        isLLMLoading = false; 
                        if (geminiApiKey) enableChatControls(false);
                    } 
                };
                reader.onerror = (error) => {
                    console.error("Error leyendo el audioBlob:", error);
                    addMessageToChatLog("Error al procesar el audio grabado.", "ai", true);
                    removeLoadingIndicator(); // Ensure loading indicator is removed on error
                    isLLMLoading = false; 
                    if (geminiApiKey) enableChatControls(false);
                };
            };
            mediaRecorder.onerror = (event) => {
                console.error("Error en MediaRecorder:", event.error);
                addMessageToChatLog(`Error de grabación: ${event.error.name}`, "ai", true);
                if(UI_DOM.voiceButton) UI_DOM.voiceButton.textContent = '🎙️'; // Corrected: UI_DOM.voiceButton
                if(UI_DOM.voiceButton) UI_DOM.voiceButton.title = "Grabar Voz (Click para Iniciar/Detener)"; // Corrected: UI_DOM.voiceButton
                removeLoadingIndicator(); // Ensure loading indicator is removed on error
                isLLMLoading = false;
                if (geminiApiKey) enableChatControls(false);
                if (stream && typeof stream.getTracks === 'function') { // Check if stream exists and has getTracks
                    stream.getTracks().forEach(track => track.stop()); 
                }
            };

            mediaRecorder.start();
            if(UI_DOM.voiceButton) UI_DOM.voiceButton.textContent = '🛑'; // Corrected: UI_DOM.voiceButton
            if(UI_DOM.voiceButton) UI_DOM.voiceButton.title = "Detener Grabación"; // Corrected: UI_DOM.voiceButton
            addMessageToChatLog("Grabando audio... Haz clic en 🛑 para detener.", 'ai');
            // No deshabilitar controles aquí, solo el botón de voz cambia de estado.
            // El usuario puede seguir escribiendo si quiere.

        } catch (err) {
            console.error("Error al acceder al micrófono o iniciar grabación:", err);
            let userMessage = "Error al acceder al micrófono. Asegúrate de haber dado permisos.";
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                userMessage = "Permiso para acceder al micrófono denegado. Por favor, habilítalo en la configuración de tu navegador.";
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError"){
                userMessage = "No se encontró un dispositivo de micrófono.";
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError" || err.name === "OverconstrainedError" || err.name === "AbortError") {
                userMessage = "El micrófono está siendo usado por otra aplicación, hay un problema con el hardware/configuración, o la solicitud fue abortada.";
            }
            addMessageToChatLog(userMessage, 'ai', true);
            if(UI_DOM.voiceButton) UI_DOM.voiceButton.textContent = '🎙️'; // Corrected: UI_DOM.voiceButton
            if(UI_DOM.voiceButton) UI_DOM.voiceButton.title = "Grabar Voz (Click para Iniciar/Detener)"; // Corrected: UI_DOM.voiceButton
            // Asegurar que los controles se habilitan y el estado de carga se resetea si falla getUserMedia
            isLLMLoading = false;
            if (geminiApiKey) enableChatControls(false);
        }
    }
}

async function processLLMResponse(aiResult) {
    if (typeof aiResult !== 'object' || aiResult === null) {
        addMessageToChatLog("Error: La respuesta de la IA no es un objeto JSON válido (estructura general).", 'ai', true);
        console.error("Respuesta inválida de IA recibida en processLLMResponse:", aiResult);
        return;
    }

    // Primero mostrar el responseText del LLM
    const responseTextForUser = aiResult.responseText || (aiResult.action === 'CLARIFY' ? aiResult.clarificationQuestion : "Acción procesada.");
    let messageType = 'ai';
    if (aiResult.action === 'CLARIFY') messageType = 'clarification';
    
    addMessageToChatLog(responseTextForUser, messageType);

    // Acciones que no modifican la DB o no necesitan más procesamiento aquí
    if (['CLARIFY', 'GREETING', 'NOT_UNDERSTOOD', 'INFO_EXTERNAL', 'HELP_COMMAND'].includes(aiResult.action)) {
        if (aiResult.action === 'INFO_EXTERNAL') {
            console.log("INFO_EXTERNAL solicitada, query:", aiResult.externalQuery);
        }
        // Para HELP_COMMAND, el responseText ya fue añadido al log por el bloque anterior.
        // Y no necesita más procesamiento.
        if (aiResult.action === 'HELP_COMMAND') {
            console.log("Comando de AYUDA procesado, info:", aiResult.data || "Ayuda general");
        }
        return; // Importante: Detener el procesamiento para estas acciones
    }

    const entity = aiResult.entity;
    let rawDataFromLLM = aiResult.data || {};
    let dataForDb = resolveEntityNamesToIds(rawDataFromLLM, entity); // db.js

    const collectionName = getCollectionNameForEntity(entity); // db.js

    if (!collectionName && ['CREATE', 'READ', 'UPDATE', 'DELETE'].includes(aiResult.action)) {
        addMessageToChatLog(`Error interno: Entidad "${entity}" no reconocida.`, 'ai', true);
        return;
    }
    
    console.groupCollapsed(`LLM Action: ${aiResult.action} on Entity: ${entity}`);
    console.log("Raw Data from LLM:", JSON.parse(JSON.stringify(rawDataFromLLM)));
    console.log("Resolved Data for DB:", JSON.parse(JSON.stringify(dataForDb)));
    console.groupEnd();

    let operationSuccessful = false;
    let additionalMessage = ""; // Para mensajes de éxito o listas

    switch (aiResult.action) {
        case 'CREATE':
            // ... (lógica de CREATE como antes, usando dataForDb) ...
            if (!db[collectionName]) {
                addMessageToChatLog(`Error interno: Colección "${collectionName}" para entidad "${entity}" no existe.`, 'ai', true); break;
            }
            // Validaciones robustas
            if (entity === 'Field' && (!dataForDb.name || dataForDb.name.trim() === '')) {
                addMessageToChatLog(`Error: Se necesita un nombre para crear un Campo.`, 'ai', true); break;
            }
            if (entity === 'Lot' && (!dataForDb.name || !dataForDb.fieldId)) {
                addMessageToChatLog(`Error: Para crear un Lote se necesita un nombre y asociarlo a un Campo existente (ID: ${dataForDb.fieldId}, Nombre buscado: "${dataForDb.fieldName || ''}").`, 'ai', true); break;
            }
            if (entity === 'Parcel' && (!dataForDb.name || !dataForDb.lotId)) {
                addMessageToChatLog(`Error: Para crear una Parcela se necesita un nombre y asociarla a un Lote existente (ID: ${dataForDb.lotId}, Nombre buscado: "${dataForDb.lotName || ''}").`, 'ai', true); break;
            }
            if (entity === 'JobEvent' && (!dataForDb.taskId || !dataForDb.parcelId || !dataForDb.dateTimeScheduled)) {
                let missing = [];
                if(!dataForDb.taskId) missing.push(`tarea (buscada como: "${dataForDb.taskName || '?'}")`);
                if(!dataForDb.parcelId) missing.push(`parcela (buscada como: "${dataForDb.parcelName || '?'}")`);
                if(!dataForDb.dateTimeScheduled) missing.push("fecha programada");
                addMessageToChatLog(`Error: Faltan datos críticos para crear el Trabajo/Evento: ${missing.join(', ')}. Asegúrate que las entidades referenciadas existan y la fecha sea válida.`, 'ai', true); break;
            }

            const newItem = { id: generateId(entity.substring(0, 3).toLowerCase() + '_'), ...dataForDb };
            if (['Field', 'Campaign'].includes(entity)) newItem.clientId = db.config.currentClientId;
            if (entity === 'User' && !newItem.clientId) newItem.clientId = db.config.currentClientId; 
            if (entity === 'JobEvent' && !newItem.status) newItem.status = 'Scheduled';

            let alreadyExists = false;
            // ... (chequeo de alreadyExists como antes, usando newItem) ...
            if (entity === 'Field' && db.fields.some(f => f.clientId === newItem.clientId && normalizeString(f.name) === normalizeString(newItem.name))) alreadyExists = true;
            if (entity === 'Lot' && db.lots.some(l => l.fieldId === newItem.fieldId && normalizeString(l.name) === normalizeString(newItem.name))) alreadyExists = true;
            if (entity === 'Parcel' && db.parcels.some(p => p.lotId === newItem.lotId && normalizeString(p.name) === normalizeString(newItem.name))) alreadyExists = true;
            if (['TaskDefinition', 'ProductInsume', 'Machinery', 'Personnel', 'Campaign', 'Client', 'User'].includes(entity) && 
                db[collectionName].some(item => normalizeString(item.name) === normalizeString(newItem.name) && 
                ( (entity === 'Campaign' && item.clientId === newItem.clientId) || 
                  (entity === 'User' && item.clientId === newItem.clientId) || // Usuarios únicos por nombre DENTRO de un cliente
                  (!['Campaign', 'User'].includes(entity)) ) // Otros son únicos globalmente por nombre
                )) {
                alreadyExists = true;
            }

            if (alreadyExists) {
                addMessageToChatLog(`Error: Ya existe un/a ${entity} con el nombre "${newItem.name}" en el contexto actual. No se creó un duplicado.`, 'ai', true);
                break;
            }

            db[collectionName].push(newItem);
            operationSuccessful = true;
            // responseText del LLM ya debería indicar éxito.
            break;

        case 'READ':
            if (!db[collectionName]) {
                addMessageToChatLog(`Error interno: Colección "${collectionName}" para entidad "${entity}" no existe.`, 'ai', true); break;
            }
            console.log(`Procesando READ para ${entity} con filtros resueltos:`, dataForDb.filters);
            
            let results = db[collectionName];
            const currentClientId = db.config.currentClientId;

            // Aplicar filtro de cliente actual para entidades que lo requieren
            if (['Field', 'Campaign', 'User'].includes(entity)) {
                results = results.filter(item => item.clientId === currentClientId);
            } else if (entity === 'Lot') {
                results = results.filter(item => db.fields.some(f => f.id === item.fieldId && f.clientId === currentClientId));
            } else if (entity === 'Parcel') {
                results = results.filter(item => db.lots.some(l => l.id === item.lotId && db.fields.some(f => f.id === l.fieldId && f.clientId === currentClientId)));
            } else if (entity === 'JobEvent') {
                results = results.filter(item => { /* ...lógica de filtro de cliente para JobEvent... */ 
                    let belongsToClient = false;
                    if (item.campaignId) {
                        const campaign = db.campaigns.find(c => c.id === item.campaignId);
                        if (campaign && campaign.clientId === currentClientId) belongsToClient = true;
                    }
                    if (!belongsToClient && item.parcelId) { 
                        const parcel = db.parcels.find(p => p.id === item.parcelId);
                        if (parcel) {
                            const lot = db.lots.find(l => l.id === parcel.lotId);
                            if (lot) {
                                const field = db.fields.find(f => f.id === lot.fieldId);
                                if (field && field.clientId === currentClientId) belongsToClient = true;
                            }
                        }
                    }
                    return belongsToClient;
                });
            }
            // Para Client, TaskDefinition, ProductInsume, Machinery, Personnel no filtramos por cliente aquí (son generales o su filtro es más complejo)

            // Aplicar filtros específicos del data.filters
            if (dataForDb.filters && Object.keys(dataForDb.filters).length > 0) {
                results = results.filter(item => {
                    for (const key in dataForDb.filters) {
                        const filterValue = normalizeString(dataForDb.filters[key]);
                        let itemValue;
                        // Manejar claves de filtro que pueden referirse a nombres de entidades relacionadas
                        if (key === 'fieldName' && entity === 'JobEvent' && item.parcelId) {
                            const parcel = db.parcels.find(p => p.id === item.parcelId);
                            const lot = parcel ? db.lots.find(l => l.id === parcel.lotId) : null;
                            const field = lot ? db.fields.find(f => f.id === lot.fieldId) : null;
                            itemValue = field ? normalizeString(field.name) : '';
                        } else if (key === 'lotName' && entity === 'JobEvent' && item.parcelId) {
                            const parcel = db.parcels.find(p => p.id === item.parcelId);
                            const lot = parcel ? db.lots.find(l => l.id === parcel.lotId) : null;
                            itemValue = lot ? normalizeString(lot.name) : '';
                        } else if (key === 'parcelName' && entity === 'JobEvent' && item.parcelId) {
                             const parcel = db.parcels.find(p => p.id === item.parcelId);
                             itemValue = parcel ? normalizeString(parcel.name) : '';
                        } else {
                           itemValue = item[key] ? normalizeString(item[key]) : undefined;
                        }
                        
                        if (itemValue === undefined || !itemValue.includes(filterValue)) {
                            return false; // No coincide con este filtro
                        }
                    }
                    return true; // Coincide con todos los filtros
                });
            }

            // Comprobar si hay datos agrupados para mostrar
            if (aiResult.data && aiResult.data.grouping && aiResult.data.grouping.groupBy && aiResult.data.grouping.groupBy.length > 0) {
                const groupByFields = aiResult.data.grouping.groupBy;
                try {
                    console.log(`Client-side grouping by: ${groupByFields.join(', ')} for ${results.length} items.`);
                    const groupedClientData = performClientSideGrouping(results, groupByFields, entity); // Pass entity for context
                    displayGroupedData(groupedClientData, entity, groupByFields);
                    // For grouped data, additionalMessage is usually not needed as responseText from LLM should suffice.
                    // And displayGroupedData updates the UI directly.
                    additionalMessage = ""; // Clear any previous listing message
                } catch (groupingError) {
                    console.error("Error during client-side grouping:", groupingError);
                    addMessageToChatLog(`Error al intentar agrupar los datos: ${groupingError.message}`, 'ai', true);
                    // Fallback to showing non-grouped results if grouping fails
                    resetDataManagementPanelToDefaultLists();
                    updateAllDisplayedLists();
                    additionalMessage = `Se encontraron ${results.length} ${entity}(s) pero ocurrió un error al agruparlos. Mostrando lista sin agrupar.`;
                }
            } else if (results.length > 0) {
                // Si no hay datos agrupados, pero sí resultados planos, limpiamos el panel de gestión
                // para asegurar que no queden vistas agrupadas anteriores y mostramos las listas normales.
                // Llamamos a la función de ui.js para regenerar el panel.
                resetDataManagementPanelToDefaultLists(); // de ui.js
                updateAllDisplayedLists(); // Mostrar las listas normales si no hay agrupación

                additionalMessage = `Encontrados ${results.length} ${entity}(s):\n`;
                results.slice(0, 15).forEach(item => { // Mostrar máximo 15 para no saturar el chat
                    let displayName = item.name || item.taskName || item.id;
                     if (entity === 'JobEvent') {
                        const task = db.tasksList.find(t=>t.id === item.taskId);
                        const parcel = db.parcels.find(p=>p.id === item.parcelId);
                        displayName = `${task?.taskName || '?'} en ${parcel?.name || '?'} (${item.status}, ID: ${item.id.substring(0,4)})`;
                    } else if (entity === 'Lot') {
                        const field = db.fields.find(f=>f.id === item.fieldId);
                        displayName = `${item.name} (en Campo: ${field?.name || '?'}, ID: ${item.id.substring(0,4)})`;
                    } else if (entity === 'Parcel') {
                         const lot = db.lots.find(l=>l.id === item.lotId);
                        displayName = `${item.name} (en Lote: ${lot?.name || '?'}, ID: ${item.id.substring(0,4)})`;
                    } else if (item.id) {
                        displayName = `${item.name || item.taskName} (ID: ${item.id.substring(0,4)})`;
                    }
                    additionalMessage += `- ${displayName}\n`;
                });
                if (results.length > 15) {
                    additionalMessage += `...y ${results.length - 15} más.\n`;
                }
            } else {
                additionalMessage = `No se encontraron ${entity} que coincidan con los criterios.`;
            }
            // Only add 'additionalMessage' if it contains something meaningful
            if (additionalMessage && additionalMessage.trim() !== "") {
                addMessageToChatLog(additionalMessage, 'ai');
            }
            break;

        case 'UPDATE':
            // ... (lógica de UPDATE como antes, usando dataForDb) ...
            // ... pero ahora la desambiguación de nombre debe ser más robusta
             if (!db[collectionName]) {
                addMessageToChatLog(`Error interno: Colección "${collectionName}" para entidad "${entity}" no existe.`, 'ai', true); break;
            }
            const criteriaToUpdate = dataForDb.criteria || { id: dataForDb.id, name: dataForDb.name }; 
            const newData = dataForDb.nuevosDatos;

            if (!newData || Object.keys(newData).length === 0) {
                addMessageToChatLog(`Error: No se especificaron datos para actualizar en ${entity}.`, 'ai', true); break;
            }
            
            let itemIndexToUpdate = -1;
            if (criteriaToUpdate.id) { 
                itemIndexToUpdate = db[collectionName].findIndex(item => item.id === criteriaToUpdate.id);
            } else if (criteriaToUpdate.name) { 
                let potentialMatches = db[collectionName].filter(item => normalizeString(item.name) === normalizeString(criteriaToUpdate.name));
                // Desambiguar usando contexto resuelto en dataForDb
                if (entity === 'Lot' && dataForDb.fieldId) { 
                    potentialMatches = potentialMatches.filter(item => item.fieldId === dataForDb.fieldId);
                } else if (entity === 'Parcel' && dataForDb.lotId) { 
                    potentialMatches = potentialMatches.filter(item => item.lotId === dataForDb.lotId);
                } else if (['Field', 'Campaign', 'User'].includes(entity)) {
                    potentialMatches = potentialMatches.filter(item => item.clientId === db.config.currentClientId);
                }

                if (potentialMatches.length === 1) {
                    itemIndexToUpdate = db[collectionName].indexOf(potentialMatches[0]);
                } else if (potentialMatches.length > 1) {
                     addMessageToChatLog(`Error: Múltiples ${entity} con nombre "${criteriaToUpdate.name}" encontrados en el contexto actual. Sea más específico (ej. con ID).`, 'ai', true); break;
                }
            }

            if (itemIndexToUpdate > -1) {
                const resolvedNewData = resolveEntityNamesToIds(newData, entity); 
                db[collectionName][itemIndexToUpdate] = { ...db[collectionName][itemIndexToUpdate], ...resolvedNewData };
                operationSuccessful = true;
            } else {
                addMessageToChatLog(`No se encontró ${entity} con criterios (ID: ${criteriaToUpdate.id}, Nombre: ${criteriaToUpdate.name}) para actualizar en el contexto actual.`, 'ai', true);
            }
            break;

        case 'DELETE':
            // ... (lógica de DELETE como antes, usando dataForDb) ...
            if (!db[collectionName]) {
                addMessageToChatLog(`Error interno: Colección "${collectionName}" para entidad "${entity}" no existe.`, 'ai', true); break;
            }
            const criteriaToDelete = dataForDb.criteria || { id: dataForDb.id, name: dataForDb.name };
            let originalLength = db[collectionName].length;
            let itemsActuallyDeleted = 0;
            
            db[collectionName] = db[collectionName].filter(item => {
                let shouldDelete = false;
                if (criteriaToDelete.id && item.id === criteriaToDelete.id) {
                    shouldDelete = true;
                } else if (!criteriaToDelete.id && criteriaToDelete.name && normalizeString(item.name) === normalizeString(criteriaToDelete.name)) {
                    let contextMatch = true; 
                    if (entity === 'Lot' && dataForDb.fieldId && item.fieldId !== dataForDb.fieldId) contextMatch = false;
                    else if (entity === 'Parcel' && dataForDb.lotId && item.lotId !== dataForDb.lotId) contextMatch = false;
                    else if (['Field', 'Campaign', 'User'].includes(entity) && item.clientId !== db.config.currentClientId) contextMatch = false;
                    
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
    // updateAllDisplayedLists is called here, but for READ with grouping, it might be redundant
    // if displayGroupedData already took over the panel.
    // However, if grouping failed and we fell back, or for other actions, it's needed.
    // For READ actions without grouping, or if grouping failed, it's essential.
    if (!(aiResult.action === 'READ' && aiResult.data && aiResult.data.grouping && aiResult.data.grouping.groupBy && aiResult.data.grouping.groupBy.length > 0 && additionalMessage === "")) {
        updateAllDisplayedLists();
    }
}


function getResolvedName(value, fieldName) {
    // Helper to resolve IDs to names for grouping
    if (!value) return value || "N/A"; // Return "N/A" if value is null/undefined

    switch (fieldName) {
        case 'clientId':
            return db.clients.find(c => c.id === value)?.name || value;
        case 'fieldId':
            return db.fields.find(f => f.id === value)?.name || value;
        case 'lotId':
            const lot = db.lots.find(l => l.id === value);
            if (lot) {
                const field = db.fields.find(f => f.id === lot.fieldId);
                return `${lot.name} (Campo: ${field?.name || lot.fieldId})`;
            }
            return value;
        case 'parcelId':
            const parcel = db.parcels.find(p => p.id === value);
            if (parcel) {
                const lot = db.lots.find(l => l.id === parcel.lotId);
                const field = lot ? db.fields.find(f => f.id === lot.fieldId) : null;
                return `${parcel.name} (Lote: ${lot?.name || parcel.lotId}, Campo: ${field?.name || lot?.fieldId})`;
            }
            return value;
        case 'taskId':
            return db.tasksList.find(t => t.id === value)?.taskName || value;
        case 'campaignId':
            return db.campaigns.find(c => c.id === value)?.name || value;
        // Add other ID to Name resolutions as needed (e.g., machineryId, personnelId)
        default:
            return value;
    }
}


function performClientSideGrouping(items, groupByFields, entityContext = null) {
    if (!groupByFields || groupByFields.length === 0) {
        return items; // Base case: no fields to group by, or actual items for the lowest level
    }

    const currentField = groupByFields[0];
    const remainingFields = groupByFields.slice(1);
    
    // Special handling for JobEvent fieldName, lotName, parcelName as they are not direct properties
    let getGroupValue;
    if (entityContext === 'JobEvent') {
        if (currentField === 'fieldName') {
            getGroupValue = (item) => {
                const parcel = db.parcels.find(p => p.id === item.parcelId);
                const lot = parcel ? db.lots.find(l => l.id === parcel.lotId) : null;
                const field = lot ? db.fields.find(f => f.id === lot.fieldId) : null;
                return field ? field.name : "Campo Desconocido";
            };
        } else if (currentField === 'lotName') {
             getGroupValue = (item) => {
                const parcel = db.parcels.find(p => p.id === item.parcelId);
                const lot = parcel ? db.lots.find(l => l.id === parcel.lotId) : null;
                return lot ? lot.name : "Lote Desconocido";
            };
        } else if (currentField === 'parcelName') {
            getGroupValue = (item) => db.parcels.find(p => p.id === item.parcelId)?.name || "Parcela Desconocida";
        } else {
             getGroupValue = (item) => item[currentField]; // Standard property access
        }
    } else {
        getGroupValue = (item) => item[currentField]; // Standard property access
    }


    const grouped = items.reduce((acc, item) => {
        let value = getGroupValue(item);
        
        // Resolve ID to name for groupName if currentField is an ID field
        // For JobEvent context, if grouping by fieldName, lotName, parcelName, value is already name.
        let groupNameDisplay = value;
        if (entityContext !== 'JobEvent' || !['fieldName', 'lotName', 'parcelName'].includes(currentField)) {
             groupNameDisplay = getResolvedName(value, currentField);
        }
        groupNameDisplay = groupNameDisplay || "N/A";


        (acc[groupNameDisplay] = acc[groupNameDisplay] || []).push(item);
        return acc;
    }, {});

    return Object.entries(grouped).map(([groupName, groupItems]) => {
        return {
            groupName: groupName,
            items: performClientSideGrouping(groupItems, remainingFields, entityContext) // Recursive call
        };
    }).sort((a, b) => a.groupName.localeCompare(b.groupName)); // Sort groups by name
}


// ----- FUNCIONES DE MANEJO DE ARCHIVOS -----
function handleSaveDbToFile() {
    // ... (como antes) ...
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
    // ... (como antes) ...
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const loadedDbData = JSON.parse(e.target.result);
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
                conversationHistoryLLM = []; // de llm.js
                addMessageToChatLog("Base de datos cargada desde archivo JSON. El historial de chat ha sido reiniciado.", 'ai');
            } else {
                throw new Error("El archivo JSON no tiene la estructura esperada completa de la base de datos FarmerChat.");
            }
        } catch (err) {
            console.error("Error al cargar DB desde archivo:", err);
            addMessageToChatLog(`Error al cargar el archivo: ${err.message}`, 'ai', true);
        } finally {
            if (UI_DOM.loadDbFile) UI_DOM.loadDbFile.value = ''; // Corrected: UI_DOM.loadDbFile
        }
    };
    reader.readAsText(file);
}

function handleImportCsv() {
    // ... (como antes) ...
    const selectedCollectionKey = UI_DOM.entityTypeSelector.value; // Corrected: UI_DOM.entityTypeSelector
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

    const file = UI_DOM.csvFileInput.files[0]; // Corrected: UI_DOM.csvFileInput
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
            if (UI_DOM.csvFileInput) UI_DOM.csvFileInput.value = ''; // Corrected: UI_DOM.csvFileInput
        }
    };
    reader.readAsText(file);
}