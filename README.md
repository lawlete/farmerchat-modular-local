# FarmerChat Modular - Asistente Virtual Agrícola (Simulación Local)

FarmerChat Modular es una aplicación web de simulación diseñada para actuar como un asistente virtual para la gestión de registros y tareas en el sector agropecuario. Esta versión está construida con HTML, CSS y JavaScript puro, y se ejecuta localmente en el navegador. Interactúa con un Modelo de Lenguaje Grande (LLM) como Google Gemini para procesar comandos en lenguaje natural.

**Nota Importante:** Esta es una versión de prueba y desarrollo local. No está diseñada para producción. La gestión de la API Key del LLM se realiza localmente y requiere precaución.

## Características Principales

*   **Interfaz de Chat:** Permite a los usuarios interactuar mediante comandos de texto.
*   **Entrada de Voz (Simulada con Transcripción):** Permite grabar audio que se envía a un LLM para transcripción y luego se procesa como texto.
*   **Procesamiento de Lenguaje Natural (LLM):** Utiliza Google Gemini (configurable) para interpretar comandos del usuario (Altas, Bajas, Modificaciones, Consultas).
*   **Gestión de Entidades Agrícolas:** Simula la gestión de:
    *   Clientes
    *   Usuarios
    *   Campos
    *   Lotes
    *   Parcelas
    *   Definiciones de Tareas
    *   Productos/Insumos
    *   Maquinarias
    *   Personal
    *   Campañas
    *   Trabajos/Eventos
*   **Base de Datos en Memoria (Simulada):** Los datos se almacenan en JavaScript y persisten en la sesión del navegador usando `localStorage`.
*   **Importación/Exportación de Base de Datos:**
    *   Guarda la base de datos simulada como un archivo JSON.
    *   Carga una base de datos desde un archivo JSON.
*   **Importación Masiva desde CSV:** Permite poblar la base de datos cargando archivos CSV para diferentes entidades.
