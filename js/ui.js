// js/ui.js

// Definimos UI_DOM globalmente para que otros módulos puedan accederlo si es necesario,
// aunque es mejor práctica que cada módulo obtenga sus propias referencias o se las pasen.
// En este caso, main.js también definirá su propio objeto DOM para los elementos que maneja directamente.
const UI_DOM = {
    apiKeyOverlay: document.getElementById('api-key-overlay'),
    apiKeyInput: document.getElementById('api-key-input'),
    saveApiKeyButton: document.getElementById('save-api-key-button'),
    chatLog: document.getElementById('chat-log'),
    userInput: document.getElementById('user-input'),
    sendButton: document.getElementById('send-button'),
    voiceButton: document.getElementById('voice-button'),
    entityTypeSelector: document.getElementById('entity-type-selector'),
    csvFileInput: document.getElementById('csv-file-input'),
    importCsvButton: document.getElementById('import-csv-button'),
    loadDbButton: document.getElementById('load-db-button'),
    loadDbFile: document.getElementById('load-db-file'),
    saveDbButton: document.getElementById('save-db-button'),
    // Spans para contadores
    clientsCount: document.getElementById('clients-count'), // AÑADIDO
    usersCount: document.getElementById('users-count'),     // AÑADIDO
    fieldsCount: document.getElementById('fields-count'),
    lotsCount: document.getElementById('lots-count'),
    parcelsCount: document.getElementById('parcels-count'),
    jobsCount: document.getElementById('jobs-count'),
    // ULs para listas
    clientsList: document.getElementById('clients-list'), // AÑADIDO
    usersList: document.getElementById('users-list'),     // AÑADIDO
    fieldsList: document.getElementById('fields-list'),
    lotsList: document.getElementById('lots-list'),
    parcelsList: document.getElementById('parcels-list'),
    jobsList: document.getElementById('jobs-list'),
};

function showApiKeyModal() {
    if (UI_DOM.apiKeyOverlay) UI_DOM.apiKeyOverlay.style.display = 'flex';
}

function hideApiKeyModal() {
    if (UI_DOM.apiKeyOverlay) UI_DOM.apiKeyOverlay.style.display = 'none';
}

function enableChatControls(isLoading = false) {
    if (UI_DOM.userInput) UI_DOM.userInput.disabled = isLoading;
    if (UI_DOM.sendButton) UI_DOM.sendButton.disabled = isLoading;
    if (UI_DOM.voiceButton) UI_DOM.voiceButton.disabled = isLoading; // También deshabilitar voz durante carga de LLM
}

function disableChatControls() { // Esta función ahora es más genérica para deshabilitar todo.
    enableChatControls(true); // Llama a la de arriba con isLoading = true
}


function addMessageToChatLog(text, sender, isError = false, isLoadingMessage = false) {
    if (!UI_DOM.chatLog) return null; // Comprobación
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message');
    let dynamicId = null;

    if (isLoadingMessage) {
        messageDiv.classList.add('loading-indicator');
        dynamicId = 'loading-msg-' + Date.now();
        messageDiv.id = dynamicId;
    } else if (isError) {
        messageDiv.classList.add('error-message');
    } else {
        messageDiv.classList.add(`${sender}-message`);
    }
    messageDiv.innerHTML = text.replace(/\n/g, '<br>');
    UI_DOM.chatLog.appendChild(messageDiv);
    UI_DOM.chatLog.scrollTop = UI_DOM.chatLog.scrollHeight;
    return dynamicId ? document.getElementById(dynamicId) : messageDiv;
}

function removeLoadingIndicator() {
    if (!UI_DOM.chatLog) return;
    const loadingMsg = UI_DOM.chatLog.querySelector('.loading-indicator');
    if (loadingMsg) {
        loadingMsg.remove();
    }
}

