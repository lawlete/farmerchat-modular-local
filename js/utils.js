// js/utils.js

function generateId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function normalizeString(str) {
    if (typeof str !== 'string') return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseRelativeDate(dateString) {
    if (typeof dateString !== 'string') return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lowerDateString = dateString.toLowerCase();

    if (lowerDateString.includes("hoy")) return today;
    if (lowerDateString.includes("mañana")) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow;
    }
    if (lowerDateString.includes("pasado mañana")) {
        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(today.getDate() + 2);
        return dayAfterTomorrow;
    }
    
    const daysOfWeek = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    for (let i = 0; i < daysOfWeek.length; i++) {
        if (lowerDateString.includes(daysOfWeek[i])) {
            let targetDay = i;
            let currentDay = today.getDay();
            let diff = targetDay - currentDay;
            if (diff <= 0 && (lowerDateString.includes("próximo") || lowerDateString.includes("proximo"))) {
                diff += 7;
            } else if (diff < 0 && !(lowerDateString.includes("próximo") || lowerDateString.includes("proximo"))) {
                // Si es "lunes" y hoy es miércoles, se asume el próximo lunes.
                 diff += 7;
            } else if (diff === 0 && !(lowerDateString.includes("próximo") || lowerDateString.includes("proximo"))) {
                // Si es "lunes" y hoy es lunes, es hoy.
            } else if (diff === 0 && (lowerDateString.includes("próximo") || lowerDateString.includes("proximo"))) {
                 diff += 7; // "próximo lunes" y hoy es lunes, es el siguiente.
            }


            const nextOccurrence = new Date(today);
            nextOccurrence.setDate(today.getDate() + diff);
            return nextOccurrence;
        }
    }
    
    try { // Intentar parseo de formatos comunes como YYYY-MM-DD, DD/MM/YYYY
        let parts;
        if (dateString.includes('-')) { // YYYY-MM-DD
            parts = dateString.split('-');
            if (parts.length === 3) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else if (dateString.includes('/')) { // DD/MM/YYYY
            parts = dateString.split('/');
            if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        const parsedDate = new Date(dateString); // Último recurso, parseo genérico
        if (!isNaN(parsedDate.getTime())) return parsedDate;
    } catch(e) { /* ignorar */ }

    return null;
}

// Función para limpiar la respuesta del LLM si viene con ```json ... ```
function cleanLLMJsonResponse(jsonString) {
    if (typeof jsonString !== 'string') return jsonString;
    return jsonString.replace(/^```json\s*|```\s*$/g, '').trim();
}