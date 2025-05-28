# Manual de Usuario: Movil FarmerChat IA 🧑‍🌾🤖 (Versión Actualizada)

¡Bienvenido a Movil FarmerChat IA, tu nuevo compañero digital para la gestión agrícola! Esta guía te ayudará a sacar el máximo provecho de la aplicación y a simplificar tus tareas diarias en el campo.

**Versión del Manual:** 3.2 (Refleja la app con sección de problemas ampliada)

## 1. ¿Qué es Movil FarmerChat IA y Cómo Puede Ayudarte?

Movil FarmerChat IA es una aplicación inteligente diseñada para actuar como tu asistente virtual personal en el sector agropecuario. Imagina poder hablar o escribirle a un experto que entiende tus necesidades y te ayuda a organizar:

*   Clientes y Usuarios
*   Contratistas y Personal (tanto propio como externo)
*   Maquinaria Agrícola
*   Campos, Lotes y Parcelas
*   Campañas Agrícolas (Soja 23/24, Maíz Tardío, etc.)
*   Catálogo de Tipos de Tareas (Siembra, Fumigación, Cosecha)
*   Catálogo de Productos e Insumos
*   Tareas Ejecutadas (con detalles de maquinaria, personal e insumos utilizados)

**El Objetivo Principal:** Simplificar la entrada y consulta de datos, permitiéndote gestionar tu explotación de manera más eficiente usando lenguaje natural.

**Ventajas Clave:**
✅ **Fácil de Usar:** Olvídate de menús complicados. Simplemente conversa con la IA.
✅ **Información Centralizada:** Todos tus registros en un solo lugar.
✅ **Ahorro de Tiempo:** Accede y registra datos rápidamente.
✅ **Mejor Organización:** Mantén un control detallado de tus operaciones.
✅ **Accesibilidad:**
    *   **PWA (Aplicación Web Progresiva):** Úsala en tu teléfono Android como si fuera una app nativa.
    *   **Modo Voz Interactiva:** Ideal para cuando estás en el campo y tienes las manos ocupadas.
✅ **Control de Tus Datos:** Importa y exporta tu información fácilmente. Borra la base de datos cuando necesites empezar de nuevo.
✅ **Base de Datos de Prueba:** Comienza a explorar al instante con datos de ejemplo.

---

## 2. Primeros Pasos: Un Vistazo Rápido a la Interfaz

Al abrir la aplicación por primera vez, o si no hay datos guardados, verás una **Pantalla de Bienvenida**. Esta pantalla te ofrece un resumen rápido de las capacidades de la aplicación, ejemplos de comandos y cómo usar las funciones de carga de datos y modo voz. Desde aquí, puedes acceder directamente al chat.

Una vez en la interfaz principal, esta se divide principalmente en:

*   **Panel de Chat (Izquierda en Escritorio / Principal en Móvil):** Aquí es donde la magia sucede. Escribes o hablas tus comandos, y la IA te responde.
*   **Panel de Datos (Derecha en Escritorio):** Visualiza el estado completo de tu base de datos. Puedes expandir cada categoría (Clientes, Campos, Tareas) para ver los registros. En dispositivos móviles, este panel podría estar oculto o accesible de forma diferente; los resultados de consultas como listados se mostrarán directamente en las burbujas de chat de la IA.
*   **Barra Superior:** Contiene botones para acciones rápidas como importar/exportar datos, cambiar el tema, activar el modo voz y borrar la base de datos.

**Base de Datos de Prueba Automática:**
¡No te preocupes por empezar de cero! La aplicación intentará cargar automáticamente una Base de Datos de Prueba (`BD_testing.json`) la primera vez que la usas o si tu base de datos local está vacía o es inválida. Esto te permite experimentar y ver cómo funciona todo sin tener que ingresar tus propios datos inmediatamente.
Si por alguna razón la base de datos de prueba no puede cargarse, o si deseas usar tus propios datos, puedes utilizar las opciones de importación en la Barra Superior.

---

## 3. Interactuando con FarmerChat AI: Tu Asistente Personal

La clave de Movil FarmerChat IA es su capacidad para entender tus instrucciones en lenguaje natural.

**Comandos de Chat (¡Habla o Escribe!)**

Aquí tienes algunos ejemplos de lo que puedes pedirle a la IA:

