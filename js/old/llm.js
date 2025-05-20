// js/llm.js

let GEMINI_API_KEY_LLM_MODULE = null;
const GEMINI_MODEL_NAME_LLM_MODULE = "gemini-1.5-flash-latest";
const MAX_CONVERSATION_HISTORY_LLM_MODULE = 8;

let conversationHistoryLLM = [];

function setApiKeyForLlmModule(key) {
    GEMINI_API_KEY_LLM_MODULE = key;
    console.log("API Key seteada en el módulo LLM.");
}

async function transcribeAudioWithGemini(base64AudioData, mimeType = 'audio/webm') {
    // ... (Misma función transcribeAudioWithGemini que antes, ya debería estar bien) ...
    if (!GEMINI_API_KEY_LLM_MODULE) {
        const err = new Error("API Key de Gemini no configurada para transcripción.");
        err.isApiKeyError = true;
        return Promise.reject(err);
    }
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME_LLM_MODULE}:generateContent?key=${GEMINI_API_KEY_LLM_MODULE}`;

    const payload = {
        contents: [{
            parts: [
                { text: "Transcribe el siguiente audio a texto. Responde solo con la transcripción directa, sin ningún texto adicional, explicaciones, ni formato markdown." },
                {
                    inlineData: { 
                        mimeType: mimeType, 
                        data: base64AudioData
                    }
                }
            ]
        }],
        generationConfig: {
            temperature: 0.1, 
        },
        safetySettings: [ 
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };
    console.log("Payload para Transcripción de Audio:", JSON.stringify(payload, null, 2).substring(0, 500) + "..."); // Loguear para depurar

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const responseBodyText = await response.text();
        if (!response.ok) {
            let errorMessage = `Error API Gemini (transcripción) ${response.status}: ${response.statusText}`;
            try {
                const errorBodyJson = JSON.parse(responseBodyText);
                errorMessage = `Error API Gemini (transcripción) ${response.status}: ${errorBodyJson.error?.message || responseBodyText}`;
            } catch (e) { /* No era JSON */ }
            console.error("Error API Gemini (transcripción raw):", responseBodyText);
            throw new Error(errorMessage);
        }

        const responseData = JSON.parse(responseBodyText);
        if (responseData.candidates && responseData.candidates[0] && responseData.candidates[0].content && responseData.candidates[0].content.parts && responseData.candidates[0].content.parts[0] && typeof responseData.candidates[0].content.parts[0].text === 'string') {
            return responseData.candidates[0].content.parts[0].text.trim();
        } else {
            console.error("Respuesta inesperada de Gemini (transcripción):", responseData);
            throw new Error("No se pudo obtener la transcripción del LLM o la respuesta tuvo un formato inesperado.");
        }
    } catch (error) {
        console.error("Error en transcribeAudioWithGemini:", error);
        throw error;
    }
}


async function callGeminiApiWithHistory(userInputText) {
    if (!GEMINI_API_KEY_LLM_MODULE) {
        const err = new Error("API Key de Gemini no configurada en el módulo LLM.");
        err.isApiKeyError = true;
        return Promise.reject(err);
    }
    if (typeof userInputText !== 'string') { // Asegurarse que userInputText es string
        console.error("userInputText no es string:", userInputText);
        throw new Error("La entrada para la IA debe ser texto.");
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME_LLM_MODULE}:generateContent?key=${GEMINI_API_KEY_LLM_MODULE}`;

    // Construir el historial para la API. Cada 'content' debe ser una cadena.
    const geminiApiHistory = conversationHistoryLLM.map(turn => {
        if (typeof turn.content !== 'string') {
            console.warn("Contenido del historial no es string, se omitirá:", turn);
            return null; // Omitir este turno si el contenido no es string
        }
        return {
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: turn.content }] // Asegurar que 'text' siempre sea una cadena
        };
    }).filter(turn => turn !== null); // Filtrar los turnos nulos

    // El system prompt debe ser una cadena.
    const systemInstructionText = `
Eres FarmerChat... (COPIA AQUÍ EL SYSTEM PROMPT COMPLETO Y DETALLADO DE LA RESPUESTA ANTERIOR)

Contexto Adicional - Hoy es: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
Cliente Actual: ${db.clients.find(c=>c.id === db.config.currentClientId)?.name || 'Desconocido'}
Entidades existentes (ejemplos, para referencia, NO es una lista exhaustiva, úsalas para resolver IDs si el usuario es vago. No las repitas en tu respuesta JSON, solo usa esta info para entender mejor la petición):
- Tareas Definidas (taskName): ${db.tasksList.slice(0,7).map(t=>`'${t.taskName}' (ID: ${t.id})`).join(', ') || 'Ninguna'}
- Campos (fieldName): ${db.fields.filter(f => f.clientId === db.config.currentClientId).slice(0,5).map(f=>`'${f.name}' (ID: ${f.id})`).join(', ') || 'Ninguno del cliente actual'}
- Lotes (ejemplos, con su campo): ${db.lots.filter(l => db.fields.some(f => f.id === l.fieldId && f.clientId === db.config.currentClientId)).slice(0,3).map(l=>`'${l.name}' en campo '${db.fields.find(f=>f.id === l.fieldId)?.name || '?'}' (ID: ${l.id})`).join('; ') || 'Ninguno del cliente actual'}
- Parcelas (ejemplos, con su lote): ${db.parcels.filter(p => db.lots.some(l => l.id === p.lotId && db.fields.some(f => f.id === l.fieldId && f.clientId === db.config.currentClientId))).slice(0,3).map(p=>`'${p.name}' en lote '${db.lots.find(l=>l.id === p.lotId)?.name || '?'}' (ID: ${p.id})`).join('; ') || 'Ninguna del cliente actual'}
- Maquinaria (machineryName): ${db.machineries.slice(0,5).map(m=>`'${m.name}'`).join(', ') || 'Ninguna'}
- Personal (personnelName): ${db.personnel.slice(0,5).map(p=>`'${p.name}'`).join(', ') || 'Ninguno'}

Recuerda responder SIEMPRE en formato JSON válido sin markdown (sin \`\`\`json ... \`\`\`).
Si creas una entidad, el "responseText" debe confirmar la creación. Si actualizas, confirma la actualización. Si borras, confirma la eliminación. Si consultas, resume brevemente lo encontrado o indica si no hay resultados.
Si una entidad referenciada no se encuentra (ej. un campo para un nuevo lote), tu "action" debe ser "CLARIFY" y debes preguntar por el campo correcto o si se desea crearlo.
Cuando el usuario pide "listar" o "mostrar" entidades, tu 'action' es 'READ' y 'responseText' debe contener la lista o un resumen. El campo 'data.filters' puede estar vacío si no hay filtros.
    `;
    
    let finalApiContents = [];
    // Para la API de Gemini, es común que el "system prompt" o las instrucciones generales
    // se coloquen como el primer mensaje del historial, con rol 'user' (si la API lo prefiere así)
    // o se intercale con los mensajes del usuario/modelo.
    // La estructura `contents: [ {role: 'user', parts: [A]}, {role: 'model', parts: [B]}, {role: 'user', parts: [C]} ]` es la esperada.

    if (geminiApiHistory.length === 0) {
        // Primer turno del usuario: system prompt + user input
        finalApiContents.push({ role: "user", parts: [{ text: systemInstructionText + "\n\nMi primera petición es: \"" + userInputText + "\"" }] });
    } else {
        // Turnos subsecuentes: historial + nuevo input del usuario.
        // El system prompt ya fue "visto" por el modelo.
        finalApiContents = [...geminiApiHistory, { role: 'user', parts: [{ text: userInputText }] }];
    }

    const payload = {
        contents: finalApiContents,
        generationConfig: {
            temperature: 0.1, 
            maxOutputTokens: 2048,
        },
        safetySettings: [ 
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };
    
    console.log("Payload enviado a Gemini API:", JSON.stringify(payload, null, 2).substring(0,1000) + "..."); // Loguear el payload para depurar

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload), // Asegurarse que el payload es JSON válido
        });

        const responseBodyText = await response.text(); 

        if (!response.ok) {
            let errorMessage = `Error API Gemini ${response.status}: ${response.statusText}`;
            try {
                const errorBodyJson = JSON.parse(responseBodyText); // Intentar parsear el error
                errorMessage = `Error API Gemini ${response.status}: ${errorBodyJson.error?.message || responseBodyText}`;
            } catch (e) { /* No era JSON, usar el texto plano del error */ }
            console.error("Error API Gemini (raw text):", responseBodyText);
            throw new Error(errorMessage);
        }
        
        let parsedJsonFromLLM;
        // La respuesta de Gemini es un JSON que contiene el JSON de nuestra app.
        // Primero, parseamos la respuesta de Gemini.
        const geminiResponseData = JSON.parse(cleanLLMJsonResponse(responseBodyText)); 

        if (!geminiResponseData.candidates || !geminiResponseData.candidates[0] || !geminiResponseData.candidates[0].content || !geminiResponseData.candidates[0].content.parts || !geminiResponseData.candidates[0].content.parts[0]) {
             console.error("Estructura de respuesta inesperada de Gemini:", geminiResponseData);
             throw new Error("Respuesta del LLM con estructura inesperada (faltan candidatos/partes).");
        }
        // Luego, obtenemos el texto que es nuestro JSON de aplicación y lo parseamos.
        const llmActualOutputText = geminiResponseData.candidates[0].content.parts[0].text;
        if (typeof llmActualOutputText !== 'string') {
            console.error("El contenido del LLM no es texto:", llmActualOutputText);
            throw new Error("La IA no devolvió texto para procesar.");
        }
        const finalCleanedAppJson = cleanLLMJsonResponse(llmActualOutputText);

        try {
            parsedJsonFromLLM = JSON.parse(finalCleanedAppJson);
        } catch (e) {
            console.error("Error al parsear el JSON de la lógica de la aplicación:", e);
            console.error("String JSON problemático (salida del LLM limpiada):", finalCleanedAppJson); 
            addMessageToChatLog(`Error de formato en la respuesta de la IA. La IA respondió (o parte de ello):\n${finalCleanedAppJson.substring(0, 500)}${finalCleanedAppJson.length > 500 ? '...' : ''}`, 'ai', true);
            throw new Error("La respuesta interna de la IA no es un JSON válido. Revisa la consola.");
        }

        // Actualizar historial de conversación solo si el parseo fue exitoso
        conversationHistoryLLM.push({ role: 'user', content: userInputText });
        conversationHistoryLLM.push({ role: 'model', content: finalCleanedAppJson }); 
        if (conversationHistoryLLM.length > MAX_CONVERSATION_HISTORY_LLM_MODULE * 2) {
            // Quitar los dos más viejos (un par user/model)
            conversationHistoryLLM.splice(0, conversationHistoryLLM.length - (MAX_CONVERSATION_HISTORY_LLM_MODULE * 2));
        }
        return parsedJsonFromLLM;

    } catch (error) {
        console.error("Error en callGeminiApiWithHistory:", error);
        // Si el error es por el payload (ej. no es JSON válido), se manifestará aquí también.
        // Asegurarse que `payload` se construye correctamente.
        if (error instanceof TypeError && error.message.includes("Failed to execute 'fetch'")) {
            console.error("Error de Fetch, posible problema con el cuerpo de la solicitud (payload no es JSON válido?):", payload);
        }
        throw error;
    }
}