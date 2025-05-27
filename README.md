
# Movil FarmerChat IA: Asistente Agrícola

Movil FarmerChat IA es una aplicación web progresiva (PWA) de simulación que actúa como un asistente virtual para la gestión de registros y tareas en el sector agropecuario. Utiliza la IA de Google Gemini para procesar comandos en lenguaje natural, permitiendo a los usuarios interactuar con una base de datos agrícola simulada de manera conversacional. Al ser una PWA, puede "instalarse" en dispositivos Android para una experiencia similar a una aplicación nativa.

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
*   **Capacidades PWA:**
    *   Instalable en dispositivos Android (y otros sistemas operativos compatibles).
    *   Funcionalidad básica sin conexión gracias al Service Worker que almacena en caché los activos principales de la aplicación.

## Tecnologías Utilizadas

*   **Frontend:** React 19, TypeScript
*   **IA y Lenguaje Natural:** Google Gemini API (`@google/genai`)
*   **Estilos:** Tailwind CSS
*   **Build Tool (Recomendado):** Vite
*   **APIs del Navegador:**
    *   Web Speech API (SpeechSynthesis para Text-to-Speech)
    *   `navigator.mediaDevices.getUserMedia` (para Speech-to-Text)
    *   File API
    *   `localStorage`
    *   Service Workers & Web App Manifest (para PWA)

## Prerrequisitos

*   Un navegador web moderno (ej. Chrome, Firefox, Edge en escritorio; Chrome, Samsung Internet en Android) con permisos para micrófono (para la funcionalidad de voz).
*   **Google Gemini API Key:** Una clave API válida de Google Gemini es **ESENCIAL** para la funcionalidad de IA.
*   Node.js y npm/yarn (si se utiliza Vite para el desarrollo).

## Configuración de la API Key

La aplicación está diseñada para obtener la Google Gemini API Key de dos maneras, en el siguiente orden de prioridad:

1.  **Para entornos Vite (Recomendado):** A través de `import.meta.env.VITE_API_KEY`.
2.  **Como fallback o para otros entornos:** A través de `process.env.API_KEY`.

**MUY IMPORTANTE:** Su entorno de ejecución (ya sea un servidor de desarrollo local con Vite o una plataforma de despliegue) **DEBE** hacer que una de estas variables de entorno esté disponible para el script `App.tsx` cuando se ejecuta en el navegador. La aplicación no funcionará con la IA si esta variable no está configurada y accesible correctamente.

*   **Para desarrollo local con Vite (Recomendado):**
    1.  Asegúrese de tener Vite instalado en su proyecto. Si no, puede configurarlo (el usuario gestionará esta parte).
    2.  Cree un archivo llamado `.env` en la raíz de su proyecto (si no existe).
    3.  Añada la siguiente línea, reemplazando `TU_CLAVE_API_GEMINI_AQUI` con su clave real:
        ```
        VITE_API_KEY=TU_CLAVE_API_GEMINI_AQUI
        ```
    Vite expondrá automáticamente las variables de entorno que comiencen con `VITE_` a `import.meta.env`.

*   **Para entornos que no usan Vite o como fallback:**
    Si su configuración expone variables de entorno a través de `process.env` (por ejemplo, algunos despliegues o configuraciones de servidor más antiguas):
    1.  Cree un archivo `.env` o `.env.local` (dependiendo de su sistema) en la raíz del proyecto.
    2.  Añada:
        ```
        API_KEY=TU_CLAVE_API_GEMINI_AQUI
        ```
    *Nota: Si utiliza Vite, `VITE_API_KEY` tendrá prioridad. El uso directo de `process.env.API_KEY` en el código del cliente sin un paso de compilación que lo reemplace es generalmente menos seguro y más difícil de gestionar que el método `import.meta.env` de Vite.*

La aplicación **no debe ser modificada para pedir la clave API al usuario bajo ninguna circunstancia.**

## Ejecución Local

La aplicación está estructurada como un conjunto de archivos estáticos (`index.html`, `index.tsx`, `manifest.json`, `service-worker.js` etc.) que utilizan módulos ES6 y un `importmap` para las dependencias. Se recomienda usar **Vite** para el desarrollo.

