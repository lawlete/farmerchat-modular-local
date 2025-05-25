// js/llm.js

let GEMINI_API_KEY_LLM_MODULE = null;
const GEMINI_MODEL_NAME_LLM_MODULE = "gemini-1.5-flash-latest"; // o "gemini-pro"
const MAX_CONVERSATION_HISTORY_LLM_MODULE = 6; // (3 pares de user/model)

let conversationHistoryLLM = [];

function setApiKeyForLlmModule(key) {
    GEMINI_API_KEY_LLM_MODULE = key;
    console.log("API Key seteada en el módulo LLM.");
}

async function transcribeAudioWithGemini(base64AudioData, mimeType = 'audio/webm') {
    // ... (Misma función transcribeAudioWithGemini que antes, ya debería estar bien) ...
    // (Asegúrate de que el prompt para transcribir sea muy directo: "Transcribe este audio:")
    if (!GEMINI_API_KEY_LLM_MODULE) {
        const err = new Error("API Key de Gemini no configurada para transcripción.");
        err.isApiKeyError = true;
        return Promise.reject(err);
    }
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME_LLM_MODULE}:generateContent?key=${GEMINI_API_KEY_LLM_MODULE}`;

    const transcriptionPromptText = await (await fetch('../prompts/transcription_prompt.txt')).text();

    const payload = {
        contents: [{
            parts: [
                // Prompt MUY directo para transcripción
                { text: transcriptionPromptText },
                {
                    inlineData: { 
                        mimeType: mimeType, 
                        data: base64AudioData
                    }
                }
            ]
        }],
        generationConfig: {
            temperature: 0.0, // Lo más bajo posible para transcripción literal
            // responseMimeType: "text/plain", // Podríamos forzar texto plano
        },
        safetySettings: [ 
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };
    // console.log("Payload para Transcripción:", JSON.stringify(payload).substring(0,200) + "...");

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

        const responseData = JSON.parse(responseBodyText); // Parsear la respuesta de Gemini
        // El texto de la transcripción está directamente en parts[0].text si el prompt es directo
        if (responseData.candidates && responseData.candidates[0] && 
            responseData.candidates[0].content && responseData.candidates[0].content.parts && 
            responseData.candidates[0].content.parts[0] && 
            typeof responseData.candidates[0].content.parts[0].text === 'string') {
            return responseData.candidates[0].content.parts[0].text.trim();
        } else {
            console.error("Respuesta inesperada de Gemini (transcripción):", responseData);
            // Intentar buscar en un nivel más profundo si el modelo añade estructura extra
            if (responseData.candidates?.[0]?.content?.parts?.[0]?.parts?.[0]?.text) {
                 return responseData.candidates[0].content.parts[0].parts[0].text.trim();
            }
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
    if (typeof userInputText !== 'string') {
        console.error("userInputText no es string:", userInputText);
        throw new Error("La entrada para la IA debe ser texto.");
    }

    const baseSystemInstructionText = await (await fetch('../prompts/farmer_chat_system_prompt.txt')).text();

    // Prepare dynamic data for the prompt
    const currentClientId = db.config.currentClientId;
    const clientName = db.clients.find(c => c.id === currentClientId)?.name || 'Desconocido';
    const currentDate = new Date().toLocaleDateString('es-ES');
    
    // Campos del cliente actual
    const fieldsContextArr = db.fields.filter(f => f.clientId === currentClientId).slice(0,3);
    const fieldsContextText = fieldsContextArr.length > 0 ? fieldsContextArr.map(f => `'${f.name}' (ID: ${f.id})`).join(', ') : 'Ninguno';

    // Contratistas disponibles
    const contractorsContextArr = db.contractors ? db.contractors.filter(c => c.is_internal || db.clients.find(client => client.id === currentClientId) ) : [];
    const contractorsContextText = contractorsContextArr.length > 0 ? contractorsContextArr.slice(0,3).map(c => `'${c.name}' (ID: ${c.contractor_id})`).join(', ') : 'Ninguno';

    // Populate the system instruction text
    let populatedSystemInstructionText = baseSystemInstructionText;

    const clienteActualContext = `- Cliente Actual: ${clientName} (ID: ${currentClientId})`;
    const hoyEsContext = `- Hoy es: ${currentDate}`;
    const camposContextLine = `- Campos del cliente actual (primeros 3): ${fieldsContextText}`;
    const contratistasContextLine = `- Contratistas disponibles (primeros 3): ${contractorsContextText}`;

    const originalClienteActualLine = "- Cliente Actual: ${db.clients.find(c=>c.id === db.config.currentClientId)?.name || 'Desconocido'} (ID: ${db.config.currentClientId})";
    const originalHoyEsLine = "- Hoy es: ${new Date().toLocaleDateString('es-ES')}";
    const originalCamposLine = "- Campos del cliente actual (primeros 3): ${db.fields.filter(f=>f.clientId === db.config.currentClientId).slice(0,3).map(f=>`'${f.name}' (ID: ${f.id})`).join(', ') || 'Ninguno'}";
    const originalContratistasLine = "- Contratistas disponibles (primeros 3): ${db.contractors.filter(c => c.is_internal || db.clients.find(client => client.id === db.config.currentClientId)).slice(0,3).map(c=>`'${c.name}' (ID: ${c.contractor_id})`).join(', ') || 'Ninguno'}";

    populatedSystemInstructionText = populatedSystemInstructionText.replace(originalClienteActualLine, clienteActualContext);
    populatedSystemInstructionText = populatedSystemInstructionText.replace(originalHoyEsLine, hoyEsContext);
    populatedSystemInstructionText = populatedSystemInstructionText.replace(originalCamposLine, camposContextLine);
    populatedSystemInstructionText = populatedSystemInstructionText.replace(originalContratistasLine, contratistasContextLine);

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME_LLM_MODULE}:generateContent?key=${GEMINI_API_KEY_LLM_MODULE}`;

    // Estructura de `contents` para la API de Gemini:
    // El historial debe alternar roles user/model. El system prompt puede ir como primer mensaje de 'user'.
    let finalApiContents = [];

    // 1. System Prompt (como el primer mensaje con rol 'user', Gemini lo trata como instrucción)
    finalApiContents.push({ role: "user", parts: [{ text: populatedSystemInstructionText }] });
    // 2. Historial de la conversación (model/user/model/user...)
    //    Asegurándonos que el contenido del historial sea string
    conversationHistoryLLM.forEach(turn => {
        if (typeof turn.content === 'string') {
            finalApiContents.push({
                role: turn.role, // 'user' o 'model'
                parts: [{ text: turn.content }]
            });
        }
    });
    // 3. La petición actual del usuario (como último mensaje con rol 'user')
    finalApiContents.push({ role: "user", parts: [{ text: userInputText }] });
    
    // Gemini puede ser sensible a tener dos mensajes 'user' seguidos si el historial termina en 'user'.
    // El system prompt como 'user' y luego el historial que podría empezar con 'user' es un problema.
    // Mejor estrategia: system prompt, luego un mensaje de 'model' vacío o de "ok", luego el historial.
    // O, más simple, el system prompt + userInputText para el primer turno, y system prompt + historial + userInputText para los siguientes.

    // REVISIÓN DE ESTRUCTURA `contents`:
    finalApiContents = [];
    // El system prompt es la "personalidad" y las instrucciones.
    // El historial son los ejemplos de cómo ha respondido a esa personalidad.
    // La nueva pregunta es lo que debe procesar.

    // Estrategia:
    // 1. El system prompt.
    // 2. El historial de conversación (si existe).
    // 3. El input actual del usuario.
    // Gemini espera una alternancia user/model. El system prompt puede ser el primer 'user' message.

    // Si el historial está vacío, el primer mensaje es el system prompt + la pregunta del usuario.
    if (conversationHistoryLLM.length === 0) {
        finalApiContents = [
            { role: "user", parts: [{ text: populatedSystemInstructionText + "\n\nUsuario: " + userInputText }] }
        ];
    } else {
        // Si hay historial, lo incluimos y añadimos la nueva pregunta del usuario.
        // El system prompt se puede añadir al principio del historial o como un mensaje de "contexto" de rol 'user'.
        // Para mantener la alternancia, si el historial es A, B, C (user, model, user),
        // y el system prompt es S (user), y el nuevo input es N (user),
        // podríamos hacer S, A, B, C, N. Esto rompe la alternancia.
        //
        // Una forma es (System Prompt como parte del primer mensaje de usuario o como un mensaje de "contexto" del modelo):
        // [
        //   {role: "user", parts: [{text: SYSTEM_INSTRUCTIONS}]},
        //   {role: "model", parts: [{text: "Entendido. Estoy listo."}]}, // O un resumen del estado actual
        //   ...conversationHistoryLLM (que debe empezar con 'user'),
        //   {role: "user", parts: [{text: userInputText}]}
        // ]
        //
        // Por ahora, vamos a simplificar y enviar el system prompt + el historial + el nuevo input,
        // intentando que el `populatedSystemInstructionText` guíe el primer procesamiento.
        // La API de Gemini (especialmente los modelos más nuevos como 1.5) son buenos manejando esto en el `contents`.

        finalApiContents.push({role: "user", parts: [{text: populatedSystemInstructionText}]});
        // Añadir el historial, asegurando alternancia. Si el historial ya empieza con 'user', está bien.
        // Si el historial empieza con 'model', eso también está bien después de nuestro 'user' system prompt.
        conversationHistoryLLM.forEach(turn => {
            finalApiContents.push({
                role: turn.role,
                parts: [{text: turn.content}]
            });
        });
        finalApiContents.push({role: "user", parts: [{text: userInputText}]});
    }


    const payload = {
        contents: finalApiContents,
        generationConfig: {
            temperature: 0.05, // Muy bajo para forzar JSON
            maxOutputTokens: 2048,
        },
        // IMPORTANTE: Forzar la salida JSON si el modelo y la API lo soportan bien.
        // Para la API REST de Gemini, esto se hace con `response_mime_type` DENTRO de `generationConfig`
        // PERO, `gemini-1.5-flash-latest` vía API REST directa (`generateContent`)
        // NO siempre respeta `response_mime_type: "application/json"`.
        // La mejor manera de obtener JSON es con un prompt muy fuerte.
        // Si esto sigue fallando, tendríamos que usar la API de Vertex AI que tiene mejor soporte para forzar JSON.
        // O probar con "gemini-pro" que a veces es más obediente con el formato.

        safetySettings: [ 
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };
    
    console.log("Payload enviado a Gemini API (primeros 1000 caracteres del primer 'part' del 'contents'):", JSON.stringify(payload.contents[0]?.parts[0]?.text, null, 2).substring(0,1000) + "...");
    // console.log("Payload COMPLETO enviado a Gemini API:", JSON.stringify(payload, null, 2)); // DESCOMENTAR PARA DEBUG EXTREMO

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const responseBodyText = await response.text(); 

        if (!response.ok) {
            let errorMessage = `Error API Gemini ${response.status}: ${response.statusText}`;
            try {
                const errorBodyJson = JSON.parse(responseBodyText);
                errorMessage = `Error API Gemini ${response.status}: ${errorBodyJson.error?.message || responseBodyText}`;
            } catch (e) { /* No era JSON */ }
            console.error("Error API Gemini (raw text):", responseBodyText);
            throw new Error(errorMessage);
        }
        
        let parsedJsonFromLLM;
        const geminiResponseData = JSON.parse(cleanLLMJsonResponse(responseBodyText)); 

        if (!geminiResponseData.candidates || !geminiResponseData.candidates[0] || !geminiResponseData.candidates[0].content || !geminiResponseData.candidates[0].content.parts || !geminiResponseData.candidates[0].content.parts[0]) {
             console.error("Estructura de respuesta inesperada de Gemini:", geminiResponseData);
             throw new Error("Respuesta del LLM con estructura inesperada (faltan candidatos/partes).");
        }
        const llmActualOutputText = geminiResponseData.candidates[0].content.parts[0].text;
        if (typeof llmActualOutputText !== 'string') {
            console.error("El contenido del LLM no es texto:", llmActualOutputText);
            throw new Error("La IA no devolvió texto para procesar.");
        }
        const finalCleanedAppJson = cleanLLMJsonResponse(llmActualOutputText); // utils.js

        try {
            parsedJsonFromLLM = JSON.parse(finalCleanedAppJson);
        } catch (e) {
            console.error("Error FATAL al parsear el JSON de la lógica de la aplicación:", e);
            console.error("String JSON problemático (salida del LLM limpiada que falló el parseo): >>>\n" + finalCleanedAppJson + "\n<<<"); 
            addMessageToChatLog(`Error CRÍTICO de formato en la respuesta de la IA. La IA respondió con texto que no es JSON válido. Contenido:\n${finalCleanedAppJson.substring(0, 300)}${finalCleanedAppJson.length > 300 ? '...' : ''}`, 'ai', true);
            throw new Error("La respuesta interna de la IA no es un JSON válido después de la limpieza. Revisa la consola para el contenido completo.");
        }

        // Actualizar historial solo si la respuesta fue JSON válido y procesable
        conversationHistoryLLM.push({ role: 'user', content: userInputText });
        conversationHistoryLLM.push({ role: 'model', content: finalCleanedAppJson }); // Guardar el JSON que SÍ se pudo parsear
        if (conversationHistoryLLM.length > MAX_CONVERSATION_HISTORY_LLM_MODULE * 2) {
            conversationHistoryLLM.splice(0, 2); // Quitar el par user/model más antiguo
        }
        return parsedJsonFromLLM;

    } catch (error) {
        console.error("Error en callGeminiApiWithHistory:", error);
        if (error instanceof TypeError && error.message.includes("Failed to execute 'fetch'")) {
            console.error("Error de Fetch, posible problema con el cuerpo de la solicitud (payload no es JSON válido?):", payload);
        }
        throw error;
    }
}