# Esquema de Base de Datos para Aplicación de Gestión Agrícola (FarmerChat Modular) - v5

Este documento describe la estructura de la base de datos utilizada por la aplicación, incluyendo las tablas principales, tablas de enlace y sus relaciones. El objetivo es gestionar clientes, sus explotaciones (campos, lotes, parcelas), campañas agrícolas, recursos (personal, maquinaria, insumos), tareas y contratistas.

## Diagrama de Entidad-Relación (Conceptual)

(Aquí podrías incluir un diagrama visual si es posible, o describirlo textualmente)

**Entidades Principales:**
*   Clientes (`clients`)
*   Usuarios de la Aplicación (`users`)
*   Campos/Fincas (`fields`)
*   Lotes (`lots`)
*   Parcelas (`parcels`)
*   Campañas (`campaigns`)
*   Tipos de Tareas Predefinidas (`tasksList`)
*   Insumos/Productos (`productsInsumes`)
*   Personal (`personnel`)
*   Maquinaria (`machineries`)
*   Contratistas (`contractors`)
*   Tareas Ejecutadas (`tasks`)

**Relaciones Clave y Tablas de Enlace:**
*   Un Cliente tiene muchos Usuarios, Campos, Campañas.
*   Un Campo tiene muchos Lotes. Un Lote tiene muchas Parcelas.
*   Un Contratista (puede ser interno del cliente o externo) tiene Personal y Maquinaria.
*   Una Tarea es para un Cliente, realizada por un Contratista.
*   Una Tarea puede involucrar múltiples Personas, múltiples Maquinarias y múltiples Insumos (gestionado mediante tablas de enlace).

## Descripción Detallada de las Tablas

---

### `clients.csv`
Almacena información sobre los clientes de la plataforma.

| Columna       | Tipo      | Descripción                                   | PK/FK | Constraints        |
|---------------|-----------|-----------------------------------------------|-------|--------------------|
| id            | TEXT      | Identificador único del cliente (Ej: client_01) | PK    | NOT NULL, UNIQUE   |
| name          | TEXT      | Nombre o razón social del cliente             |       | NOT NULL           |
| phone         | TEXT      | Número de teléfono de contacto                |       |                    |
| email         | TEXT      | Correo electrónico de contacto                |       |                    |
| contactPerson | TEXT      | Nombre de la persona de contacto principal    |       |                    |
| address       | TEXT      | Dirección física del cliente                  |       |                    |

---

### `users.csv`
Usuarios de la aplicación que interactúan con el sistema.

| Columna  | Tipo   | Descripción                                       | PK/FK      | Constraints        |
|----------|--------|---------------------------------------------------|------------|--------------------|
| id       | TEXT   | Identificador único del usuario (Ej: user_admin_ama) | PK         | NOT NULL, UNIQUE   |
| name     | TEXT   | Nombre del usuario                                |            | NOT NULL           |
| role     | TEXT   | Rol del usuario (Ej: Administrator, Engineer, Worker) |            | NOT NULL           |
| clientId | TEXT   | ID del cliente al que está asociado el usuario    | FK (clients.id) | NOT NULL           |

---

### `contractors.csv`
Empresas o entidades (incluyendo recursos propios del cliente) que realizan tareas.

| Columna        | Tipo    | Descripción                                            | PK/FK | Constraints        |
|----------------|---------|--------------------------------------------------------|-------|--------------------|
| contractor_id  | TEXT    | Identificador único del contratista (Ej: cont_int_001) | PK    | NOT NULL, UNIQUE   |
| name           | TEXT    | Nombre del contratista                                 |       | NOT NULL           |
| contact_person | TEXT    | Persona de contacto en el contratista                  |       |                    |
| address        | TEXT    | Dirección del contratista                              |       |                    |
| phone          | TEXT    | Teléfono del contratista                               |       |                    |
| is_internal    | BOOLEAN | True si son recursos propios del cliente, False si es externo |       | NOT NULL           |

---

### `personnel.csv`
Personal que puede ser asignado a tareas, perteneciente a un cliente o a un contratista.