1.  **Clonar el repositorio (si aplica) o descargar los archivos.**
2.  **Crear iconos PWA:** Asegúrese de tener los iconos referenciados en `manifest.json` (e.g., `icon-192x192.png`, `icon-512x512.png`) en una carpeta `public/icons/` (o simplemente `icons/` si ajusta las rutas en `manifest.json` y `service-worker.js` si no usa un directorio `public` estándar de Vite).
3.  **Navegar al directorio del proyecto.**
4.  **Asegurar la disponibilidad de la API Key:** Configure su archivo `.env` como se describe en "Configuración de la API Key".
5.  **Servir los archivos:**
    *   **Con Vite (Recomendado):**
        *   Si aún no tiene un `package.json`, inicialice uno (`npm init -y` o `yarn init -y`).
        *   Instale Vite y las dependencias React:
            ```bash
            npm install vite @vitejs/plugin-react react react-dom @google/genai
            # o
            yarn add vite @vitejs/plugin-react react react-dom @google/genai
            ```
        *   Cree un archivo `vite.config.js` o `vite.config.ts` (la configuración básica para React es simple, puede consultar la documentación de Vite).
        *   Ajuste el `index.html` para que cargue el `index.tsx` a través de una etiqueta `<script type="module" src="/index.tsx"></script>` dentro de `<body>` (Vite manejará el `importmap` o puede eliminarlo si Vite gestiona las dependencias).
        *   Ejecute el servidor de desarrollo de Vite:
            ```bash
            npm run dev 
            # o 
            yarn dev 
            # (Necesitará añadir "dev": "vite" a los scripts de su package.json)
            ```
    *   **Con un servidor HTTP simple (para la estructura actual sin build de Vite):**
        Utilice un servidor HTTP simple. Si tiene Python instalado:
        ```bash
        python -m http.server
        ```
        O puede usar extensiones de su editor de código como "Live Server" para VS Code.
        *Importante: Con este método, la API key debe estar disponible a través de `process.env.API_KEY` por otros medios si `import.meta.env.VITE_API_KEY` no está disponible, lo cual es más complejo sin un proceso de build.*
6.  **Abrir en el navegador:** Acceda a `http://localhost:[PUERTO]` (el puerto dependerá del servidor que utilice, ej. 5173 para Vite por defecto, 8000 para `python -m http.server`).
7.  **Instalar la PWA (Opcional):** En navegadores compatibles (como Chrome), busque la opción "Instalar aplicación" o un ícono similar en la barra de direcciones.

## Despliegue en la Nube

Para desplegar Movil FarmerChat IA en la nube como una PWA (preferiblemente usando Vite para el build):

1.  **Elegir una Plataforma:**
    *   **Vercel, Netlify, Firebase Hosting, AWS Amplify, GitHub Pages (con Vite):** Estas plataformas son excelentes para desplegar frontends modernos y usualmente tienen buen soporte para configurar variables de entorno (como `VITE_API_KEY`) durante el proceso de build. También sirven el contenido sobre HTTPS, lo cual es un requisito para Service Workers (excepto en localhost).
    *   **AWS S3 + CloudFront, Azure Static Web Apps, Google Cloud Storage:** Opciones robustas para hosting estático. Asegúrese de configurar HTTPS.

2.  **Configurar la API Key (CRÍTICO):**
    *   Configure `VITE_API_KEY` como una variable de entorno en la configuración de build de su plataforma de despliegue. Durante el proceso de build de Vite, `import.meta.env.VITE_API_KEY` será reemplazado por el valor real.
    *   Si no usa Vite para el build y su plataforma expone `process.env.API_KEY` al entorno del cliente (menos común y menos seguro para claves de este tipo), el fallback podría funcionar, pero es preferible el método de Vite.
    *   **Advertencia:** Incrustar la API Key directamente en el código del lado del cliente que se sube al hosting estático es inseguro. El uso de variables de entorno inyectadas en tiempo de build (como hace Vite) es crucial.

3.  **Construir la Aplicación (con Vite):**
    *   Ejecute el comando de build de Vite:
        ```bash
        npm run build 
        # o 
        yarn build 
        # (Necesitará añadir "build": "vite build" a los scripts de su package.json)
        ```
    Esto generará una carpeta `dist` (o similar) con los archivos estáticos optimizados.