function renderEntityList(entityKeyInDb, listUlId, countSpanId) {
    const listUlElement = document.getElementById(listUlId);
    const countSpanElement = document.getElementById(countSpanId);

    if (!listUlElement || !countSpanElement) {
        return;
    }
    listUlElement.innerHTML = '';
    let itemsToRender = db[entityKeyInDb] || []; // Accede a la 'db' global de db.js
    const currentClientId = db.config?.currentClientId; // Manejar db.config indefinido

    // Filtrado específico por cliente
    if (currentClientId) { // Solo filtrar si hay un cliente actual configurado
        if (entityKeyInDb === 'users') { // Usuarios se filtran por su clientId
            itemsToRender = itemsToRender.filter(item => item.clientId === currentClientId);
        } else if (['fields', 'campaigns'].includes(entityKeyInDb)) {
            itemsToRender = itemsToRender.filter(item => item.clientId === currentClientId);
        } else if (entityKeyInDb === 'lots') {
            itemsToRender = itemsToRender.filter(item => {
                const field = db.fields.find(f => f.id === item.fieldId);
                return field && field.clientId === currentClientId;
            });
        } else if (entityKeyInDb === 'parcels') {
            itemsToRender = itemsToRender.filter(item => {
                const lot = db.lots.find(l => l.id === item.lotId);
                if(lot) {
                    const field = db.fields.find(f => f.id === lot.fieldId);
                    return field && field.clientId === currentClientId;
                }
                return false;
            });
        } else if (entityKeyInDb === 'jobsEvents') {
            itemsToRender = itemsToRender.filter(item => {
                // ... (lógica de filtrado de jobsEvents como antes) ...
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
        // Clientes no se filtran por currentClientId, se muestran todos.
        // tasksList, productsInsumes, machineries, personnel son generales o su clientId es opcional.
    }
    
    countSpanElement.textContent = itemsToRender.length;
    itemsToRender.forEach(item => {
        const li = document.createElement('li');
        let displayText = `${item.name || item.taskName || `ID: ${item.id}`}`;
        if (entityKeyInDb === 'users') {
            displayText = `${item.name} (Rol: ${item.role || 'N/A'}, ClienteID: ${item.clientId})`;
        } else if (entityKeyInDb === 'clients') {
             displayText = `${item.name} (ID: ${item.id})`;
        }
        // ... (resto de la lógica de displayText como antes) ...
        else if (entityKeyInDb === 'jobsEvents') {
            const task = db.tasksList.find(t => t.id === item.taskId);
            const parcel = db.parcels.find(p => p.id === item.parcelId);
            displayText = `${task ? task.taskName : '(Tarea Desconocida)'} en ${parcel ? parcel.name : '(Parcela Desconocida)'} - ${item.status || 'N/D'}`;
            if(item.dateTimeScheduled) {
                try {
                    displayText += ` (Prog: ${new Date(item.dateTimeScheduled).toLocaleDateString()})`;
                } catch (e) { /* ignorar fecha inválida */ }
            }
        } else if (entityKeyInDb === 'lots') {
            const field = db.fields.find(f => f.id === item.fieldId);
            displayText = `${item.name} (Campo: ${field ? field.name : 'ID ' + item.fieldId})`;
        } else if (entityKeyInDb === 'parcels') {
            const lot = db.lots.find(l => l.id === item.lotId);
            displayText = `${item.name} (Lote: ${lot ? lot.name : 'ID ' + item.lotId})`;
        }
        li.textContent = displayText;
        listUlElement.appendChild(li);
    });
}

function updateAllDisplayedLists() {
    renderEntityList('clients', 'clients-list', 'clients-count'); // AÑADIDO
    renderEntityList('users', 'users-list', 'users-count');       // AÑADIDO
    renderEntityList('fields', 'fields-list', 'fields-count');
    renderEntityList('lots', 'lots-list', 'lots-count');
    renderEntityList('parcels', 'parcels-list', 'parcels-count');
    renderEntityList('jobsEvents', 'jobs-list', 'jobs-count');
}