*   **Crear Registros:**
    *   `"Crear cliente llamado Campos La Esperanza, teléfono 12345, email info@esperanza.com"`
    *   `"Registrar un nuevo tractor John Deere modelo 6150J para el contratista interno Servicios Propios"`
    *   `"Añadir un nuevo campo 'El Retiro' de 150 hectáreas para el cliente Campos La Esperanza"`
*   **Listar y Consultar Información:**
    *   `"Listar todos mis clientes"`
    *   `"Muéstrame las tareas de siembra para la campaña Soja 2024"`
    *   `"¿Cuál es el área del lote 'Norte 1' del campo 'El Amanecer'?"`
    *   `"Buscar personal llamado Juan Pérez"`
*   **Crear Tareas Agrícolas (¡La IA te guía!):**
    *   Simple: `"Crear tarea de fumigación para el lote Sur del campo La Esperanza."`
        *   La IA podría preguntar: `“Perfecto. Para la fumigación en el lote Sur, tengo estas sugerencias de maquinaria: [lista]. ¿Alguna te sirve o quieres ver más? También dime qué personal e insumos usar.”`
    *   Con detalles: `"Programar cosecha de maíz en la parcela P1A del Lote L1, usando la cosechadora CX800 y con el operario Luis García. Es para la campaña Maíz Tardío 23/24."`
    *   Confirmación: Antes de crear una tarea compleja, la IA te presentará un resumen:
        *   IA: `“Ok, voy a crear la tarea de cosecha para la parcela P1A con Cosechadora CX800 y operario Luis García. ¿Es correcto?”`
    *   Resultado: Una vez creada, la IA te confirmará y te dará el ID de la nueva tarea.
        *   IA: `“¡Tarea de cosecha (ID: task-uuid-123) creada con éxito!”`
*   **Obtener Ayuda:**
    *   `"Ayuda"` o `"¿Qué puedo hacer?"` para obtener un recordatorio de las capacidades.

**Modo Voz Interactiva: ¡Manos Libres en el Campo! 🎤➡️🗣️**

Esta función es ideal cuando estás trabajando y no puedes escribir.

*   **¿Qué es?** Habla tus comandos directamente a la aplicación y escucha las respuestas de la IA en voz alta.
*   **Activación/Desactivación:**
    1.  **Por Botón de Modo Voz (<VoiceOnIcon /> / <VoiceOffIcon />):** Ubicado en la barra superior (sección "Controles de App"). Púlsalo para activar (icono rojo <VoiceOnIcon />) o desactivar (icono gris <VoiceOffIcon />).
    2.  **Por Comando de Chat:** Escribe `"Activar modo voz"` o `"Desactivar modo voz"`. La IA confirmará el cambio.
*   **¿Cómo Funciona?**
    1.  Cuando el modo voz está activo, el micrófono (en el panel de chat) se activará automáticamente si la IA termina de hablar con una pregunta o sugerencia que invita a una respuesta. También puedes activarlo manually con el botón de micrófono.
    2.  **Habla tu comando.** La app transcribirá tu voz a texto.
    3.  **Silencio Automático:** Si dejas de hablar por unos segundos (aprox. 3 segundos de silencio), la grabación se detendrá automáticamente y se procesará tu comando.
    4.  La IA procesará el comando y su respuesta se leerá en voz alta.
    5.  Los resultados de listados (si son muchos) se resumirán por voz, pero podrás ver los detalles completos en el chat.
    6.  **Interrupción:** Si la IA está hablando y necesitas dar un nuevo comando, simplemente activa el micrófono (botón <MicrophoneIcon />). Esto detendrá la lectura actual de la IA para que puedas hablar.

*   **Ventajas:**
    *   Perfecto para usar mientras conduces maquinaria o realizas inspecciones.
    *   Agiliza la entrada de datos sin necesidad de teclear.

---

## 4. La Barra Superior: Tus Herramientas de Gestión de Datos

La barra superior está organizada en grupos de botones para un acceso rápido a las funciones clave:

*(De izquierda a derecha)*