4.  **Desplegar los Archivos:**
    *   Suba el contenido de su directorio de build (ej. `dist/`) a la plataforma elegida.

## Estructura de los Archivos CSV para Importación

*   Los archivos CSV deben estar codificados en UTF-8.
*   La primera fila debe contener los encabezados de las columnas.
*   Los nombres de los encabezados de columna en los CSV deben coincidir **exactamente** (en snake\_case) con los definidos en la constante `CSV_HEADERS` dentro de `constants.ts`. Consulte este archivo para ver la estructura esperada para cada tipo de entidad.
*   Algunas columnas de ID (claves primarias) tienen nombres específicos en los CSV (ej. `contractor_id` para Contratistas, `task_entry_id` para Tareas) que se mapean a la propiedad `id` en los objetos de la aplicación.
*   Para campos booleanos, use `true` o `false`.
*   Para campos numéricos, asegúrese de que los valores sean números válidos.

## Adaptación para Android (PWA)

Esta aplicación ha sido convertida en una **Progressive Web App (PWA)**, lo que la hace directamente "instalable" y utilizable en dispositivos Android de forma muy similar a una aplicación nativa.

*   **Instalación:**
    1.  Abra la URL de la aplicación desplegada en un navegador compatible en Android (ej. Chrome).
    2.  El navegador debería ofrecer la opción de "Añadir a pantalla de inicio" o "Instalar aplicación".
    3.  Una vez instalada, la aplicación aparecerá en el cajón de aplicaciones y se ejecutará en su propia ventana, sin la barra de direcciones del navegador.
*   **Funcionalidad Offline:** Gracias al Service Worker, la interfaz principal de la aplicación y los datos previamente cargados (a través de la interacción del usuario y el manejo de la base de datos en `localStorage`) estarán disponibles incluso sin conexión a internet. Las interacciones con la IA de Gemini, sin embargo, seguirán necesitando conexión.
*   **Permisos Nativos:** La PWA utilizará las APIs estándar del navegador para el acceso al micrófono, solicitando permiso al usuario como lo haría cualquier sitio web.

**Otras formas de "Migración a Android" (si se requiere más integración nativa):**

Aunque la PWA ofrece una excelente experiencia, si se necesitan funcionalidades nativas más profundas o una distribución a través de Google Play Store con más control, se pueden considerar:

1.  **WebView Híbrida (Capacitor / Apache Cordova):**
    *   **Cómo:** Envolver la aplicación web PWA existente en un contenedor nativo (WebView). Permite acceder a APIs nativas a través de plugins. Capacitor es una opción moderna.
    *   **Ventajas:** Buena reutilización del código PWA, acceso a más funciones nativas, se puede publicar en Google Play Store.
    *   **Consideraciones:** El rendimiento puede ser menor que el nativo para tareas intensivas. La gestión de la API Key necesitaría ser manejada por el wrapper nativo para inyectarla de forma segura.

2.  **Trusted Web Activity (TWA):**
    *   **Cómo:** Una forma de empaquetar tu PWA como una APK para subirla a Google Play Store, ejecutándola a pantalla completa usando el motor de Chrome del dispositivo.
    *   **Ventajas:** Utiliza tu PWA existente, se beneficia de las actualizaciones de Chrome, puede listarse en Play Store.
    *   **Consideraciones:** Requiere configuración específica y cumplir con los criterios de calidad de PWA.

3.  **Compilación a Nativo (React Native) o Desarrollo Nativo Completo (Kotlin/Java):**
    *   Estas opciones implican una reescritura significativa (parcial o total) y son adecuadas si se busca el máximo rendimiento nativo o una integración muy profunda con el sistema operativo.

**Recomendación actual:** La implementación como PWA es un gran paso para la compatibilidad con Android. Evalúe esta versión y, si las necesidades exceden sus capacidades, explore Capacitor o TWA como siguientes pasos.

## Contribuir

Actualmente, este es un proyecto de simulación. Si desea expandirlo o mejorarlo, puede hacer un fork del repositorio (si está en un sistema de control de versiones) y trabajar sobre él.

## Licencia

(No especificada - puede añadir una licencia como MIT si lo desea)