| Columna       | Tipo   | Descripción                                     | PK/FK                 | Constraints        |
|---------------|--------|-------------------------------------------------|-----------------------|--------------------|
| id            | TEXT   | Identificador único del personal (Ej: pers_op_gimenez) | PK                    | NOT NULL, UNIQUE   |
| name          | TEXT   | Nombre del miembro del personal                 |                       | NOT NULL           |
| role          | TEXT   | Rol general del personal (Ej: Operator, Engineer, ContractorFirm) |                       | NOT NULL           |
| phone         | TEXT   | Número de teléfono                              |                       |                    |
| clientId      | TEXT   | ID del cliente al que pertenece este personal (si es propio) o con el que se asocia un contratista | FK (clients.id)       | NOT NULL (indica a qué cliente "sirve" principalmente este recurso, incluso si es de un contratista externo que trabaja para ese cliente) |
| contractor_id | TEXT   | ID del contratista al que pertenece el personal | FK (contractors.contractor_id) | NOT NULL           |

---

### `machineries.csv`
Maquinaria disponible, perteneciente a un cliente o a un contratista.

| Columna       | Tipo   | Descripción                                     | PK/FK                 | Constraints        |
|---------------|--------|-------------------------------------------------|-----------------------|--------------------|
| id            | TEXT   | Identificador único de la maquinaria (Ej: mach_jd_7200) | PK                    | NOT NULL, UNIQUE   |
| name          | TEXT   | Nombre descriptivo de la maquinaria             |                       | NOT NULL           |
| type          | TEXT   | Tipo de maquinaria (Ej: Tractor, Cosechadora)   |                       | NOT NULL           |
| model         | TEXT   | Modelo específico                               |                       |                    |
| year          | INTEGER| Año de fabricación                              |                       |                    |
| clientId      | TEXT   | ID del cliente al que pertenece esta maquinaria (si es propia) o con el que se asocia un contratista | FK (clients.id)       | NOT NULL (similar a `personnel.clientId`) |
| contractor_id | TEXT   | ID del contratista al que pertenece la maquinaria | FK (contractors.contractor_id) | NOT NULL           |

---

### `fields.csv`
Campos o fincas pertenecientes a un cliente.

| Columna  | Tipo    | Descripción                                  | PK/FK      | Constraints        |
|----------|---------|----------------------------------------------|------------|--------------------|
| id       | TEXT    | Identificador único del campo (Ej: field_ama_01) | PK         | NOT NULL, UNIQUE   |
| name     | TEXT    | Nombre del campo                             |            | NOT NULL           |
| location | TEXT    | Ubicación del campo                          |            |                    |
| clientId | TEXT    | ID del cliente propietario del campo         | FK (clients.id) | NOT NULL           |
| area     | NUMERIC | Área total del campo (en hectáreas u otra unidad) |            |                    |

---

### `lots.csv`
Lotes o subdivisiones dentro de un campo.

| Columna | Tipo    | Descripción                                   | PK/FK        | Constraints        |
|---------|---------|-----------------------------------------------|--------------|--------------------|
| id      | TEXT    | Identificador único del lote (Ej: lot_ama_e_01) | PK           | NOT NULL, UNIQUE   |
| name    | TEXT    | Nombre del lote                               |              | NOT NULL           |
| fieldId | TEXT    | ID del campo al que pertenece el lote         | FK (fields.id) | NOT NULL           |
| area    | NUMERIC | Área del lote                                 |              |                    |

---

### `parcels.csv`
Parcelas o subdivisiones aún más pequeñas dentro de un lote.

| Columna | Tipo    | Descripción                                     | PK/FK       | Constraints        |
|---------|---------|-------------------------------------------------|-------------|--------------------|
| id      | TEXT    | Identificador único de la parcela (Ej: parcel_ama_e01_01) | PK          | NOT NULL, UNIQUE   |
| name    | TEXT    | Nombre de la parcela                            |             | NOT NULL           |
| lotId   | TEXT    | ID del lote al que pertenece la parcela         | FK (lots.id) | NOT NULL           |
| area    | NUMERIC | Área de la parcela (opcional)                   |             |                    |
| crop    | TEXT    | Cultivo actual en la parcela (opcional)         |             |                    |

---

### `campaigns.csv`
Campañas agrícolas (zafras, ciclos productivos) asociadas a un cliente.

