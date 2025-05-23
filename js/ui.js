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

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-nav li[data-tab]');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetPanelId = button.getAttribute('data-tab');
            
            // Deactivate all tabs and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // Activate clicked tab and corresponding panel
            button.classList.add('active');
            const targetPanel = document.getElementById(targetPanelId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            } else {
                console.error(`Tab panel with ID ${targetPanelId} not found.`);
            }
        });
    });
}

function showApiKeyModal() {
    // Now, instead of showing a modal, we ensure the 'Configuración' tab is active
    // and the api-key section within it is visible.
    const configTabButton = document.querySelector('.tab-nav li[data-tab="tab-panel-config"]');
    if (configTabButton) {
        configTabButton.click(); // Simulate a click to activate the tab
    }
    // The #api-key-overlay div is always part of the 'tab-panel-config'
    // Its visibility is controlled by the tab panel being active.
}

function hideApiKeyModal() {
    // This function is less relevant now. If an API key is saved,
    // the user is typically allowed to proceed, maybe to the Chatbot tab.
    // We don't need to hide the #api-key-overlay div itself if it's part of a static tab.
    // If we wanted to switch to a default tab after saving the key, that logic would be in main.js.
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

function resetDataManagementPanelToDefaultLists() {
    const dataManagementPanel = document.querySelector('.data-management');
    if (!dataManagementPanel) {
        console.error("Data management panel not found for reset.");
        return;
    }

    // Clear existing content
    dataManagementPanel.innerHTML = '';

    // Add the main title
    const h2 = document.createElement('h2');
    h2.textContent = 'Gestión de Entidades';
    dataManagementPanel.appendChild(h2);

    // Define entity sections to create
    const entities = [
        { title: 'Clientes', countId: 'clients-count', listId: 'clients-list' },
        { title: 'Usuarios', countId: 'users-count', listId: 'users-list' },
        { title: 'Campos', countId: 'fields-count', listId: 'fields-list' },
        { title: 'Lotes', countId: 'lots-count', listId: 'lots-list' },
        { title: 'Parcelas', countId: 'parcels-count', listId: 'parcels-list' },
        { title: 'Trabajos/Eventos', countId: 'jobs-count', listId: 'jobs-list' }
    ];

    entities.forEach(entity => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'entity-section';

        const h3 = document.createElement('h3');
        h3.innerHTML = `${entity.title} (<span id="${entity.countId}">0</span>)`; // Use innerHTML to create span with ID

        const ul = document.createElement('ul');
        ul.id = entity.listId;

        sectionDiv.appendChild(h3);
        sectionDiv.appendChild(ul);
        dataManagementPanel.appendChild(sectionDiv);
    });

    // After recreating elements, it's a good practice to re-initialize UI_DOM elements
    // if they were directly referencing the old elements. However, since renderEntityList
    // uses getElementById, it should find the new elements as long as IDs are preserved.
    // For safety, and if other parts of ui.js directly use UI_DOM.clientsList etc.
    // without re-querying, we might need to update them.
    // Let's check if UI_DOM needs explicit updates for its list/count elements.
    // UI_DOM is defined at the top with getElementById. Functions like renderEntityList
    // also use getElementById. So, direct re-assignment of UI_DOM properties here might
    // not be strictly necessary as long as IDs are correctly set.
    // The original UI_DOM object will still hold references to the *old* elements if not updated.
    // However, functions like updateAllDisplayedLists call renderEntityList, which uses
    // document.getElementById internally, so those should work on the new elements.
    // Let's assume for now that direct re-assignment of all UI_DOM properties here is not needed,
    // as the critical functions (renderEntityList) re-fetch by ID.
}

function updateAllDisplayedLists() {
    renderEntityList('clients', 'clients-list', 'clients-count');
    renderEntityList('users', 'users-list', 'users-count');
    renderEntityList('fields', 'fields-list', 'fields-count');
    renderEntityList('lots', 'lots-list', 'lots-count');
    renderEntityList('parcels', 'parcels-list', 'parcels-count');
    renderEntityList('jobsEvents', 'jobs-list', 'jobs-count');
}