1.  **Borrar Base de Datos:**
    *   **Icono:** <DeleteDatabaseIcon /> (Cubo de basura rojo)
    *   **Nombre (Tooltip):** Borrar Base de Datos (¡Peligro!)
    *   **Función:** Elimina **COMPLETAMENTE** toda la base de datos almacenada en la aplicación y en tu navegador. Esta acción es irreversible y pedirá una confirmación. ¡Úsalo con precaución y asegúrate de tener respaldos!

2.  **Grupo: Operaciones de Base de Datos:**
    *   **Botón: Cargar BD**
        *   **Icono:** <UploadIcon /> (Nube con flecha hacia arriba, azul)
        *   **Nombre (Tooltip):** Importar Base de Datos Completa desde Archivo
        *   **Función:** Carga una base de datos completa desde un único archivo (formato JSON). Ideal para restaurar un respaldo previamente exportado o para cargar un conjunto de datos completo.
    *   **Botón: Guardar BD**
        *   **Icono:** <DownloadIcon /> (Nube con flecha hacia abajo, verde)
        *   **Nombre (Tooltip):** Exportar Base de Datos Completa a Archivo (Respaldo)
        *   **Función:** ¡Tu Respaldo Principal! Guarda TODA tu base de datos actual (todas las tablas) en un único archivo (formato JSON). Haz esto regularmente.

3.  **Grupo: Operaciones de Tablas:**
    *   **Botón: Tablas (Importar Múltiples)**
        *   **Icono:** <MultiFileIcon /> (Múltiples archivos, morado)
        *   **Nombre (Tooltip):** Importar Múltiples Tablas desde Archivos
        *   **Función:** Permite seleccionar varios archivos de tabla (formato CSV) a la vez. Luego, un asistente te ayudará a asignar cada archivo al tipo de entidad correcto (Clientes, Tareas, etc.). La app intentará sugerir el tipo de entidad basado en el nombre del archivo.
    *   **Botón: Tablas (Exportar Todas)**
        *   **Icono:** <ExportPackageIcon /> (Paquete con flecha, turquesa/teal)
        *   **Nombre (Tooltip):** Exportar Todas las Tablas a Archivos
        *   **Función:** Exporta cada tabla de tu base de datos (Clientes, Campos, Tareas, etc., que contengan datos) como un archivo individual (formato CSV), todos a la vez. Útil para análisis en hojas de cálculo.
    *   **Botón: Tabla (Importar Individual)**
        *   **Icono:** <FileCsvIcon /> (Archivo CSV, amarillo)
        *   **Nombre (Tooltip):** Importar Tabla Individual desde Archivo
        *   **Función:** Al hacer clic, se despliega una lista para que elijas qué tipo de entidad estás importando (Ej: “Maquinaria”). Luego, seleccionas tu archivo de tabla (formato CSV) para esa tabla específica. Reemplaza los datos de esa tabla.

4.  **Grupo: Controles de App:**
    *   **Botón: Modo Voz**
        *   **Icono:** <VoiceOnIcon /> (Rojo cuando activo) / <VoiceOffIcon /> (Gris cuando inactivo)
        *   **Nombre (Tooltip):** Activar/Desactivar Modo Voz
        *   **Función:** Activa o desactiva el Modo Voz Interactiva (entrada por voz, salida por audio).
    *   **Botón: Tema**
        *   **Icono:** <SunIcon /> (Para cambiar a modo claro) / <MoonIcon /> (Para cambiar a modo oscuro)
        *   **Nombre (Tooltip):** Modo Claro/Modo Oscuro
        *   **Función:** Cambia la apariencia de la aplicación entre un tema claro y uno oscuro. Tu preferencia se guardará.

---

## 5. Manejando Tus Datos con Tablas (Archivos en formato CSV)

Los archivos CSV (Valores Separados por Comas) son un formato estándar para intercambiar datos tabulares. Puedes crearlos o editarlos con programas como Microsoft Excel, Google Sheets, LibreOffice Calc, o incluso un editor de texto.

**Importación de Tablas**

*   **Para qué:** Para cargar masivamente datos en la aplicación, ya sea al inicio o para actualizar tablas.
*   **Cómo:**
    *   **Una sola Tabla / Archivo:** Usa el botón amarillo "**Tabla**" (<FileCsvIcon />). Selecciona el tipo de entidad (ej. “Clientes”) del desplegable y luego tu archivo (formato CSV).
    *   **Múltiples Tablas / Archivos:** Usa el botón morado "**Tablas**" (<MultiFileIcon />). Selecciona todos los archivos (formato CSV) que quieras importar. Aparecerá una ventana modal donde podrás asignar el tipo de entidad correcto a cada archivo (la app intentará adivinarlo por el nombre del archivo).
