// Sistema de ayuda para comandos
class HelpSystem {
    constructor() {
        // Definición de los comandos disponibles
        this.commands = {
            // Comandos de CRUD para clientes
            "crear cliente": {
                format: "crear cliente nombre='[nombre]' ruc='[ruc]' direccion='[direccion]' telefono='[telefono]' email='[email]'",
                description: "Crea un nuevo registro de cliente en la base de datos",
                required: ["nombre"],
                optional: ["ruc", "direccion", "telefono", "email"],
                examples: [
                    "crear cliente nombre='Juan Pérez' ruc='12345678901' telefono='555-123456'",
                    "crear cliente nombre='Finca Los Olivos' direccion='Ruta 2 km 45'"
                ]
            },
            "editar cliente": {
                format: "editar cliente id=[id] nombre='[nombre]' ruc='[ruc]' direccion='[direccion]' telefono='[telefono]' email='[email]'",
                description: "Modifica un cliente existente en la base de datos",
                required: ["id"],
                optional: ["nombre", "ruc", "direccion", "telefono", "email"],
                examples: [
                    "editar cliente id=1 telefono='555-654321'",
                    "editar cliente id=3 nombre='Finca Los Nogales' direccion='Ruta 3 km 20'"
                ]
            },
            "eliminar cliente": {
                format: "eliminar cliente id=[id]",
                description: "Elimina un cliente de la base de datos",
                required: ["id"],
                optional: [],
                examples: [
                    "eliminar cliente id=2"
                ]
            },
            "buscar cliente": {
                format: "buscar cliente [término de búsqueda]",
                description: "Busca clientes que coincidan con el término especificado",
                required: [],
                optional: [],
                examples: [
                    "buscar cliente Juan",
                    "buscar cliente Finca"
                ]
            },
            "listar clientes": {
                format: "listar clientes",
                description: "Muestra todos los clientes registrados en la base de datos",
                required: [],
                optional: [],
                examples: [
                    "listar clientes"
                ]
            },
            
            // Comandos para campos
            "crear campo": {
                format: "crear campo nombre='[nombre]' ubicacion='[ubicacion]' superficie=[superficie] cliente_id=[id_cliente] coordenadas='[latitud,longitud]'",
                description: "Crea un nuevo registro de campo en la base de datos",
                required: ["nombre", "cliente_id"],
                optional: ["ubicacion", "superficie", "coordenadas"],
                examples: [
                    "crear campo nombre='Campo Norte' cliente_id=1 superficie=120",
                    "crear campo nombre='Parcela 5' cliente_id=2 ubicacion='Zona Este' coordenadas='-25.123,-54.456'"
                ]
            },
            "editar campo": {
                format: "editar campo id=[id] nombre='[nombre]' ubicacion='[ubicacion]' superficie=[superficie] cliente_id=[id_cliente] coordenadas='[latitud,longitud]'",
                description: "Modifica un campo existente en la base de datos",
                required: ["id"],
                optional: ["nombre", "ubicacion", "superficie", "cliente_id", "coordenadas"],
                examples: [
                    "editar campo id=3 nombre='Campo Sur' superficie=200",
                    "editar campo id=1 ubicacion='Zona Oeste' coordenadas='-25.456,-54.789'"
                ]
            },
            "eliminar campo": {
                format: "eliminar campo id=[id]",
                description: "Elimina un campo de la base de datos",
                required: ["id"],
                optional: [],
                examples: [
                    "eliminar campo id=4"
                ]
            },
            "buscar campo": {
                format: "buscar campo [término de búsqueda]",
                description: "Busca campos que coincidan con el término especificado",
                required: [],
                optional: [],
                examples: [
                    "buscar campo Norte",
                    "buscar campo Parcela"
                ]
            },
            "listar campos": {
                format: "listar campos [cliente_id=[id_cliente]]",
                description: "Muestra todos los campos o filtrados por cliente",
                required: [],
                optional: ["cliente_id"],
                examples: [
                    "listar campos",
                    "listar campos cliente_id=2"
                ]
            },
            
            // Comandos para cultivos
            "crear cultivo": {
                format: "crear cultivo nombre='[nombre]' campo_id=[campo_id] fecha_siembra='[fecha]' variedad='[variedad]' area=[superficie]",
                description: "Crea un nuevo registro de cultivo en la base de datos",
                required: ["nombre", "campo_id"],
                optional: ["fecha_siembra", "variedad", "area"],
                examples: [
                    "crear cultivo nombre='Soja' campo_id=1 fecha_siembra='2023-10-15' variedad='RR2'",
                    "crear cultivo nombre='Maíz' campo_id=3 area=50"
                ]
            },
            "editar cultivo": {
                format: "editar cultivo id=[id] nombre='[nombre]' campo_id=[campo_id] fecha_siembra='[fecha]' variedad='[variedad]' area=[superficie]",
                description: "Modifica un cultivo existente en la base de datos",
                required: ["id"],
                optional: ["nombre", "campo_id", "fecha_siembra", "variedad", "area"],
                examples: [
                    "editar cultivo id=2 variedad='DM 4612'",
                    "editar cultivo id=1 fecha_siembra='2023-11-01' area=75"
                ]
            },
            "eliminar cultivo": {
                format: "eliminar cultivo id=[id]",
                description: "Elimina un cultivo de la base de datos",
                required: ["id"],
                optional: [],
                examples: [
                    "eliminar cultivo id=3"
                ]
            },
            "buscar cultivo": {
                format: "buscar cultivo [término de búsqueda]",
                description: "Busca cultivos que coincidan con el término especificado",
                required: [],
                optional: [],
                examples: [
                    "buscar cultivo Soja",
                    "buscar cultivo RR2"
                ]
            },
            "listar cultivos": {
                format: "listar cultivos [campo_id=[campo_id]]",
                description: "Muestra todos los cultivos o filtrados por campo",
                required: [],
                optional: ["campo_id"],
                examples: [
                    "listar cultivos",
                    "listar cultivos campo_id=1"
                ]
            },
            
            // Comandos para agrupar y filtrar datos
            "agrupar": {
                format: "agrupar [tabla] por [campo]",
                description: "Agrupa los registros de la tabla especificada por el campo indicado",
                required: ["tabla", "campo"],
                optional: [],
                examples: [
                    "agrupar clientes por ubicacion",
                    "agrupar cultivos por variedad"
                ]
            },
            "filtrar": {
                format: "filtrar [tabla] donde [campo]=[valor]",
                description: "Filtra los registros de la tabla que cumplan con la condición",
                required: ["tabla", "campo", "valor"],
                optional: [],
                examples: [
                    "filtrar campos donde superficie>100",
                    "filtrar cultivos donde fecha_siembra>'2023-10-01'"
                ]
            },
            "ordenar": {
                format: "ordenar [tabla] por [campo] [asc/desc]",
                description: "Ordena los registros de la tabla según el campo especificado",
                required: ["tabla", "campo"],
                optional: ["asc/desc"],
                examples: [
                    "ordenar cultivos por area desc",
                    "ordenar clientes por nombre asc"
                ]
            },
            
            // Comandos de BD
            "cargar bd": {
                format: "cargar bd [nombre_bd]",
                description: "Carga una base de datos guardada anteriormente",
                required: ["nombre_bd"],
                optional: [],
                examples: [
                    "cargar bd finca2023",
                    "cargar bd respaldo_enero"
                ]
            },
            "guardar bd": {
                format: "guardar bd [nombre_bd]",
                description: "Guarda la base de datos actual con el nombre especificado",
                required: ["nombre_bd"],
                optional: [],
                examples: [
                    "guardar bd finca2023",
                    "guardar bd respaldo_mayo"
                ]
            },
            "exportar": {
                format: "exportar [tabla] formato=[csv/json]",
                description: "Exporta los datos de la tabla en el formato especificado",
                required: ["tabla"],
                optional: ["formato"],
                examples: [
                    "exportar clientes formato=csv",
                    "exportar cultivos formato=json"
                ]
            },
            "importar": {
                format: "importar [tabla] desde=[nombre_archivo]",
                description: "Importa datos a la tabla desde un archivo especificado",
                required: ["tabla", "nombre_archivo"],
                optional: [],
                examples: [
                    "importar clientes desde=clientes.csv",
                    "importar campos desde=campos_nuevos.json"
                ]
            },
            
            // Comandos generales
            "ayuda": {
                format: "ayuda [comando]",
                description: "Muestra información de ayuda sobre los comandos disponibles",
                required: [],
                optional: ["comando"],
                examples: [
                    "ayuda",
                    "ayuda crear campo",
                    "ayuda filtrar"
                ]
            },
            "estadisticas": {
                format: "estadisticas [tabla]",
                description: "Muestra estadísticas sobre la tabla especificada",
                required: [],
                optional: ["tabla"],
                examples: [
                    "estadisticas",
                    "estadisticas cultivos"
                ]
            }
        };
    }

