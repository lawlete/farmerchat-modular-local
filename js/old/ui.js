// js/ui.js

// DOM está definido globalmente en ui.js, así que todos los módulos pueden acceder a él
// si ui.js se carga primero. Sin embargo, es mejor que cada módulo que lo necesite
// declare su propio acceso o que se pase como parámetro.
// Por ahora, asumimos que main.js inicializa las referencias a los elementos del DOM
// y otras funciones de ui.js acceden a esas referencias.

// DOM (definido aquí para que ui.js sea autocontenido en sus funciones)
const UI_DOM = {
    apiKeyOverlay: document.getElementById('api-key-overlay'),
    apiKeyInput: document.getElementById('api-key-input'),
    saveApiKeyButton: document.getElementById('save-api-key-button'),
    chatLog: document.getElementById('chat-log'),
    userInput: document.getElementById('user-input'),
    sendButton: document.getElementById('send-button'),
    voiceButton: document.getElementById('voice-button'),
    // ... (resto de los elementos del DOM como en la versión anterior)
    entityTypeSelector: document.getElementById('entity-type-selector'),
    csvFileInput: document.getElementById('csv-file-input'),
    importCsvButton: document.getElementById('import-csv-button'),
    loadDbButton: document.getElementById('load-db-button'),
    loadDbFile: document.getElementById('load-db-file'),
    saveDbButton: document.getElementById('save-db-button'),
    fieldsCount: document.getElementById('fields-count'),
    lotsCount: document.getElementById('lots-count'),
    parcelsCount: document.getElementById('parcels-count'),
    jobsCount: document.getElementById('jobs-count'),
    fieldsList: document.getElementById('fields-list'),
    lotsList: document.getElementById('lots-list'),
    parcelsList: document.getElementById('parcels-list'),
    jobsList: document.getElementById('jobs-list'),
};

function showApiKeyModal() {
    UI_DOM.apiKeyOverlay.style.display = 'flex';
}

function hideApiKeyModal() {
    UI_DOM.apiKeyOverlay.style.display = 'none';
}

function enableChatControls() {
    UI_DOM.userInput.disabled = false;
    UI_DOM.sendButton.disabled = false;
    UI_DOM.voiceButton.disabled = false;
}

function disableChatControls() { // Solo deshabilita input y send
    UI_DOM.userInput.disabled = true;
    UI_DOM.sendButton.disabled = true;
}

function addMessageToChatLog(text, sender, isError = false, isLoadingMessage = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message');
    let dynamicId = null;

    if (isLoadingMessage) {
        messageDiv.classList.add('loading-indicator');
        dynamicId = 'loading-msg-' + Date.now(); // ID único
        messageDiv.id = dynamicId;
    } else if (isError) {
        messageDiv.classList.add('error-message');
    } else {
        messageDiv.classList.add(`${sender}-message`);
    }
    messageDiv.innerHTML = text.replace(/\n/g, '<br>');
    UI_DOM.chatLog.appendChild(messageDiv);
    UI_DOM.chatLog.scrollTop = UI_DOM.chatLog.scrollHeight;
    return dynamicId ? document.getElementById(dynamicId) : messageDiv; // Devolver el elemento
}

function removeLoadingIndicator() { // Modificado para no depender de un ID fijo
    const loadingMsg = UI_DOM.chatLog.querySelector('.loading-indicator');
    if (loadingMsg) {
        loadingMsg.remove();
    }
}

function renderEntityList(entityKeyInDb, listUlId, countSpanId) {
    const listUlElement = document.getElementById(listUlId);
    const countSpanElement = document.getElementById(countSpanId);

    if (!listUlElement || !countSpanElement) {
        // console.warn(`UI Elements not found for list: ${listUlId} or ${countSpanId}`);
        return;
    }
    listUlElement.innerHTML = '';
    let itemsToRender = db[entityKeyInDb] || [];
    const currentClientId = db.config.currentClientId;

    // Filtrado (como antes)
    // ... (COPIA LA LÓGICA DE FILTRADO DE renderEntityList DE LA RESPUESTA ANTERIOR - ui.js) ...
    if (['fields', 'campaigns'].includes(entityKeyInDb)) {
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
            let belongsToClient = false;
            if (item.campaignId) {
                const campaign = db.campaigns.find(c => c.id === item.campaignId);
                if (campaign && campaign.clientId === currentClientId) belongsToClient = true;
            }
            if (!belongsToClient && item.parcelId) { // Si no tiene campaña o no es del cliente, chequear parcela
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


    countSpanElement.textContent = itemsToRender.length;
    itemsToRender.forEach(item => {
        const li = document.createElement('li');
        let displayText = `${item.name || item.taskName || `ID: ${item.id}`}`; // Fallback a ID si no hay nombre
        if (entityKeyInDb === 'jobsEvents') {
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
    renderEntityList('fields', 'fields-list', 'fields-count');
    renderEntityList('lots', 'lots-list', 'lots-count');
    renderEntityList('parcels', 'parcels-list', 'parcels-count');
    renderEntityList('jobsEvents', 'jobs-list', 'jobs-count');
}