*   **Estructura del Archivo de Tabla (¡CRUCIAL!):**
    1.  **Codificación:** UTF-8 (es el estándar para asegurar compatibilidad).
    2.  **Primera Fila:** Debe contener los encabezados de columna.
    3.  **Nombres de Encabezados:** Deben coincidir con los definidos por la aplicación (ej. `client_id`, `task_name`). Consulta la tabla de referencia más abajo.
    4.  **Separador:** Comas (`,`).
    5.  **Valores con Comas:** Si un valor de texto contiene una coma, debe ir entre comillas dobles. Ejemplo: `"Lote Grande, Sector Norte"`.
    6.  **Identificadores Únicos (IDs):**
        *   Si tu archivo tiene una columna de ID (con el nombre de encabezado correcto como `id`, `contractor_id`, etc.), la app usará ese ID.
        *   Si la columna de ID no existe o está vacía para alguna fila, la app generará un ID único automáticamente para ese registro.
    7.  **Valores Lógicos (Verdadero/Falso):** Escribe `true` o `false` (sin comillas, en minúsculas). (Ej. para `isInternal` en Contratistas).
    8.  **Fechas:** Usa el formato `AAAA-MM-DD` (ej. `2024-03-15`). Para **Fecha y Hora (Timestamp):** Usa el formato `AAAA-MM-DDTHH:MM:SSZ` (ej. `2024-03-15T14:30:00Z`), que representa la hora en UTC (Tiempo Universal Coordinado).
    9.  **Campos Numéricos:** Asegúrate de que los valores sean números válidos (ej. `area`, `year`, `hoursUsed`).

*   **Tabla de Referencia para Encabezados de Archivos de Tabla (Principales):**
    A continuación, los encabezados (en `snake_case`) que tus archivos deben usar para cada tipo de entidad.

| Entidad (Tipo en App)        | Encabezados Esperados (Ejemplos)                                                                                                                                                                   | Notas                                                                |
| :--------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| Clientes (clients)           | `id`, `name`, `phone`, `email`, `contactPerson`, `address`                                                                                                                                             |                                                                      |
| Usuarios (users)             | `id`, `name`, `role`, `clientId`                                                                                                                                                                       | `clientId` es el ID del Cliente asociado.                            |
| Contratistas (contractors)   | `contractor_id` (PK), `name`, `contact_person`, `address`, `phone`, `is_internal`                                                                                                                      | `is_internal` es `true`/`false`. |
| Personal (personnel)         | `id`, `name`, `role`, `phone`, `clientId`, `contractor_id`                                                                                                                                             | `clientId`, `contractor_id` son IDs de referencia.                   |
| Maquinarias (machineries)    | `id`, `name`, `type`, `model`, `year`, `clientId`, `contractor_id`                                                                                                                                     | `year` es numérico.                                                  |
| Campos (fields)              | `id`, `name`, `location`, `clientId`, `area`                                                                                                                                                           | `area` en hectáreas u otra unidad numérica.                          |
| Lotes (lots)                 | `id`, `name`, `fieldId`, `area`                                                                                                                                                                        | `fieldId` es el ID del Campo asociado.                               |
| Parcelas (parcels)           | `id`, `name`, `lotId`, `area`, `crop`                                                                                                                                                                  | `lotId` es el ID del Lote asociado.                                  |
| Campañas (campaigns)         | `id`, `name`, `startDate`, `endDate`, `clientId`, `description`                                                                                                                                        | `startDate`, `endDate` en formato `AAAA-MM-DD`.                      |
| Tipos de Tarea (tasksList)   | `id`, `taskName`, `description`, `category`                                                                                                                                                            | Catálogo de definiciones de tareas.                                  |
| Productos/Insumos (productsInsumes) | `id`, `name`, `type`, `unit`                                                                                                                                                                   | Catálogo de insumos.                                                 |
| Tareas Ejecutadas (tasks)    | `task_entry_id` (PK), `task_id_ref`, `created_by_user_id`, `client_id`, `contractor_id`, `campaign_id`, `field_id`, `lot_id`, `parcel_id`, `start_datetime`, `end_datetime`, `duration_hours`, `status`, `cost_estimated`, `cost_actual`, `result_description`, `notes`, `creation_timestamp`, `additional_info` | Fechas/horas en formato UTC (`AAAA-MM-DDTHH:MM:SSZ`). |
| Enlaces Tarea-Maquinaria (taskMachineryLinks) | `task_machinery_link_id` (PK), `task_entry_id`, `machinery_id`, `hours_used`, `notes`                                                                                                     | Enlaza Tareas con Maquinaria.                                        |
| Enlaces Tarea-Personal (taskPersonnelLinks) | `task_personnel_link_id` (PK), `task_entry_id`, `personnel_id`, `role_in_task`, `hours_worked`                                                                                              | Enlaza Tareas con Personal.                                          |
| Enlaces Tarea-Insumo (taskInsumeLinks) | `task_insume_link_id` (PK), `task_entry_id`, `product_insume_id`, `quantity_used`, `unit_used`, `application_details`                                                                       | Enlaza Tareas con Productos/Insumos.                                 |
| Acceso de Usuario (userAccess) | `user_id`, `campo_id`, `acceso_total`                                                                                                                                                                  | `acceso_total` es `true`/`false`. |

