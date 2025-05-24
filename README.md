
# FarmerChat: Asistente Agrícola IA

FarmerChat es una aplicación web de simulación que actúa como un asistente virtual para la gestión de registros y tareas en el sector agropecuario. Utiliza la IA de Google Gemini para procesar comandos en lenguaje natural, permitiendo a los usuarios interactuar con una base de datos agrícola simulada de manera conversacional.

## Características Principales

*   **Interacción Basada en Chat:** Conversa con la IA (Google Gemini) para gestionar datos.
*   **Gestión de Entidades Agrícolas:** Soporte para múltiples entidades como Clientes, Usuarios, Contratistas, Personal, Maquinaria, Campos, Lotes, Parcelas, Campañas, Tipos de Tareas, Productos/Insumos y Tareas Ejecutadas (con sus tablas de enlace para recursos).
*   **Importación y Exportación de Datos:**
    *   Importar/Exportar la base de datos completa en formato JSON.
    *   Importar datos para entidades individuales desde archivos CSV.
    *   Importar múltiples archivos CSV simultáneamente con mapeo de tipo de entidad.
    *   Exportar todas las tablas de la base de datos a archivos CSV individuales.
*   **Modo Voz Interactiva:**
    *   Respuesta de la IA convertida a voz (Text-to-Speech).
    *   Entrada de comandos por voz (Speech-to-Text).
    *   Lectura automática de comandos del usuario y resultados de listados.
    *   Posibilidad de interrumpir la lectura de la IA al activar el micrófono.
    *   Activación/Desactivación del modo voz mediante botón o comando de chat.
*   **Interfaz Adaptable:**
    *   Modo Claro y Oscuro con persistencia en `localStorage`.
*   **Creación de Tareas Asistida por IA:**
    *   Sugerencias contextuales para maquinaria, personal e insumos al crear tareas.
    *   Flujo de confirmación antes de la creación final de registros.
    *   Información detallada post-creación, incluyendo el ID del nuevo registro.
*   **Visualización de Datos:** Panel lateral para mostrar el estado actual de la base de datos y los resultados de las consultas.
*   **Persistencia Local:** La base de datos se guarda en el `localStorage` del navegador.

## Tecnologías Utilizadas

*   **Frontend:** React 19, TypeScript
*   **IA y Lenguaje Natural:** Google Gemini API (`@google/genai`)
*   **Estilos:** Tailwind CSS
*   **APIs del Navegador:**
    *   Web Speech API (SpeechSynthesis para Text-to-Speech)
    *   `navigator.mediaDevices.getUserMedia` (para Speech-to-Text)
    *   File API
    *   `localStorage`

## Prerrequisitos

*   Un navegador web moderno (ej. Chrome, Firefox, Edge) con permisos para micrófono (para la funcionalidad de voz).
*   **Google Gemini API Key:** Una clave API válida de Google Gemini es **ESENCIAL** para la funcionalidad de IA.

## Configuración de la API Key

La aplicación está diseñada para obtener la Google Gemini API Key **exclusivamente** desde la variable de entorno `process.env.API_KEY`.

**MUY IMPORTANTE:** Su entorno de ejecución (ya sea un servidor de desarrollo local o una plataforma de despliegue) **DEBE** hacer que `process.env.API_KEY` esté disponible para el script `App.tsx` cuando se ejecuta en el navegador. La aplicación no funcionará con la IA si esta variable no está configurada y accesible correctamente en el contexto de ejecución del cliente.

*   **Para desarrollo local con herramientas como Vite o Create React App:**
    1.  Cree un archivo llamado `.env` en la raíz de su proyecto.
    2.  Añada la siguiente línea, reemplazando `TU_CLAVE_API_GEMINI_AQUI` con su clave real:
        ```
        API_KEY=TU_CLAVE_API_GEMINI_AQUI
        ```
    Estas herramientas típicamente exponen variables de entorno prefijadas (ej. `VITE_API_KEY`). Deberá asegurarse de que su configuración (`vite.config.js` o similar) o el código en `App.tsx` (si es necesario modificarlo para un prefijo específico) esté alineado para acceder a `API_KEY` correctamente. La versión actual de `App.tsx` espera `process.env.API_KEY` directamente.

*   **Si sirve los archivos estáticamente sin un proceso de build que maneje `.env`:**
    Deberá encontrar una manera de definir `process.env.API_KEY` en el contexto del navegador antes de que `App.tsx` se ejecute. Esto es una configuración avanzada del entorno y va más allá de la configuración directa de la aplicación. No modifique la aplicación para pedir la clave al usuario.

## Ejecución Local

La aplicación está estructurada como un conjunto de archivos estáticos (`index.html`, `index.tsx`, etc.) que utilizan módulos ES6 y un `importmap` para las dependencias.

1.  **Clonar el repositorio (si aplica) o descargar los archivos.**
2.  **Navegar al directorio del proyecto.**
3.  **Asegurar la disponibilidad de la API Key:** Confirme que su método para servir los archivos hará que `process.env.API_KEY` esté disponible para `App.tsx` (ver sección anterior).
4.  **Servir los archivos:**
    *   Utilice un servidor HTTP simple. Si tiene Python instalado:
        ```bash
        python -m http.server
        ```
        O puede usar extensiones de su editor de código como "Live Server" para VS Code.
    *   Si está utilizando un entorno de desarrollo como Vite (que es recomendado para manejar `process.env` de forma más robusta):
        ```bash
        npm install # o yarn install (necesitará un package.json)
        npm run dev # o yarn dev
        ```
        (Nota: un `package.json` y configuración de Vite no están incluidos en los archivos base proporcionados, necesitaría crearlos).