function _formatSingleEntityItem(item, entityName) {
    // Helper function to format a single entity item for display.
    // This can be expanded based on how renderEntityList formats items.
    let displayText = item.name || item.taskName || `ID: ${item.id}`;
    if (entityName === 'JobEvent') {
        const task = db.tasksList.find(t => t.id === item.taskId);
        const parcel = db.parcels.find(p => p.id === item.parcelId);
        const lot = parcel ? db.lots.find(l => l.id === parcel.lotId) : null;
        const field = lot ? db.fields.find(f => f.id === lot.fieldId) : null;
        
        let locationString = "";
        if (parcel) locationString += `Parcela: ${parcel.name}`;
        if (lot) locationString += ` (Lote: ${lot.name})`;
        if (field) locationString += ` (Campo: ${field.name})`;
        if (!locationString && item.parcelId) locationString = `ID Parcela: ${item.parcelId}`;
        if (!locationString) locationString = '(Ubicación Desconocida)';

        displayText = `${task ? task.taskName : '(Tarea Desconocida)'} en ${locationString} - ${item.status || 'N/D'}`;
        if(item.dateTimeScheduled) {
            try {
                displayText += ` (Prog: ${new Date(item.dateTimeScheduled).toLocaleDateString()})`;
            } catch (e) { /* ignorar fecha inválida */ }
        }
    } else if (entityName === 'Lot') {
        const field = db.fields.find(f => f.id === item.fieldId);
        displayText = `${item.name} (Campo: ${field ? field.name : 'ID ' + item.fieldId})`;
    } else if (entityName === 'Parcel') {
        const lot = db.lots.find(l => l.id === item.lotId);
        displayText = `${item.name} (Lote: ${lot ? lot.name : 'ID ' + item.lotId})`;
    } else if (item.id) { // Fallback for other entities
        displayText = `${item.name || item.taskName || 'Item'} (ID: ${item.id.substring(0,6)}...)`;
    }
    return displayText;
}

function _createGroupElement(group, entityName, currentLevel, maxLevel) {
    const details = document.createElement('details');
    details.open = true; // Open by default

    const summary = document.createElement('summary');
    summary.textContent = `${group.groupName || 'Grupo sin nombre'} (${group.items.length} items)`;
    summary.style.fontWeight = 'bold';
    summary.style.fontSize = `${Math.max(1, 1.2 - (0.1 * currentLevel))}em`;
    summary.style.marginLeft = `${currentLevel * 15}px`;
    details.appendChild(summary);

    const ul = document.createElement('ul');
    ul.style.marginLeft = `${currentLevel * 15}px`;

    group.items.forEach(item => {
        if (item.groupName && item.items) { // It's a subgroup
            ul.appendChild(_createGroupElement(item, entityName, currentLevel + 1, maxLevel));
        } else { // It's an entity item
            const li = document.createElement('li');
            li.textContent = _formatSingleEntityItem(item, entityName);
            ul.appendChild(li);
        }
    });
    details.appendChild(ul);
    return details;
}

function displayGroupedData(groupedData, entityName, groupByFields) {
    const dataManagementPanel = document.querySelector('.data-management');
    if (!dataManagementPanel) {
        console.error("Panel de gestión de datos no encontrado.");
        return;
    }
    dataManagementPanel.innerHTML = ''; // Clear previous content (lists, other grouped data)

    const container = document.createElement('div');
    container.className = 'grouped-results-container';

    const title = document.createElement('h2');
    title.textContent = `Resultados Agrupados para: ${entityName}`;
    if (groupByFields && groupByFields.length > 0) {
        title.textContent += ` por ${groupByFields.join(', ')}`;
    }
    container.appendChild(title);

    if (!groupedData || groupedData.length === 0) {
        const p = document.createElement('p');
        p.textContent = "No hay datos para mostrar en esta agrupación.";
        container.appendChild(p);
    } else {
        groupedData.forEach(group => {
            container.appendChild(_createGroupElement(group, entityName, 0, groupByFields.length));
        });
    }
    dataManagementPanel.appendChild(container);

    // Update counts to indicate grouped view
    const countSpans = [
        UI_DOM.clientsCount, UI_DOM.usersCount, UI_DOM.fieldsCount, 
        UI_DOM.lotsCount, UI_DOM.parcelsCount, UI_DOM.jobsCount
    ];
    let totalItems = 0;
    const countItemsRecursively = (items) => {
        items.forEach(item => {
            if (item.groupName && item.items) {
                countItemsRecursively(item.items);
            } else {
                totalItems++;
            }
        });
    };
    countItemsRecursively(groupedData);

    countSpans.forEach(span => {
        if (span) span.innerHTML = `<small>(${totalItems} items en vista agrupada)</small>`;
    });
}

// Expose addMessageToChatLog globally for csv_importer.js
window.addMessageToChatLog = addMessageToChatLog;