    // Obtener ayuda general (lista de comandos)
    getGeneralHelp() {
        const helpText = {
            title: "Ayuda de Comandos",
            description: "Estos son los comandos disponibles en FarmerChat:",
            categories: {
                "Clientes": ["crear cliente", "editar cliente", "eliminar cliente", "buscar cliente", "listar clientes"],
                "Campos": ["crear campo", "editar campo", "eliminar campo", "buscar campo", "listar campos"],
                "Cultivos": ["crear cultivo", "editar cultivo", "eliminar cultivo", "buscar cultivo", "listar cultivos"],
                "Datos": ["agrupar", "filtrar", "ordenar"],
                "Base de Datos": ["cargar bd", "guardar bd", "exportar", "importar"],
                "General": ["ayuda", "estadisticas"]
            }
        };
        
        return helpText;
    }

    // Obtener ayuda específica para un comando
    getHelpForCommand(commandName) {
        // Buscar coincidencias exactas
        if (this.commands[commandName]) {
            return {
                command: commandName,
                ...this.commands[commandName]
            };
        }
        
        // Buscar coincidencias parciales
        const matchingCommands = Object.keys(this.commands).filter(cmd => 
            cmd.includes(commandName) || commandName.includes(cmd)
        );
        
        if (matchingCommands.length === 0) {
            return {
                error: `No se encontró ayuda para el comando "${commandName}"`,
                suggestions: this.suggestSimilarCommands(commandName)
            };
        } else if (matchingCommands.length === 1) {
            // Si solo hay una coincidencia parcial
            return {
                command: matchingCommands[0],
                ...this.commands[matchingCommands[0]],
                note: `¿Querías decir "${matchingCommands[0]}"?`
            };
        } else {
            // Si hay múltiples coincidencias parciales
            return {
                matchingCommands: matchingCommands.map(cmd => ({ 
                    command: cmd, 
                    description: this.commands[cmd].description 
                }))
            };
        }
    }

