# FarmerChat Modular - Asistente Virtual Agrícola (Simulación Local)

FarmerChat Modular es una aplicación web de simulación diseñada para actuar como un asistente virtual para la gestión de registros y tareas en el sector agropecuario. Esta versión está construida con HTML, CSS y JavaScript puro, y se ejecuta localmente en el navegador. Interactúa con un Modelo de Lenguaje Grande (LLM) como Google Gemini para procesar comandos en lenguaje natural.

**Nota Importante:** Esta es una versión de prueba y desarrollo local. No está diseñada para producción. La gestión de la API Key del LLM se realiza localmente y requiere precaución.

## Características Principales

*   **Interfaz de Chat:** Permite a los usuarios interactuar mediante comandos de texto.
*   **Entrada de Voz (Simulada con Transcripción):** Permite grabar audio que se envía a un LLM para transcripción y luego se procesa como texto.
*   **Procesamiento de Lenguaje Natural (LLM):** Utiliza Google Gemini (configurable) para interpretar comandos del usuario (Altas, Bajas, Modificaciones, Consultas).

**Hay un nuevo Esquema para la base, ver doc Readme_BD a parte!!!**

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
*   **Visualización de Datos:** Panel lateral para ver las entidades de la base de datos y resultados agrupados.
*   **Comandos de Ayuda:** La IA puede proveer ayuda sobre cómo usar los diferentes comandos.

## Estructura de la Interfaz

La aplicación presenta una interfaz dividida en tres bloques principales, cada uno con scroll independiente para facilitar la navegación y gestión:

1.  **Panel Superior:**
    *   Contiene los controles para la configuración de la API Key de Gemini.
    *   Permite cargar y guardar la base de datos completa en formato JSON.
    *   Incluye la funcionalidad para importar datos específicos de entidades desde archivos CSV.

2.  **Panel Central (Chat):**
    *   Es el área principal de interacción con FarmerChat.
    *   Aquí se escriben los comandos de texto o se inicia la grabación de voz.
    *   El historial de la conversación con la IA se muestra en este panel.

3.  **Panel Derecho (Datos):**
    *   Muestra un resumen de las entidades existentes en la base de datos (Clientes, Usuarios, Campos, Lotes, Parcelas, Trabajos/Eventos).
    *   Cuando se realizan consultas que implican agrupación de datos (ej. "trabajos agrupados por campo"), los resultados detallados se muestran en este panel.

## Obtención y Configuración de API Key de Gemini

Para que FarmerChat pueda procesar tus comandos de voz y texto utilizando inteligencia artificial, necesitas una API Key de Google Generative AI (Gemini).