| Columna     | Tipo    | Descripción                                      | PK/FK      | Constraints        |
|-------------|---------|--------------------------------------------------|------------|--------------------|
| id          | TEXT    | Identificador único de la campaña (Ej: camp_soja2324_ama) | PK         | NOT NULL, UNIQUE   |
| name        | TEXT    | Nombre de la campaña                             |            | NOT NULL           |
| startDate   | DATE    | Fecha de inicio de la campaña                    |            |                    |
| endDate     | DATE    | Fecha de fin de la campaña                       |            |                    |
| clientId    | TEXT    | ID del cliente al que pertenece la campaña       | FK (clients.id) | NOT NULL           |
| description | TEXT    | Descripción adicional de la campaña              |            |                    |

---

### `tasksList.csv`
Catálogo de tipos de tareas predefinidas.

| Columna     | Tipo   | Descripción                                     | PK/FK | Constraints        |
|-------------|--------|-------------------------------------------------|-------|--------------------|
| id          | TEXT   | Identificador único del tipo de tarea (Ej: task_siembra) | PK    | NOT NULL, UNIQUE   |
| taskName    | TEXT   | Nombre del tipo de tarea (Ej: Siembra Directa)  |       | NOT NULL           |
| description | TEXT   | Descripción del tipo de tarea                   |       |                    |
| category    | TEXT   | Categoría de la tarea (Ej: Cultivo, Ganadería)  |       |                    |

---

### `productsInsumes.csv`
Catálogo de productos, insumos, semillas, etc.

| Columna | Tipo   | Descripción                                     | PK/FK | Constraints        |
|---------|--------|-------------------------------------------------|-------|--------------------|
| id      | TEXT   | Identificador único del producto (Ej: prod_glifo_max) | PK    | NOT NULL, UNIQUE   |
| name    | TEXT   | Nombre del producto                             |       | NOT NULL           |
| type    | TEXT   | Tipo de producto (Ej: Herbicide, Seed, Fertilizer) |       | NOT NULL           |
| unit    | TEXT   | Unidad de medida del producto (Ej: litro, kg, bolsa) |       | NOT NULL           |

---

### `tareas.csv` (Tabla Principal de Tareas Ejecutadas)
Registra las tareas planificadas o realizadas.

| Columna              | Tipo      | Descripción                                       | PK/FK                          | Constraints        |
|----------------------|-----------|---------------------------------------------------|--------------------------------|--------------------|
| task_entry_id        | TEXT      | Identificador único de la entrada de tarea (Ej: task_entry_v5_001) | PK                             | NOT NULL, UNIQUE   |
| task_id_ref          | TEXT      | ID del tipo de tarea                              | FK (tasksList.id)              | NOT NULL           |
| created_by_user_id   | TEXT      | ID del usuario que creó/registró la tarea         | FK (users.id)                  | NOT NULL           |
| client_id            | TEXT      | ID del cliente para el cual se realiza la tarea   | FK (clients.id)                | NOT NULL           |
| contractor_id        | TEXT      | ID del contratista que realiza la tarea           | FK (contractors.contractor_id) | NOT NULL           |
| campaign_id          | TEXT      | ID de la campaña a la que pertenece la tarea (opcional) | FK (campaigns.id)              |                    |
| field_id             | TEXT      | ID del campo donde se realiza la tarea (opcional) | FK (fields.id)                 |                    |
| lot_id               | TEXT      | ID del lote donde se realiza la tarea (opcional)  | FK (lots.id)                   |                    |
| parcel_id            | TEXT      | ID de la parcela donde se realiza la tarea (opcional) | FK (parcels.id)                |                    |
| start_datetime       | TIMESTAMP | Fecha y hora de inicio de la tarea                |                                |                    |
| end_datetime         | TIMESTAMP | Fecha y hora de finalización de la tarea          |                                |                    |
| duration_hours       | NUMERIC   | Duración de la tarea en horas                     |                                |                    |
| status               | TEXT      | Estado de la tarea (Ej: Programada, Finalizada)   |                                | NOT NULL           |
| cost_estimated       | NUMERIC   | Costo estimado de la tarea                        |                                |                    |
| cost_actual          | NUMERIC   | Costo real de la tarea                            |                                |                    |
| result_description   | TEXT      | Descripción de los resultados de la tarea         |                                |                    |
| notes                | TEXT      | Notas adicionales sobre la tarea                  |                                |                    |
| creation_timestamp   | TIMESTAMP | Fecha y hora de creación del registro de la tarea |                                | NOT NULL           |

---

### `task_machineries_link.csv` (Tabla de Enlace: Tareas <-> Maquinaria)
Vincula las tareas con las múltiples maquinarias utilizadas.