*Nota: La columna marcada como PK (Clave Primaria) o la primera columna listada (ej. `contractor_id`, `task_entry_id`) suele ser el identificador único para los registros de esa tabla.*

*   **Ejemplo de Archivo de Tabla para Clientes (clients.csv):**
    ```csv
    id,name,phone,email,contactPerson,address
    client_001,Agropecuaria El Sol,+549351..._sol@agrosol.com,Ana Sol,"Ruta 3, Km 50"
    client_002,Estancia La Luna,+549299...,admin@laluna.net,Pedro Luna,"Camino Vecinal S/N, Paraje El Cruce"
    ```
    *(Asegúrate de no tener saltos de línea dentro de un campo si no está entrecomillado)*

**Exportación a Archivos de Tabla (Formato CSV)**

*   **Para qué:** Para analizar tus datos en otros programas (Excel, Power BI), compartirlos, o tener una copia de seguridad en un formato tabular estándar.
*   **Cómo:** Usa el botón "**Tablas**" (<ExportPackageIcon /> con un ícono de paquete) en el grupo "Operaciones de Tablas". La aplicación generará y descargará un archivo (formato CSV) para cada tipo de entidad que contenga datos.

---

## 6. Visualización de Datos: El Panel de Datos (Escritorio)

En la versión de escritorio de la aplicación, el Panel de Datos (a la derecha) te ofrece una vista completa y organizada de toda la información almacenada.

*   **Resultados de Consultas:** Cuando le pides a la IA que liste entidades (ej. `"Listar todas las maquinarias del contratista X"`), los resultados detallados aparecerán aquí, además de en la burbuja de chat. Se mostrarán en formato de tabla o como tarjetas expandibles.
*   **Explorador de Base de Datos:**
    *   Verás una lista de todos los tipos de entidades (Clientes, Campos, Tareas, etc.).
    *   Cada entidad muestra cuántos registros tiene (ej. “Campos (5)”).
    *   Haz clic en el nombre de una entidad para expandirla y ver todos sus registros.
    *   Cada registro se puede expandir para ver todos sus detalles.

En dispositivos móviles, para mantener la interfaz limpia, el panel de datos completo no está siempre visible. Sin embargo, los resultados de tus consultas (listados, etc.) se mostrarán claramente dentro de las burbujas de respuesta de la IA en el chat.

---

## 7. Configuración de la API Key de Google Gemini (Para Administradores/Desarrolladores)

**Atención: Esta sección está dirigida a administradores o desarrolladores que configuran la aplicación.**

La funcionalidad de Inteligencia Artificial de Movil FarmerChat IA depende de una clave API válida de Google Gemini. La aplicación está diseñada para obtener esta clave de variables de entorno.

**MUY IMPORTANTE:** Su entorno de ejecución (ya sea un servidor de desarrollo local con Vite o una plataforma de despliegue) **DEBE** hacer que una de estas variables de entorno esté disponible para el script de la aplicación. La IA no funcionará si esta variable no está configurada correctamente.

