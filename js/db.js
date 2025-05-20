// js/db.js

let db = {
    // Estructura inicial de la base de datos en memoria
    clients: [], // Se poblará desde CSV o localStorage
    users: [],   // Se poblará desde CSV o localStorage
    fields: [],
    lots: [],
    parcels: [],
    tasksList: [ // Tareas por defecto si no se cargan
        { id: 'task_siembra_soja', taskName: 'Siembra Soja', description: 'Siembra de soja de primera.' },
        { id: 'task_siembra_maiz', taskName: 'Siembra Maíz', description: 'Siembra de maíz tardío.' },
        // ... (más tareas por defecto si quieres)
    ],
    productsInsumes: [],
    machineries: [],
    personnel: [],
    campaigns: [],
    jobsEvents: [],
    config: { // Configuración por defecto, se intentará sobreescribir con datos de CSV/localStorage
        currentClientId: 'client_01', 
        currentUser: { id: 'user_admin_ama', name: 'Roberto Carlos', role: 'Administrator' } 
    }
};

const DB_STORAGE_KEY = 'farmerChatModularDB_v2'; // Cambié la key por si hay datos viejos

function loadDbFromStorage() {
    const storedDb = localStorage.getItem(DB_STORAGE_KEY);
    let dbSuccessfullyLoaded = false;
    if (storedDb) {
        try {
            const parsedDb = JSON.parse(storedDb);
            // Validación más robusta de la DB cargada
            if (typeof parsedDb === 'object' && parsedDb !== null && parsedDb.config && parsedDb.clients && parsedDb.users) {
                db = parsedDb; // Asignar la DB parseada
                console.log("Base de datos cargada desde localStorage.");
                dbSuccessfullyLoaded = true;
            } else {
                console.warn("La estructura de la DB en localStorage no es la esperada. Usando DB por defecto.");
            }
        } catch (e) {
            console.error("Error al parsear DB desde localStorage:", e);
        }
    } else {
        console.log("No se encontró DB en localStorage, usando DB por defecto (se intentará poblar con CSVs si los cargas).");
    }

    // Asegurar que todas las colecciones esperadas existan, incluso si están vacías
    const expectedCollections = ['clients', 'users', 'fields', 'lots', 'parcels', 'tasksList', 'productsInsumes', 'machineries', 'personnel', 'campaigns', 'jobsEvents'];
    expectedCollections.forEach(col => {
        if (!db[col] || !Array.isArray(db[col])) { // Verificar que sea un array
            console.warn(`Colección '${col}' no es un array o falta en DB, inicializando como array vacío.`);
            db[col] = [];
        }
    });

    // Asegurar que 'config' sea un objeto
    if (typeof db.config !== 'object' || db.config === null) {
        console.warn("'config' no es un objeto o falta en DB, inicializando.");
        db.config = {};
    }
    
    // Establecer valores por defecto para config SI NO existen en la DB cargada
    // Estos IDs deben coincidir con los que planeas importar vía CSV para el primer cliente/usuario
    if (db.config.currentClientId === undefined) {
        db.config.currentClientId = 'client_01'; // ID del primer cliente en tu clients.csv
    }
    if (db.config.currentUser === undefined || typeof db.config.currentUser !== 'object') {
        db.config.currentUser = { id: 'user_admin_ama', name: 'Roberto Carlos', role: 'Administrator' }; // ID del primer usuario admin en tu users.csv
    }

    // Si después de todo, clients o users están vacíos (ej. primer inicio y no hay localStorage)
    // podrías añadir unos mínimos aquí, pero es mejor que vengan de CSV o de la interacción.
    if (db.clients.length === 0) {
        console.log("DB: clients está vacío. Carga el CSV de clientes.");
    }
    if (db.users.length === 0) {
        console.log("DB: users está vacío. Carga el CSV de usuarios.");
    }
    
    // Si la DB se cargó pero el currentClientId no corresponde a ningún cliente existente,
    // o currentUser.id no corresponde a ningún usuario, se podría intentar seleccionar el primero disponible.
    if (db.clients.length > 0 && !db.clients.some(c => c.id === db.config.currentClientId)) {
        console.warn(`currentClientId '${db.config.currentClientId}' no encontrado en db.clients. Seleccionando el primer cliente.`);
        db.config.currentClientId = db.clients[0].id;
    }
    if (db.users.length > 0 && !db.users.some(u => u.id === db.config.currentUser.id)) {
         console.warn(`currentUser.id '${db.config.currentUser.id}' no encontrado en db.users. Seleccionando el primer usuario.`);
        const firstUser = db.users[0];
        db.config.currentUser = { id: firstUser.id, name: firstUser.name, role: firstUser.role };
    }
    
    // Si no se cargó nada y las listas están vacías, se puede considerar la db como "inicial"
    if (!dbSuccessfullyLoaded && db.fields.length === 0) {
        // Aquí se podría llamar a una función para cargar datos por defecto si fuera necesario
        // pero por ahora, se espera que el usuario importe CSVs.
    }

    return dbSuccessfullyLoaded; // Devuelve si se cargó algo o no
}


