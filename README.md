# FarmerChat: Asistente Modular Local para Gestión Agrícola

FarmerChat es una aplicación de chat modular diseñada específicamente para la gestión de datos agrícolas. Funciona localmente, lo que permite su uso en entornos con conectividad limitada, y ofrece una interfaz de chat intuitiva para interactuar con los datos de campos, cultivos y clientes.

## Características principales

- **Interfaz de chat intuitiva**: Interactúa con tu base de datos agrícola mediante comandos en lenguaje natural.
- **Funcionamiento local**: No requiere conexión constante a internet para operar.
- **Estructura modular**: Fácil de extender y personalizar según necesidades específicas.
- **Reconocimiento de voz**: Permite dictar comandos para una experiencia manos libres.
- **Gestión de múltiples entidades**: Administra clientes, campos, cultivos y más.
- **Importación/exportación de datos**: Compatible con archivos CSV para integración con otras herramientas.
- **Sistema de ayuda integrado**: Acceso instantáneo a documentación de comandos.
- **Visualización de datos**: Panel dedicado para consultar registros y estadísticas.

## Instalación

1. Clone este repositorio:
   ```
   git clone https://github.com/lawlete/farmerchat-modular-local.git
   ```

2. Navegue al directorio del proyecto:
   ```
   cd farmerchat-modular-local
   ```

3. Abra el archivo `index.html` en su navegador web.

## Requisitos

- Navegador web moderno con soporte para JavaScript ES6
- Para reconocimiento de voz: Chrome o navegador compatible con Web Speech API
- Se recomienda un mínimo de 4GB de RAM para un rendimiento óptimo

## Estructura del proyecto

```
farmerchat-modular-local/
├── css/                     # Estilos CSS
├── js/                      # Scripts JavaScript
│   ├── modules/             # Módulos JS del sistema
│   │   ├── chat.js          # Módulo de interfaz de chat
│   │   ├── database.js      # Módulo de gestión de base de datos
│   │   ├── dataManager.js   # Módulo de gestión y filtrado de datos
│   │   ├── recognition.js   # Módulo de reconocimiento de voz
│   │   ├── helpSystem.js    # Sistema de documentación de comandos
│   │   └── ...              # Otros módulos
│   ├── models/              # Modelos de datos
│   └── app.js               # Aplicación principal
├── data/                    # Directorio para almacenamiento de datos
│   └── sample_data.json     # Datos de ejemplo
├── index.html               # Página principal
└── README.md                # Este archivo
```

## Uso básico

1. **Iniciar la aplicación**: Abra el archivo `index.html` en su navegador.
2. **Configurar**: En el panel superior, configure la base de datos y opciones de API si es necesario.
3. **Interactuar**: Use el chat para enviar comandos. Puede escribir o utilizar el botón de reconocimiento de voz.

## Comandos disponibles

### Gestión de clientes

- `crear cliente nombre='Juan Pérez' ruc='12345678901'`: Crea un nuevo cliente.
- `editar cliente id=1 telefono='555-123456'`: Actualiza información de un cliente.
- `eliminar cliente id=2`: Elimina un cliente.
- `buscar cliente Pérez`: Busca clientes por término.
- `listar clientes`: Muestra todos los clientes