*   **Para desarrollo local con Vite (Recomendado):**
    1.  Asegúrese de tener Vite instalado en su proyecto.
    2.  Cree un archivo llamado `.env` en la raíz de su proyecto (si no existe).
    3.  Añada la siguiente línea, reemplazando `TU_CLAVE_API_GEMINI_AQUI` con su clave real:
        ```
        VITE_API_KEY=TU_CLAVE_API_GEMINI_AQUI
        ```
        Vite expondrá automáticamente las variables de entorno que comiencen con `VITE_` a `import.meta.env`.

*   **Como fallback o para otros entornos:**
    La aplicación también intentará leer `process.env.API_KEY`. Si usa un sistema de build o despliegue que define esta variable, podría funcionar.

**La aplicación NO pedirá la clave API al usuario final bajo ninguna circunstancia.** Si la clave no está configurada o es incorrecta, aparecerá un mensaje de error en el chat indicando un problema de configuración.

---

## 8. Consejos y Buenas Prácticas

*   🗣️ **Sé Específico en tus Comandos:** Cuanto más claro y detallado seas, mejor te entenderá la IA.
    *   Menos efectivo: `“Crear tarea.”`
    *   Más efectivo: `“Crear tarea de siembra de soja para el lote 5 del campo ‘La Chaqueña’, usando el tractor JD y con el operario Luis Pérez, para la campaña Soja 23/24.”`
*   🆔 **Usa Nombres o IDs:** La IA puede reconocer entidades por su nombre (ej. “Cliente Agropecuaria El Sol”) o por su identificador único (ej. “client_01”).
*   💾 **¡Respalda Regularmente!** La tranquilidad no tiene precio. Usa el botón verde "**Guardar BD**" (<DownloadIcon />) para guardar una copia completa de tu base de datos en un archivo. Guárdala en un lugar seguro.
*   🧪 **Experimenta con la BD de Prueba:** Antes de ingresar todos tus datos reales, familiarízate con las funciones usando la base de datos de prueba que se carga inicialmente.
*   🧐 **Verifica las Respuestas de la IA:** Antes de confirmar una creación o modificación importante, lee el resumen que te da la IA para asegurarte de que todo esté correcto.
*   🎤 **Permisos de Micrófono:** Si el modo voz no funciona, asegúrate de que la aplicación (tu navegador) tenga permiso para acceder al micrófono en la configuración de tu dispositivo y del navegador.

---

## 9. PWA: Tu App en el Bolsillo (Android) 📱

Móvil FarmerChat IA es una Aplicación Web Progresiva (PWA). Esto significa que puedes “instalarla” en tu teléfono Android para una experiencia similar a una app nativa.

*   **Cómo Instalar:**
    1.  Abre la dirección web de Móvil FarmerChat IA en tu navegador Chrome (u otro compatible) en Android.
    2.  Busca en el menú del navegador una opción como “Instalar aplicación”, “Añadir a pantalla de inicio” o un icono similar.
    3.  Sigue las instrucciones. ¡Y listo!
*   **Beneficios:**
    *   **Acceso Rápido:** Un icono en tu pantalla de inicio o cajón de aplicaciones.
    *   **Experiencia Inmersiva:** Se abre en su propia ventana, sin la barra del navegador.
    *   **Funcionalidad Offline Básica:** La interfaz principal de la app y los datos ya cargados estarán disponibles incluso sin conexión (gracias al Service Worker). Las funciones de IA seguirán necesitando internet.

---

## 10. ¿Problemas? (Solución de Problemas)

*   **“La IA no me entiende bien”**:
    *   Intenta reformular tu comando. Sé más específico.
    *   Divide comandos complejos en pasos más pequeños.

