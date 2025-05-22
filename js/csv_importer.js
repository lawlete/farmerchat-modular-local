// js/csv_importer.js

function parseCSV(csvText) {
    // ... (COPIA LA FUNCIÓN parseCSV DE LA RESPUESTA ANTERIOR - csv_importer.js) ...
    const rows = [];
    let currentRow = [];
    let inQuotes = false;
    let currentField = '';

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];

        if (char === '"') {
            if (inQuotes && i + 1 < csvText.length && csvText[i+1] === '"') { 
                currentField += '"';
                i++; 
            } else {
                inQuotes = !inQuotes;
            }
        } else if ((char === ',' || char === '\n' || char === '\r') && !inQuotes) {
            currentRow.push(currentField.trim());
            currentField = '';
            if (char === '\n' || char === '\r') {
                if (csvText[i] === '\r' && csvText[i+1] === '\n') i++; 
                if (currentRow.length > 0 && currentRow.some(field => field !== '')) { 
                     rows.push(currentRow);
                }
                currentRow = [];
            }
        } else {
            currentField += char;
        }
    }
    currentRow.push(currentField.trim());
    if (currentRow.length > 0 && currentRow.some(field => field !== '')) { 
        rows.push(currentRow);
    }
    
    if (rows.length === 0) return { headers: [], data: [] };

    const headers = rows[0].map(h => h.trim()); // Asegurar que los headers estén trimeados
    const data = rows.slice(1).map(rowArray => {
        const rowObject = {};
        headers.forEach((header, index) => {
            rowObject[header] = rowArray[index] !== undefined ? rowArray[index].trim() : '';
        });
        return rowObject;
    });
    return { headers, data };
}


function importDataFromCSV(csvText, entityNameForIdPrefix, collectionKeyInDb) {
    const { headers, data: parsedData } = parseCSV(csvText);
    
    if (!headers || headers.length === 0 || parsedData.length === 0) {
        // No mostrar error si el archivo está genuinamente vacío o solo tiene headers
        if (csvText.trim() !== '' && !csvText.trim().toLowerCase().startsWith(headers.join(',').toLowerCase())) {
             addMessageToChatLog(`Error: El CSV para ${entityNameForIdPrefix} está mal formateado o no tiene datos después de los encabezados.`, 'ai', true);
        }
        return 0;
    }

    let itemsAdded = 0;
    let skippedItemsCount = 0; // Initialize counter for skipped items
    if (!db[collectionKeyInDb]) {
        // Assuming addMessageToChatLog is available globally via window
        if (window.addMessageToChatLog) {
            window.addMessageToChatLog(`Error: Colección de base de datos "${collectionKeyInDb}" no reconocida para importación de ${entityNameForIdPrefix}.`, 'ai', true);
        } else {
            console.error(`Error: Colección de base de datos "${collectionKeyInDb}" no reconocida para importación de ${entityNameForIdPrefix}. (addMessageToChatLog not available)`);
        }
        return 0;
    }

    parsedData.forEach(itemData => {
        const newItem = { ...itemData }; 

        if (!newItem.id || newItem.id.trim() === '') {
            newItem.id = generateId(entityNameForIdPrefix.substring(0, 3).toLowerCase() + '_csv_');
        } else { // Limpiar ID si viene del CSV
            newItem.id = newItem.id.trim();
        }

        // Lógica específica por entidad
        if (collectionKeyInDb === 'fields' || collectionKeyInDb === 'campaigns') {
            // Si clientId no viene en el CSV, o está vacío, usar el actual.
            // Si SÍ viene, usar el del CSV (permitiendo importar para otros clientes si el admin lo hace)
            newItem.clientId = (newItem.clientId || '').trim() === '' ? db.config.currentClientId : newItem.clientId.trim();
        }
        
        // Conversiones de tipo (ejemplo para 'areaHa' en lotes)
        if (collectionKeyInDb === 'lots' && newItem.areaHa) {
            const area = parseFloat(newItem.areaHa);
            newItem.areaHa = isNaN(area) ? 0 : area;
        }
        if (collectionKeyInDb === 'fields' && newItem.areaTotalHa) {
            const area = parseFloat(newItem.areaTotalHa);
            newItem.areaTotalHa = isNaN(area) ? 0 : area;
        }
        // Para 'productsUsed' en 'jobsEvents', la importación por CSV es compleja y no se recomienda.

        // Validar que las referencias a IDs (fieldId, lotId, clientId) existan si se proveen.
        // Esto puede ser opcional o estricto. Por ahora, lo dejamos más permisivo,
        // asumiendo que el usuario importa en el orden correcto.
        if (collectionKeyInDb === 'lots' && newItem.fieldId && !db.fields.some(f => f.id === newItem.fieldId)) {
            const message = `Lote "${newItem.name || newItem.id}" importado desde CSV, pero su fieldId "${newItem.fieldId}" asociado no fue encontrado en la base de datos. La relación estará rota.`;
            console.warn(message);
            if (window.addMessageToChatLog) {
                window.addMessageToChatLog(message, 'ai', false); // isError = false for warnings
            }
        }
        if (collectionKeyInDb === 'parcels' && newItem.lotId && !db.lots.some(l => l.id === newItem.lotId)) {
            const message = `Parcela "${newItem.name || newItem.id}" importada desde CSV, pero su lotId "${newItem.lotId}" asociado no fue encontrado en la base de datos. La relación estará rota.`;
            console.warn(message);
            if (window.addMessageToChatLog) {
                window.addMessageToChatLog(message, 'ai', false); // isError = false for warnings
            }
        }


        if (!db[collectionKeyInDb].some(existing => existing.id === newItem.id)) {
            db[collectionKeyInDb].push(newItem);
            itemsAdded++;
        } else {
            console.warn(`Item con ID ${newItem.id} ya existe en ${collectionKeyInDb}, omitiendo del CSV.`);
            skippedItemsCount++; // Increment counter for skipped items
        }
    });

    if (skippedItemsCount > 0) {
        const message = `${skippedItemsCount} item(s) del archivo CSV fueron omitidos porque sus IDs ya existen en la base de datos.`;
        if (window.addMessageToChatLog) {
            window.addMessageToChatLog(message, 'ai', false); // isError = false
        } else {
            console.log(message); // Fallback if chat log not available
        }
    }

    if (itemsAdded > 0) {
        saveDbToStorage(); 
        updateAllDisplayedLists(); 
    }
    return itemsAdded;
}