    // Sugerir comandos similares
    suggestSimilarCommands(input) {
        const allCommands = Object.keys(this.commands);
        
        // Función para calcular la distancia de Levenshtein entre dos cadenas
        const levenshteinDistance = (a, b) => {
            if (a.length === 0) return b.length;
            if (b.length === 0) return a.length;

            const matrix = [];

            // Inicializar la matriz
            for (let i = 0; i <= b.length; i++) {
                matrix[i] = [i];
            }

            for (let j = 0; j <= a.length; j++) {
                matrix[0][j] = j;
            }

            // Rellenar la matriz
            for (let i = 1; i <= b.length; i++) {
                for (let j = 1; j <= a.length; j++) {
                    if (b.charAt(i - 1) === a.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1, // Sustitución
                            matrix[i][j - 1] + 1,     // Inserción
                            matrix[i - 1][j] + 1      // Eliminación
                        );
                    }
                }
            }

            return matrix[b.length][a.length];
        };
        
        // Calcular distancia para cada comando y quedarse con los más cercanos
        const distances = allCommands.map(cmd => ({
            command: cmd,
            distance: levenshteinDistance(input.toLowerCase(), cmd.toLowerCase())
        }));
        
        // Ordenar por distancia y tomar los 3 más cercanos
        return distances
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 3)
            .map(item => item.command);
    }

    // Formatear el texto de ayuda para mostrarlo en el chat
    formatHelpResponse(helpData) {
        if (helpData.error) {
            let response = `${helpData.error}\n\n`;
            
            if (helpData.suggestions && helpData.suggestions.length > 0) {
                response += "¿Tal vez quisiste decir?\n";
                helpData.suggestions.forEach(cmd => {
                    response += `• ${cmd}\n`;
                });
            }
            
            return response;
        }
        
        // Para múltiples coincidencias
        if (helpData.matchingCommands) {
            let response = "Encontré varios comandos que coinciden con tu búsqueda:\n\n";
            
            helpData.matchingCommands.forEach(cmd => {
                response += `• **${cmd.command}**: ${cmd.description}\n`;
            });
            
            response += "\nPuedes pedir ayuda específica sobre cualquiera de estos comandos.";
            return response;
        }
        
        // Para ayuda general (lista de comandos)
        if (helpData.categories) {
            let response = `# ${helpData.title}\n\n${helpData.description}\n\n`;
            
            Object.keys(helpData.categories).forEach(category => {
                response += `## ${category}\n`;
                helpData.categories[category].forEach(cmd => {
                    response += `• **${cmd}**: ${this.commands[cmd].description}\n`;
                });
                response += "\n";
            });
            
            return response;
        }
        
        // Para un comando específico
        let response = `# Ayuda: ${helpData.command}\n\n`;
        response += `**Descripción**: ${helpData.description}\n\n`;
        response += `**Formato**: \`${helpData.format}\`\n\n`;
        
        if (helpData.required.length > 0) {
            response += "**Parámetros obligatorios**:\n";
            helpData.required.forEach(param => {
                response += `• ${param}\n`;
            });
            response += "\n";
        }
        
        if (helpData.optional.length > 0) {
            response += "**Parámetros opcionales**:\n";
            helpData.optional.forEach(param => {
                response += `• ${param}\n`;
            });
            response += "\n";
        }
        
        if (helpData.examples.length > 0) {
            response += "**Ejemplos**:\n";
            helpData.examples.forEach(example => {
                response += `• \`${example}\`\n`;
            });
        }
        
        if (helpData.note) {
            response += `\n**Nota**: ${helpData.note}\n`;
        }
        
        return response;
    }

    // Detectar si un mensaje es una solicitud de ayuda
    isHelpRequest(message) {
        const helpRegex = /^(ayuda|help|como|cómo|que es|qué es|como usar|cómo usar)\s+(.+)$/i;
        return helpRegex.test(message.trim());
    }

    // Procesar una solicitud de ayuda
    processHelpRequest(message) {
        message = message.trim().toLowerCase();
        
        // Verificar si es una solicitud general de ayuda
        if (message === "ayuda" || message === "help") {
            return this.formatHelpResponse(this.getGeneralHelp());
        }
        
        // Extraer el comando de la solicitud
        let commandName = "";
        
        if (message.startsWith("ayuda ")) {
            commandName = message.substring(6).trim();
        } else if (message.startsWith("help ")) {
            commandName = message.substring(5).trim();
        } else if (message.match(/^(como|cómo|que es|qué es|como usar|cómo usar)\s+(.+)$/i)) {
            commandName = message.replace(/^(como|cómo|que es|qué es|como usar|cómo usar)\s+/i, "").trim();
        }
        
        return this.formatHelpResponse(this.getHelpForCommand(commandName));
    }
}

// Exportar para su uso en la aplicación
window.HelpSystem = HelpSystem;