function saveDbToStorage() {
    try {
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
        // console.log("Base de datos guardada en localStorage."); // Puede ser muy verboso
    } catch (e) {
        console.error("Error al guardar DB en localStorage:", e);
        alert("Error al guardar la base de datos en el almacenamiento local. Es posible que se haya excedido la cuota.");
    }
}

function findIdByName(entityType, name, parentContext = null) {
    const collectionName = getCollectionNameForEntity(entityType);
    if (!db[collectionName] || !name) return null;
    
    const normalizedName = normalizeString(name); // de utils.js
    let collection = db[collectionName];
    let foundItem = null;

    if (entityType === 'Lot' && parentContext && parentContext.fieldId) { // Lotes necesitan fieldId para desambiguar
        foundItem = collection.find(item => normalizeString(item.name) === normalizedName && item.fieldId === parentContext.fieldId);
    } else if (entityType === 'Parcel' && parentContext && parentContext.lotId) { // Parcelas necesitan lotId
         foundItem = collection.find(item => normalizeString(item.name) === normalizedName && item.lotId === parentContext.lotId);
    } else { // Búsqueda general por nombre normalizado para otras entidades
        // Para entidades como Field, Campaign, TaskDefinition, etc., que se asume son únicas por nombre (o únicas dentro del cliente)
        foundItem = collection.find(item => normalizeString(item.name) === normalizedName);
    }
    return foundItem ? foundItem.id : null;
}