5.  **Abrir en el navegador:** Acceda a `http://localhost:[PUERTO]` (el puerto dependerá del servidor que utilice, ej. 8000 para `python -m http.server`).

## Despliegue en la Nube

Para desplegar FarmerChat en la nube como una aplicación estática:

1.  **Elegir una Plataforma:**
    *   **Vercel, Netlify, Firebase Hosting, AWS Amplify:** Estas plataformas son excelentes para desplegar frontends modernos y usualmente tienen buen soporte para configurar variables de entorno (como `API_KEY`) durante el proceso de build.
    *   **AWS S3 + CloudFront, Azure Static Web Apps, Google Cloud Storage:** Opciones robustas para hosting estático.

2.  **Configurar la API Key (CRÍTICO):**
    *   Al igual que en el entorno local, la `API_KEY` debe estar disponible como `process.env.API_KEY` en el entorno de ejecución del cliente.
    *   Si su plataforma de despliegue tiene un paso de "build", configure la `API_KEY` como una variable de entorno en la configuración de build de la plataforma.
    *   **Advertencia:** Incrustar la API Key directamente en el código del lado del cliente que se sube al hosting estático es inseguro. El uso de `process.env.API_KEY` y la confianza en que el entorno de build/despliegue lo maneje correctamente es crucial. Si la plataforma solo sirve archivos estáticos sin un paso de build que pueda inyectar esta variable, deberá considerar un backend proxy o una función serverless para realizar las llamadas a la API de Gemini, lo cual modificaría la arquitectura actual de la app. Sin embargo, la aplicación está escrita para usar `process.env.API_KEY` directamente en el cliente según las directrices.

3.  **Construir la Aplicación (si es necesario):**
    *   Si está utilizando un framework/herramienta como Vite o Create React App, ejecute el comando de build (ej. `npm run build`).

4.  **Desplegar los Archivos:**
    *   Suba el contenido de su directorio de build (o los archivos raíz como `index.html`, `index.tsx` si no hay build) a la plataforma elegida.

## Estructura de los Archivos CSV para Importación

*   Los archivos CSV deben estar codificados en UTF-8.
*   La primera fila debe contener los encabezados de las columnas.
*   Los nombres de los encabezados de columna en los CSV deben coincidir **exactamente** (en snake\_case) con los definidos en la constante `CSV_HEADERS` dentro de `constants.ts`. Consulte este archivo para ver la estructura esperada para cada tipo de entidad.
*   Algunas columnas de ID (claves primarias) tienen nombres específicos en los CSV (ej. `contractor_id` para Contratistas, `task_entry_id` para Tareas) que se mapean a la propiedad `id` en los objetos de la aplicación.
*   Para campos booleanos, use `true` o `false`.
*   Para campos numéricos, asegúrese de que los valores sean números válidos.

## Migración a Android

Convertir esta aplicación web en una aplicación para Android se puede abordar de varias maneras:

1.  **Progressive Web App (PWA):**
    *   **Cómo:** Mejorar la aplicación web con un Manifest y un Service Worker para permitir la "instalación" en el dispositivo y capacidades offline.
    *   **Ventajas:** Reutilización máxima del código, despliegue sencillo.
    *   **Consideraciones:** Acceso limitado a algunas API nativas muy específicas.

2.  **WebView Híbrida (Capacitor / Apache Cordova):**
    *   **Cómo:** Envolver la aplicación web en un contenedor nativo (WebView). Permite acceder a APIs nativas a través de plugins.
    *   **Ventajas:** Buena reutilización del código, acceso a más funciones nativas, se puede publicar en Google Play Store.
    *   **Consideraciones:** El rendimiento puede ser menor que el nativo para tareas intensivas.

3.  **Compilación a Nativo (React Native):**
    *   **Cómo:** Reconstruir la UI con componentes de React Native, que se compilan a elementos UI nativos. La lógica de negocio puede reutilizarse en gran medida.
    *   **Ventajas:** Mejor rendimiento y "sensación" nativa que las WebViews.
    *   **Consideraciones:** Requiere reescritura de la capa de UI.

4.  **Desarrollo Nativo Completo (Kotlin/Java):**
    *   **Cómo:** Reescribir la aplicación desde cero utilizando Kotlin o Java y el SDK de Android.
    *   **Ventajas:** Máximo rendimiento y acceso a todas las funcionalidades nativas.
    *   **Consideraciones:** Mayor costo y tiempo de desarrollo, base de código separada.

**Recomendación inicial para FarmerChat:**
*   **PWA** sería el paso más rápido para tener una versión instalable con capacidades offline.
*   **Capacitor** sería una buena opción si se necesita un acceso más profundo a las API nativas (especialmente para el micrófono de forma robusta si se distribuye en tienda) manteniendo la base de código React.

## Contribuir

Actualmente, este es un proyecto de simulación. Si desea expandirlo o mejorarlo, puede hacer un fork del repositorio (si está en un sistema de control de versiones) y trabajar sobre él.

## Licencia

(No especificada - puede añadir una licencia como MIT si lo desea)
```