1.  **Obtén tu API Key:**
    *   Visita [Google AI Studio](https://aistudio.google.com/app/apikey).
    *   Sigue las instrucciones para crear una nueva API Key si aún no tienes una.
2.  **Configura la API Key en FarmerChat:**
    *   Al iniciar la aplicación por primera vez, se mostrará una ventana emergente solicitando tu API Key.
    *   Pega la clave en el campo correspondiente y haz clic en "Guardar y Continuar".
    *   La API Key se guardará de forma segura en el **almacenamiento local de tu navegador**. Esto significa que solo estará disponible en el navegador que usaste para configurarla y no se transmite a ningún servidor externo (excepto para la comunicación directa con la API de Gemini).
    *   Si necesitas cambiar la API Key más adelante, generalmente la aplicación proveerá una opción en el panel superior o al detectar un error con la clave actual.

**Importante:** Sin una API Key válida, las funciones de procesamiento de lenguaje natural (chat y voz) no estarán disponibles.

## Formato de Archivos CSV para Importación

Puedes poblar rápidamente la base de datos de FarmerChat importando archivos CSV. Es crucial que los archivos tengan el formato correcto, incluyendo las cabeceras (nombres de columna) esperadas.

**Ubicación de Ejemplos:** Encontrarás archivos CSV de ejemplo en la carpeta `/Import/` del repositorio.

**Consideraciones Generales:**

*   **Codificación:** UTF-8 es la codificación recomendada.
*   **Separador:** Coma (`,`) es el separador de campos esperado.
*   **Cabeceras:** La primera línea del CSV debe contener los nombres de las columnas. El orden no siempre importa, pero sí que los nombres coincidan con los esperados.
*   **IDs:**
    *   Para la mayoría de las entidades, el campo `id` es opcional. Si no se provee, se autogenerará uno.
    *   Si provees un `id`, asegúrate de que sea único para esa entidad.
    *   Los IDs son fundamentales para establecer relaciones: `clientId` en Campos, `fieldId` en Lotes, `lotId` en Parcelas, etc. Asegúrate de que estos IDs de referencia existan en la base de datos (ya sea porque fueron importados previamente o porque la app los generó).
*   **Valores Booleanos:** Usar `true` o `false`.
*   **Fechas:** Preferiblemente en formato `YYYY-MM-DD` o `YYYY-MM-DDTHH:MM:SS`.

### Formato por Entidad:

A continuación, se detalla el formato para cada entidad. Las columnas marcadas con `*` son generalmente requeridas.

1.  **Clientes (`clients.csv`)**
    *   `id` (opcional, texto): Identificador único del cliente.
    *   `name` (\* texto): Nombre completo o razón social del cliente.
    *   `contactPerson` (opcional, texto): Persona de contacto.
    *   `email` (opcional, texto): Correo electrónico.
    *   `phone` (opcional, texto): Número de teléfono.
    *   `address` (opcional, texto): Dirección física.

2.  **Usuarios (`users.csv`)**
    *   `id` (opcional, texto): Identificador único del usuario.
    *   `name` (\* texto): Nombre del usuario.
    *   `role` (opcional, texto): Rol del usuario (ej. "Administrador", "Ingeniero", "Operario").
    *   `clientId` (\* texto): ID del Cliente al que está asociado el usuario.

3.  **Campos (`fields.csv`)**
    *   `id` (opcional, texto): Identificador único del campo.
    *   `name` (\* texto): Nombre del campo (ej. "La Margarita").
    *   `location` (opcional, texto): Ubicación o descripción geográfica.
    *   `area` (opcional, número): Superficie total en hectáreas.
    *   `clientId` (\* texto): ID del Cliente al que pertenece el campo.

4.  **Lotes (`lots.csv`)**
    *   `id` (opcional, texto): Identificador único del lote.
    *   `name` (\* texto): Nombre o número del lote (ej. "Lote 3A").
    *   `fieldId` (\* texto): ID del Campo al que pertenece el lote.
    *   `area` (opcional, número): Superficie del lote en hectáreas.

5.  **Parcelas (`parcels.csv`)**
    *   `id` (opcional, texto): Identificador único de la parcela.
    *   `name` (\* texto): Nombre o identificador de la parcela (ej. "Parcela Norte").
    *   `lotId` (\* texto): ID del Lote al que pertenece la parcela.
    *   `area` (opcional, número): Superficie de la parcela en hectáreas.
    *   `crop` (opcional, texto): Cultivo actual o último en la parcela.

6.  **Definiciones de Tareas (`tasksList.csv`)**
    *   `id` (opcional, texto): Identificador único de la definición de tarea.
    *   `taskName` (\* texto): Nombre de la tarea (ej. "Siembra de Maíz", "Aplicación Fitosanitaria").
    *   `description` (opcional, texto): Descripción detallada de la tarea.
    *   `category` (opcional, texto): Categoría de la tarea (ej. "Siembra", "Cosecha", "Mantenimiento").

7.  **Productos/Insumos (`productsInsumes.csv`)**
    *   `id` (opcional, texto): Identificador único del producto.
    *   `name` (\* texto): Nombre del producto o insumo.
    *   `type` (opcional, texto): Tipo (ej. "Semilla", "Fertilizante", "Herbicida").
    *   `unit` (opcional, texto): Unidad de medida (ej. "kg", "litro", "bolsa").

8.  **Maquinarias (`machineries.csv`)**
    *   `id` (opcional, texto): Identificador único de la maquinaria.
    *   `name` (\* texto): Nombre o descripción (ej. "Tractor John Deere 6110J").
    *   `type` (opcional, texto): Tipo (ej. "Tractor", "Sembradora", "Cosechadora").
    *   `model` (opcional, texto): Modelo específico.
    *   `year` (opcional, número): Año de fabricación.

9.  **Personal (`personnel.csv`)**
    *   `id` (opcional, texto): Identificador único del empleado.
    *   `name` (\* texto): Nombre completo.
    *   `role` (opcional, texto): Puesto o rol (ej. "Operario de Maquinaria", "Capataz").
    *   `phone` (opcional, texto): Número de contacto.

10. **Campañas (`campaigns.csv`)**
    *   `id` (opcional, texto): Identificador único de la campaña.
    *   `name` (\* texto): Nombre de la campaña (ej. "Soja 2023/2024").
    *   `startDate` (opcional, fecha `YYYY-MM-DD`): Fecha de inicio.
    *   `endDate` (opcional, fecha `YYYY-MM-DD`): Fecha de finalización.
    *   `clientId` (\* texto): ID del Cliente al que pertenece la campaña.
    *   `description` (opcional, texto): Objetivos o notas de la campaña.

**Nota sobre Trabajos/Eventos (`jobsEvents`):** La importación directa de trabajos/eventos vía CSV es más compleja debido a sus múltiples relaciones (parcela, tarea, insumos, personal, maquinaria, campaña). Por ahora, se recomienda crear trabajos/eventos a través de la interfaz de chat una vez que las entidades base estén cargadas.

## Comandos Disponibles (Voz/Texto)

Puedes interactuar con FarmerChat usando lenguaje natural. La IA es flexible, pero aquí tienes ejemplos de la estructura general de los comandos:

*   **Crear entidades:**
    *   _"crear campo La Esperanza en la zona de Pergamino de 150 hectáreas para el cliente Agro S.A."_
    *   _"nuevo lote Lote 5 en el campo La Esperanza"_
    *   _"registrar parcela A1 en el lote Lote 5"_
    *   _"añadir tarea Siembra de Soja"_
    *   _"programar siembra de maíz en la parcela A1 del lote Lote 5 del campo La Esperanza para el 10 de octubre"_
*   **Listar entidades:**
    *   _"listar lotes"_
    *   _"mostrar todos los campos del cliente 'Empresa Agropecuaria SRL'"_
    *   _"ver parcelas del lote Norte"_
    *   _"qué tareas hay programadas para hoy?"_
*   **Listar con filtros:**
    *   _"mostrar tareas del campo San Isidro"_
    *   _"listar trabajos completados en la campaña 'Girasol 22'"_
    *   _"ver los lotes del campo 'La Fortuna' que tienen más de 50 hectáreas"_
*   **Listar con agrupación:**
    *   _"listar trabajos agrupados por campo"_
    *   _"muéstrame las parcelas agrupadas por lote y luego por cultivo"_
    *   _"tareas programadas por estado"_
*   **Actualizar entidades:**
    *   _"actualizar el nombre del campo 'Viejo' a 'Campo Nuevo'"_
    *   _"cambiar el estado de la tarea con ID job_123 a 'Completado'"_
    *   _"modificar la superficie del lote 'Lote Sur' a 75 hectáreas"_
*   **Eliminar entidades:**
    *   _"borrar el lote Lote X del campo La Prueba"_
    *   _"eliminar la tarea de fumigación del 5 de mayo"_
*   **Comandos de Ayuda:**
    *   _"ayuda"_
    *   _"cómo creo una tarea?"_
    *   _"ayuda para el comando listar campos"_
    *   _"qué puedo hacer con los lotes?"_

La IA intentará comprender tu petición y, si es necesario, te pedirá clarificaciones.