*   **Problemas al Cargar Datos (Base de Datos `.json` o Tablas `.csv`)**:
    *   **Causa Común:** Estás intentando cargar un tipo de archivo con el botón incorrecto.
        *   **Solución:** Asegúrate de usar el botón "**Cargar BD**" (<UploadIcon /> azul) para un archivo `.json` que contiene TODA tu base de datos. Usa los botones "**Tablas**" (<MultiFileIcon /> morado) o "**Tabla**" (<FileCsvIcon /> amarillo) para archivos `.csv` que representan tablas individuales.
    *   **Causa: Archivo Corrupto o Mal Formateado:**
        *   **Solución para Base de Datos (`.json`):** El archivo puede estar dañado o su estructura interna no es la que la aplicación espera (ej. faltan listas principales de entidades como "clients", "fields", etc.). Si es un respaldo muy antiguo, puede no ser compatible con versiones nuevas de la app que tengan cambios estructurales.
        *   **Solución para Tablas (`.csv`):** Los encabezados de columna en tu archivo CSV deben coincidir EXACTAMENTE con los especificados en la **Sección 5** de este manual. Revisa también que el archivo use comas como separadores y que los textos con comas internas estén entre comillas dobles. Puedes abrir el CSV con un editor de texto simple o una hoja de cálculo para inspeccionarlo.
    *   **Diagnóstico:**
        *   Intenta cargar la Base de Datos de Prueba: Si borras tu base de datos actual (usando el botón "Borrar BD" <DeleteDatabaseIcon /> rojo – ¡recuerda respaldar primero si tienes datos importantes!), la aplicación debería cargar automáticamente la base de datos de prueba. Si esto funciona, el problema probablemente reside en el formato o contenido de tus archivos personales.
        *   Si la carga de tu Base de Datos (`.json`) completa falla, pero tienes los datos como archivos de Tabla (`.csv`) individuales, intenta importarlos uno por uno o usando la opción de "Importar Múltiples Tablas".

*   **“Error de API Key”, “Funcionalidad de IA no disponible” o "Error de Configuración: La clave API para Gemini no está configurada."**:
    *   Este es un problema de configuración que debe resolver el administrador o desarrollador de la aplicación. La clave API de Google Gemini es esencial y debe estar correctamente configurada en las variables de entorno del sistema donde se ejecuta la aplicación (ver **Sección 7: Configuración de la API Key**).

*   **"Error de Cuota: Se ha excedido la cuota de la API"**:
    *   **Explicación:** Este mensaje significa que la clave API de Google Gemini que utiliza la aplicación ha alcanzado su límite de uso (consultas, cantidad de datos procesados, etc.) permitido por Google para un período determinado (ej. por minuto, por día, o mensual).
    *   **Solución para el Usuario:**
        *   Generalmente, esto es temporal. Intenta usar la aplicación más tarde, ya que las cuotas suelen reiniciarse automáticamente después de un tiempo.
        *   Si el problema persiste por mucho tiempo, es probable que el administrador de la aplicación o el desarrollador necesiten revisar la cuenta de Google Cloud o Google AI Studio asociada con la clave API. Podría ser necesario ajustar los límites de cuota o verificar el estado de facturación de la cuenta.

*   **“El modo voz no graba” o “No escucho a la IA”**:
    *   Verifica que hayas dado permiso al micrófono a tu navegador/aplicación.
    *   Asegúrate de que el volumen de tu dispositivo no esté en silencio.
    *   Comprueba que el Modo Voz Interactiva esté activado (botón <VoiceOnIcon /> rojo en la barra superior).
    *   Revisa la consola del navegador (Herramientas de Desarrollador > Consola) por mensajes de error relacionados con el audio o el micrófono.

*   **La grabación de voz se detiene demasiado pronto o no detecta bien el final de mi frase:**
    *   La aplicación utiliza un sistema de detección de silencio para detener la grabación automáticamente. Si estás en un ambiente ruidoso o si haces pausas largas, esto podría afectar la detección. Intenta hablar de forma continua y en un ambiente lo más silencioso posible.

*   **Contacto y Soporte Adicional:**
    Si encuentras otros problemas, tienes dudas que este manual no resuelve, o deseas hacer sugerencias para mejorar Movil FarmerChat IA, ¡tus comentarios son bienvenidos!
    Puedes contactar al equipo de desarrollo a través de:
    *   **Instagram:** @lawertechnology
    *   **Email:** lawertechnology@gmail.com

---

## 11. ¡Empieza a Transformar tu Gestión Agrícola!

Movil FarmerChat IA está aquí para hacerte la vida más fácil. Explora sus funciones, experimenta con los comandos y descubre cómo la inteligencia artificial puede ser una herramienta poderosa en tu día a día en el campo.

¡Te invitamos a probarla y a llevar tu gestión agrícola al siguiente nivel! 🚀
