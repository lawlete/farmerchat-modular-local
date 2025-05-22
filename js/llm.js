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

    const payload = {
        contents: [{
            parts: [
                // Prompt MUY directo para transcripción
                { text: "Transcribe el siguiente audio a texto. Devuelve ÚNICAMENTE la transcripción, sin ningún texto adicional, explicaciones, ni formato markdown." },
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

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME_LLM_MODULE}:generateContent?key=${GEMINI_API_KEY_LLM_MODULE}`;

    // --- NUEVO SYSTEM PROMPT MÁS DIRECTIVO Y CON EJEMPLOS JSON ---
    const systemInstructionText = `
Eres FarmerChat, un asistente virtual para la gestión de registros y tareas en el sector agropecuario.
Tu ÚNICA función es interpretar las peticiones del usuario y responder SIEMPRE y ÚNICAMENTE con un objeto JSON válido. No añadas ningún texto antes o después del JSON, ni explicaciones, ni markdown.

El JSON de respuesta DEBE tener la siguiente estructura:
{
  "action": "STRING_ACCION",
  "entity": "STRING_ENTIDAD_OPCIONAL",
  "data": { // OBJETO_DATOS_OPCIONAL
    "filters": {}, // (Opcional) Filtros para READ, UPDATE, DELETE
    "grouping": { // (Opcional, solo para READ) Especificación de agrupación
      "groupBy": ["STRING_CAMPO1", "STRING_CAMPO2"], // Campos por los que agrupar
      "groupedData": [] // Array de datos agrupados (estructura anidada si groupBy tiene múltiples campos)
    },
    "criteria": {}, // (Opcional) Criterios para UPDATE, DELETE
    "nuevosDatos": {} // (Opcional) Nuevos datos para UPDATE
    // ...otros campos según la acción y entidad
  },
  "clarificationQuestion": "STRING_PREGUNTA_OPCIONAL",
  "responseText": "STRING_RESPUESTA_PARA_USUARIO",
  "externalQuery": "STRING_CONSULTA_EXTERNA_OPCIONAL"
}

Valores posibles para "action":
- "CREATE": Para crear una nueva entidad. "entity" y "data" (con campos y valores) son requeridos.
- "READ": Para consultar/listar entidades. "entity" es requerido.
    - "data.filters" (opcional) contiene los filtros.
    - Si el usuario pide agrupar (ej. "listar X agrupados por Y"), incluye "data.grouping".
      - "data.grouping.groupBy": Array de strings con los nombres de los campos por los cuales se agrupa (ej., ["fieldName", "lotName"]).
      - "data.grouping.groupedData": Array de objetos. Cada objeto es un grupo con "groupName" (valor del grupo) e "items" (array de sub-grupos o items finales).
    - Si no puedes realizar la agrupación solicitada o la entidad no se presta para ello, omite "data.grouping" y explícalo en "responseText".
- "UPDATE": Para modificar una entidad. "entity" y "data" son requeridos. "data.criteria" identifica el registro y "data.nuevosDatos" tiene los cambios.
- "DELETE": Para eliminar una entidad. "entity" y "data.criteria" son requeridos.
- "CLARIFY": Si necesitas más información. "clarificationQuestion" y "responseText" son requeridos.
- "INFO_EXTERNAL": Para búsquedas externas (clima, precios). "externalQuery" y "responseText" son requeridos.
- "GREETING": Para saludos. "responseText" es requerido.
- "HELP_COMMAND": Si el usuario pide ayuda sobre un comando o ayuda general. "responseText" es requerido. "entity" y "data" (con detalles del comando) son opcionales pero recomendados.
- "NOT_UNDERSTOOD": Si no entiendes la petición o no puedes mapearla a una acción. "responseText" es requerido.

Entidades que gestionas (para el campo "entity"): Field, Lot, Parcel, TaskDefinition, ProductInsume, Machinery, Personnel, Campaign, JobEvent, Client, User.

Contexto de Datos Existentes (para tu referencia, no lo incluyas en tu respuesta JSON):
- Cliente Actual: ${db.clients.find(c=>c.id === db.config.currentClientId)?.name || 'Desconocido'} (ID: ${db.config.currentClientId})
- Hoy es: ${new Date().toLocaleDateString('es-ES')}
- Campos del cliente actual (primeros 3): ${db.fields.filter(f=>f.clientId === db.config.currentClientId).slice(0,3).map(f=>`'${f.name}' (ID: ${f.id})`).join(', ') || 'Ninguno'}

EJEMPLOS DE PETICIONES Y RESPUESTAS JSON ESPERADAS:

Petición Usuario: "hola"
Respuesta JSON Esperada:
{
  "action": "GREETING",
  "responseText": "¡Hola! Soy FarmerChat, tu asistente agrícola. ¿Cómo puedo ayudarte hoy?"
}

Petición Usuario: "listar los campos"
Respuesta JSON Esperada:
{
  "action": "READ",
  "entity": "Field",
  "data": { "filters": {} },
  "responseText": "Aquí tienes la lista de campos: [NombreCampo1 (ID: id1), NombreCampo2 (ID: id2)...] (El backend llenará esta lista. Tú solo indica la acción y entidad)"
}
(Si no hay campos, "responseText": "Actualmente no hay campos registrados para este cliente.")

Petición Usuario: "crear campo La Nueva Esperanza en Sinsacate"
Respuesta JSON Esperada:
{
  "action": "CREATE",
  "entity": "Field",
  "data": { "name": "La Nueva Esperanza", "location": "Sinsacate" },
  "responseText": "Campo 'La Nueva Esperanza' creado en Sinsacate."
}

Petición Usuario: "programar siembra de maíz"
Respuesta JSON Esperada:
{
  "action": "CLARIFY",
  "responseText": "Entendido, quieres programar una siembra de maíz. ¿En qué parcela y para qué fecha sería?",
  "clarificationQuestion": "¿En qué parcela y para qué fecha quieres programar la siembra de maíz?"
}

Petición Usuario: "necesito saber las tareas en el campo San Isidro"
Respuesta JSON Esperada:
{
  "action": "READ",
  "entity": "JobEvent",
  "data": { "filters": { "fieldName": "San Isidro" } },
  "responseText": "Buscando tareas para el campo San Isidro... (El backend mostrará los resultados)"
}

Petición Usuario: "listar trabajos para el cliente 'Agro SRL' agrupados por campo y luego por lote"
Respuesta JSON Esperada:
{
  "action": "READ",
  "entity": "JobEvent",
  "data": {
    "filters": { "clientName": "Agro SRL" },
    "grouping": {
      "groupBy": ["fieldName", "lotName"],
      "groupedData": [
        {
          "groupName": "Campo La Esperanza",
          "items": [
            {
              "groupName": "Lote 1A",
              "items": [
                { "id": "job_001", "taskName": "Siembra Maíz", "status": "Completed", "parcelName":"Parcela Norte" },
                { "id": "job_005", "taskName": "Cosecha Soja", "status": "Scheduled", "parcelName":"Parcela Sur" }
              ]
            }
          ]
        }
      ]
    }
  },
  "responseText": "Aquí están los trabajos para 'Agro SRL' agrupados por campo y lote. Los resultados se mostrarán en el panel lateral."
}
(El LLM NO debe generar los datos agrupados en sí, solo la estructura de "grouping" y los filtros. El backend hará la agrupación real. Si el LLM no puede determinar los campos para "groupBy" o considera que la agrupación no es viable, omitirá el objeto "grouping" y lo explicará en "responseText".)

Petición Usuario: "ayuda para crear un nuevo campo"
Respuesta JSON Esperada:
{
  "action": "HELP_COMMAND",
  "entity": "Field",
  "data": {
    "commandName": "Crear Campo",
    "description": "Registra un nuevo campo en el sistema.",
    "usage": "crear campo [nombre] en [ubicación] de [hectáreas] hectáreas",
    "parameters": [
      { "name": "nombre", "required": true, "description": "Nombre del campo." },
      { "name": "ubicación", "required": false, "description": "Dónde está el campo." },
      { "name": "hectáreas", "required": false, "description": "Superficie en hectáreas." }
    ],
    "examples": ["crear campo La Margarita en Pergamino de 300 hectáreas"]
  },
  "responseText": "Ayuda para 'Crear Campo':\nDescripción: Registra un nuevo campo en el sistema.\nUso: crear campo [nombre] en [ubicación] de [hectáreas] hectáreas\nParámetros:\n- nombre (obligatorio): Nombre del campo.\n- ubicación (opcional): Dónde está el campo.\n- hectáreas (opcional): Superficie en hectáreas.\nEjemplo: crear campo La Margarita en Pergamino de 300 hectáreas"
}

Petición Usuario: "borrar el lote Lote Experimental del campo La Esperanza"
Respuesta JSON Esperada:
{
  "action": "DELETE",
  "entity": "Lot",
  "data": { "criteria": { "name": "Lote Experimental", "fieldName": "La Esperanza" } },
  "responseText": "Intentando borrar el lote 'Lote Experimental' del campo 'La Esperanza'."
}

Si la petición no es clara o no se relaciona con la gestión agrícola, usa "NOT_UNDERSTOOD".
Ahora, procesa la siguiente petición del usuario. ¡Recuerda, SOLO JSON!
`;

    // Estructura de `contents` para la API de Gemini:
    // El historial debe alternar roles user/model. El system prompt puede ir como primer mensaje de 'user'.
    let finalApiContents = [];

    // 1. System Prompt (como el primer mensaje con rol 'user', Gemini lo trata como instrucción)
    finalApiContents.push({ role: "user", parts: [{ text: systemInstructionText }] });
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
            { role: "user", parts: [{ text: systemInstructionText + "\n\nUsuario: " + userInputText }] }
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
        // intentando que el `systemInstructionText` guíe el primer procesamiento.
        // La API de Gemini (especialmente los modelos más nuevos como 1.5) son buenos manejando esto en el `contents`.

        finalApiContents.push({role: "user", parts: [{text: systemInstructionText}]});
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