function resolveEntityNamesToIds(dataFromLLM, entityType) {
    const resolvedData = { ...dataFromLLM }; 
    const currentClientId = db.config.currentClientId; // Usar para filtrar si es necesario

    if (resolvedData.taskName && !resolvedData.taskId) {
        resolvedData.taskId = findIdByName('TaskDefinition', resolvedData.taskName);
    }
    if (resolvedData.fieldName && !resolvedData.fieldId) {
        // Asumimos que el campo debe pertenecer al cliente actual si no se especifica otro.
        // findIdByName para 'Field' ya no necesita parentContext aquí.
        const fieldId = findIdByName('Field', resolvedData.fieldName);
        if (fieldId && db.fields.find(f => f.id === fieldId && f.clientId === currentClientId)) {
            resolvedData.fieldId = fieldId;
        } else if (fieldId) {
            console.warn(`Campo "${resolvedData.fieldName}" encontrado pero no pertenece al cliente actual (${currentClientId}). No se asignará.`);
        }
    }
    if (resolvedData.lotName && !resolvedData.lotId) {
        // Para Lotes, necesitamos el fieldId resuelto (debe ser del cliente actual)
        if (resolvedData.fieldId) {
            resolvedData.lotId = findIdByName('Lot', resolvedData.lotName, { fieldId: resolvedData.fieldId });
        } else {
            console.warn(`No se pudo resolver Lote "${resolvedData.lotName}" porque falta fieldId o fieldName.`);
        }
    }
    if (resolvedData.parcelName && !resolvedData.parcelId) {
        // Para Parcelas, necesitamos el lotId resuelto
        if (resolvedData.lotId) {
            resolvedData.parcelId = findIdByName('Parcel', resolvedData.parcelName, { lotId: resolvedData.lotId });
        } else {
             console.warn(`No se pudo resolver Parcela "${resolvedData.parcelName}" porque falta lotId o lotName.`);
        }
    }
     if (resolvedData.campaignName && !resolvedData.campaignId) {
        // Las campañas también están asociadas a un cliente
        const campaignId = findIdByName('Campaign', resolvedData.campaignName);
        if (campaignId && db.campaigns.find(c => c.id === campaignId && c.clientId === currentClientId)) {
            resolvedData.campaignId = campaignId;
        } else if (campaignId) {
             console.warn(`Campaña "${resolvedData.campaignName}" encontrada pero no pertenece al cliente actual (${currentClientId}). No se asignará.`);
        }
    }

    const resolveNameArray = (nameArray, targetEntityType) => {
        if (!nameArray || !Array.isArray(nameArray)) return [];
        return nameArray.map(name => findIdByName(targetEntityType, name)).filter(id => id !== null);
    };

    if (resolvedData.personnelNames) {
        resolvedData.personnelInvolvedIds = resolveNameArray(resolvedData.personnelNames, 'Personnel');
    }
    if (resolvedData.machineryNames) {
        resolvedData.machineryUsedIds = resolveNameArray(resolvedData.machineryNames, 'Machinery');
    }
    
    if (resolvedData.productsUsed && Array.isArray(resolvedData.productsUsed)) {
        resolvedData.productsUsed = resolvedData.productsUsed.map(p => {
            let productId = p.productId;
            if (p.productName && !p.productId) {
                productId = findIdByName('ProductInsume', p.productName);
            }
            const quantity = parseFloat(p.quantity); // Asegurar que sea número
            return { productId, quantity: isNaN(quantity) ? 0 : quantity, unit: p.unit };
        }).filter(p => p.productId && p.quantity > 0);
    }
    
    if (resolvedData.dateTimeScheduled && typeof resolvedData.dateTimeScheduled === 'string') {
        const parsedDate = parseRelativeDate(resolvedData.dateTimeScheduled); // de utils.js
        if (parsedDate) {
            let timeMatch = resolvedData.dateTimeScheduled.match(/(\d{1,2})\s*([ap]\.?m\.?)/i); 
            let timeMatch24 = resolvedData.dateTimeScheduled.match(/(\d{1,2}):(\d{2})/); 

            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                if (timeMatch[2].toLowerCase().startsWith('p') && hours < 12) hours += 12;
                if (timeMatch[2].toLowerCase().startsWith('a') && hours === 12) hours = 0; 
                parsedDate.setHours(hours, 0, 0, 0);
            } else if (timeMatch24) {
                parsedDate.setHours(parseInt(timeMatch24[1]), parseInt(timeMatch24[2]), 0, 0);
            } else { // Si no hay hora específica, default a las 00:00 del día parseado
                parsedDate.setHours(0,0,0,0);
            }
            resolvedData.dateTimeScheduled = parsedDate.toISOString();
        } else {
            addMessageToChatLog(`Advertencia: No se pudo interpretar la fecha "${resolvedData.dateTimeScheduled}". Se omitirá.`, 'ai', false);
            delete resolvedData.dateTimeScheduled; 
        }
    }
    return resolvedData;
}

function getCollectionNameForEntity(entity) { // Mapeo de Entidad a nombre de colección en `db`
    if (!entity) return null;
    const entityLower = entity.toLowerCase();
    switch (entityLower) {
        case 'field': return 'fields';
        case 'lot': return 'lots';
        case 'parcel': return 'parcels';
        case 'taskdefinition': return 'tasksList';
        case 'productinsume': return 'productsInsumes';
        case 'machinery': return 'machineries';
        case 'personnel': return 'personnel';
        case 'campaign': return 'campaigns';
        case 'jobevent': return 'jobsEvents';
        case 'client': return 'clients';
        case 'user': return 'users';
        default:
            console.warn(`Nombre de entidad no mapeado a colección: ${entity}`);
            // Intento genérico de pluralización simple (puede fallar para 'personnel', etc.)
            if (entity.endsWith('s')) return entityLower;
            if (entity.endsWith('y')) return entityLower.slice(0,-1) + 'ies';
            return entityLower + 's';
    }
}