| Columna                  | Tipo    | Descripción                                        | PK/FK                            | Constraints        |
|--------------------------|---------|----------------------------------------------------|----------------------------------|--------------------|
| task_machinery_link_id | TEXT    | Identificador único del enlace Tarea-Maquinaria    | PK                               | NOT NULL, UNIQUE   |
| task_entry_id            | TEXT    | ID de la tarea                                     | FK (tareas.task_entry_id)        | NOT NULL           |
| machinery_id             | TEXT    | ID de la maquinaria utilizada                      | FK (machineries.id)              | NOT NULL           |
| hours_used               | NUMERIC | Horas que esta máquina fue usada en esta tarea (opcional) |                                  |                    |
| notes                    | TEXT    | Notas específicas sobre el uso de esta máquina (opcional) |                                  |                    |

---

### `task_personnel_link.csv` (Tabla de Enlace: Tareas <-> Personal)
Vincula las tareas con el múltiple personal involucrado.

| Columna                | Tipo    | Descripción                                            | PK/FK                            | Constraints        |
|------------------------|---------|--------------------------------------------------------|----------------------------------|--------------------|
| task_personnel_link_id | TEXT    | Identificador único del enlace Tarea-Personal          | PK                               | NOT NULL, UNIQUE   |
| task_entry_id          | TEXT    | ID de la tarea                                         | FK (tareas.task_entry_id)        | NOT NULL           |
| personnel_id           | TEXT    | ID del miembro del personal involucrado                | FK (personnel.id)                | NOT NULL           |
| role_in_task           | TEXT    | Rol específico de la persona en esta tarea (opcional)  |                                  |                    |
| hours_worked           | NUMERIC | Horas trabajadas por esta persona en la tarea (opcional) |                                  |                    |

---

### `task_insumes_link.csv` (Tabla de Enlace: Tareas <-> Insumos)
Vincula las tareas con los múltiples insumos utilizados.

| Columna               | Tipo    | Descripción                                       | PK/FK                               | Constraints        |
|-----------------------|---------|---------------------------------------------------|-------------------------------------|--------------------|
| task_insume_link_id   | TEXT    | Identificador único del enlace Tarea-Insumo       | PK                                  | NOT NULL, UNIQUE   |
| task_entry_id         | TEXT    | ID de la tarea                                    | FK (tareas.task_entry_id)           | NOT NULL           |
| product_insume_id     | TEXT    | ID del producto/insumo utilizado                  | FK (productsInsumes.id)             | NOT NULL           |
| quantity_used         | NUMERIC | Cantidad del insumo utilizada                     |                                     | NOT NULL           |
| unit_used             | TEXT    | Unidad de la cantidad (puede derivarse del producto) |                                     | NOT NULL           |
| application_details | TEXT    | Detalles específicos de la aplicación (opcional)  |                                     |                    |

---

### `user_access.csv` (Opcional, para control de acceso granular)
Define qué usuarios tienen acceso a qué campos (y por extensión a sus lotes/parcelas).

| Columna       | Tipo    | Descripción                                   | PK/FK (Compuesta) | Constraints        |
|---------------|---------|-----------------------------------------------|-------------------|--------------------|
| user_id       | TEXT    | ID del usuario                                | FK (users.id)     | NOT NULL           |
| campo_id      | TEXT    | ID del campo al que tiene acceso              | FK (fields.id)    | NOT NULL           |
| acceso_total  | BOOLEAN | Indica si tiene acceso total o restringido (True/False) |                   | NOT NULL           |
| *PK Compuesta: (user_id, campo_id)*                                                                               |                   |                    |

## Consideraciones Adicionales

*   **Tipos de Datos:** Los tipos (TEXT, INTEGER, NUMERIC, DATE, TIMESTAMP, BOOLEAN) son genéricos. Deben adaptarse al SGBD específico (ej: VARCHAR, INT, DECIMAL, DATETIME).
*   **Índices:** Se deben crear índices en las columnas de clave foránea (FK) y en aquellas usadas frecuentemente en cláusulas `WHERE` para optimizar las consultas.
*   **Valores Nulos (NULL):** Las columnas marcadas como opcionales pueden contener valores NULL.
*   **Unicidad (UNIQUE):** Las claves primarias (PK) son inherentemente únicas y no nulas. Otras columnas pueden tener restricciones de unicidad según la lógica de negocio.
