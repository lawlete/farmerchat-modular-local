// Funciones para listar y agrupar datos
class DataManager {
    constructor(database) {
        this.database = database || {};
        this.currentView = null;
        this.filteredData = null;
    }

    // Actualizar la referencia a la base de datos
    setDatabase(database) {
        this.database = database || {};
    }

    // Listar todos los elementos de una tabla
    listAll(tableName) {
        if (!this.database[tableName]) {
            return {
                success: false,
                message: `La tabla '${tableName}' no existe en la base de datos`,
                data: []
            };
        }

        this.currentView = {
            tableName,
            type: 'all',
            filter: null
        };

        this.filteredData = Object.values(this.database[tableName]);

        return {
            success: true,
            message: `Listando todos los elementos de '${tableName}'`,
            data: this.filteredData,
            count: this.filteredData.length
        };
    }

    // Filtrar elementos por un campo específico
    filterByField(tableName, fieldName, value) {
        if (!this.database[tableName]) {
            return {
                success: false,
                message: `La tabla '${tableName}' no existe en la base de datos`,
                data: []
            };
        }

        this.currentView = {
            tableName,
            type: 'filter',
            filter: { fieldName, value }
        };

        // Convertir a minúsculas para búsqueda case-insensitive
        const valueLower = value.toString().toLowerCase();

        this.filteredData = Object.values(this.database[tableName]).filter(item => {
            if (item[fieldName] === undefined) return false;
            return item[fieldName].toString().toLowerCase().includes(valueLower);
        });

        return {
            success: true,
            message: `Elementos de '${tableName}' filtrados por ${fieldName} = ${value}`,
            data: this.filteredData,
            count: this.filteredData.length
        };
    }

    // Agrupar elementos por un campo
    groupByField(tableName, fieldName) {
        if (!this.database[tableName]) {
            return {
                success: false,
                message: `La tabla '${tableName}' no existe en la base de datos`,
                data: {}
            };
        }

        this.currentView = {
            tableName,
            type: 'group',
            filter: { fieldName }
        };

        const items = Object.values(this.database[tableName]);
        const groupedData = {};

        // Agrupar los elementos
        items.forEach(item => {
            const value = item[fieldName];
            if (value === undefined || value === null) {
                if (!groupedData['Sin valor']) {
                    groupedData['Sin valor'] = [];
                }
                groupedData['Sin valor'].push(item);
            } else {
                if (!groupedData[value]) {
                    groupedData[value] = [];
                }
                groupedData[value].push(item);
            }
        });

        this.filteredData = groupedData;

        // Calcular algunas estadísticas
        const stats = {
            totalGroups: Object.keys(groupedData).length,
            totalItems: items.length,
            distribution: {}
        };

        Object.keys(groupedData).forEach(key => {
            stats.distribution[key] = {
                count: groupedData[key].length,
                percentage: (groupedData[key].length / items.length * 100).toFixed(1) + '%'
            };
        });

        return {
            success: true,
            message: `Elementos de '${tableName}' agrupados por ${fieldName}`,
            data: groupedData,
            stats: stats
        };
    }

    // Ordenar elementos por un campo
    sortByField(tableName, fieldName, direction = 'asc') {
        if (!this.database[tableName]) {
            return {
                success: false,
                message: `La tabla '${tableName}' no existe en la base de datos`,
                data: []
            };
        }

        this.currentView = {
            tableName,
            type: 'sort',
            filter: { fieldName, direction }
        };

        const items = Object.values(this.database[tableName]);

        // Determinar el tipo de datos para ordenar correctamente
        const sortFn = (a, b) => {
            const valA = a[fieldName];
            const valB = b[fieldName];

            // Manejar valores nulos/indefinidos
            if (valA === undefined || valA === null) return direction === 'asc' ? -1 : 1;
            if (valB === undefined || valB === null) return direction === 'asc' ? 1 : -1;

            // Ordenar según el tipo
            if (typeof valA === 'number' && typeof valB === 'number') {
                return direction === 'asc' ? valA - valB : valB - valA;
            } else {
                // Convertir a string para comparar texto
                const strA = String(valA).toLowerCase();
                const strB = String(valB).toLowerCase();
                return direction === 'asc' 
                    ? strA.localeCompare(strB) 
                    : strB.localeCompare(strA);
            }
        };

        this.filteredData = [...items].sort(sortFn);

        return {
            success: true,
            message: `Elementos de '${tableName}' ordenados por ${fieldName} (${direction})`,
            data: this.filteredData,
            count: this.filteredData.length
        };
    }

    // Obtener estadísticas de una tabla
    getTableStats(tableName) {
        if (!this.database[tableName]) {
            return {
                success: false,
                message: `La tabla '${tableName}' no existe en la base de datos`,
                data: {}
            };
        }

        const items = Object.values(this.database[tableName]);
        
        // Si no hay elementos, devolver estadísticas básicas
        if (items.length === 0) {
            return {
                success: true,
                message: `Estadísticas de la tabla '${tableName}'`,
                data: {
                    count: 0,
                    fields: []
                }
            };
        }

        // Detectar todos los campos posibles
        const allFields = new Set();
        items.forEach(item => {
            Object.keys(item).forEach(key => allFields.add(key));
        });

        // Calcular estadísticas por campo
        const fieldStats = {};
        allFields.forEach(field => {
            // Inicializar estadísticas para este campo
            fieldStats[field] = {
                count: 0,
                nullCount: 0,
                valueTypes: {},
                uniqueValues: new Set()
            };

            // Analizar cada item
            items.forEach(item => {
                const value = item[field];
                if (value === undefined || value === null) {
                    fieldStats[field].nullCount++;
                } else {
                    fieldStats[field].count++;
                    
                    // Tipo de valor
                    const type = typeof value;
                    if (!fieldStats[field].valueTypes[type]) {
                        fieldStats[field].valueTypes[type] = 0;
                    }
                    fieldStats[field].valueTypes[type]++;
                    
                    // Valores únicos 
                    fieldStats[field].uniqueValues.add(value.toString());
                }
            });
            
            // Convertir el Set de valores únicos a array y limitar si es muy grande
            const uniqueValuesArray = Array.from(fieldStats[field].uniqueValues);
            fieldStats[field].uniqueCount = uniqueValuesArray.length;
            fieldStats[field].uniqueValues = uniqueValuesArray.length > 10 
                ? uniqueValuesArray.slice(0, 10).concat(['...más valores']) 
                : uniqueValuesArray;
        });

        return {
            success: true,
            message: `Estadísticas de la tabla '${tableName}'`,
            data: {
                count: items.length,
                fields: fieldStats
            }
        };
    }

    // Obtener los datos actuales filtrados para mostrarlos
    getCurrentViewData() {
        if (!this.currentView) {
            return {
                success: false,
                message: 'No hay ninguna vista activa',
                data: null
            };
        }

        return {
            success: true,
            view: this.currentView,
            data: this.filteredData
        };
    }

    // Renderizar los datos en una tabla HTML
    renderToTable(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!this.filteredData || !this.currentView) {
            container.innerHTML = '<p>No hay datos para mostrar</p>';
            return;
        }

        // Para vista agrupada
        if (this.currentView.type === 'group') {
            this._renderGroupedData(container);
            return;
        }

        // Para vistas de lista normal
        this._renderListData(container);
    }

    // Renderizar datos agrupados
    _renderGroupedData(container) {
        const fieldName = this.currentView.filter.fieldName;
        let html = `<h3>Datos agrupados por "${fieldName}"</h3>`;
        
        const groups = Object.keys(this.filteredData);
        
        if (groups.length === 0) {
            html += '<p>No hay datos para mostrar</p>';
        } else {
            html += '<div class="accordion">';
            
            groups.forEach(group => {
                const items = this.filteredData[group];
                const itemCount = items.length;
                
                html += `
                    <div class="accordion-item">
                        <div class="accordion-header">
                            <strong>${group}</strong> (${itemCount} elementos)
                        </div>
                        <div class="accordion-content">
                            <table class="data-table">
                                <thead>
                                    <tr>`;
                
                // Determinar encabezados basados en el primer elemento
                if (items.length > 0) {
                    const headers = Object.keys(items[0]);
                    headers.forEach(header => {
                        html += `<th>${header}</th>`;
                    });
                }
                
                html += `</tr>
                                </thead>
                                <tbody>`;
                
                // Agregar filas de datos
                items.forEach(item => {
                    html += '<tr>';
                    Object.values(item).forEach(value => {
                        html += `<td>${value}</td>`;
                    });
                    html += '</tr>';
                });
                
                html += `</tbody>
                            </table>
                        </div>
                    </div>`;
            });
            
            html += '</div>';
        }
        
        container.innerHTML = html;
        
        // Agregar interactividad a los acordeones
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const isActive = header.classList.contains('active');
                
                // Cerrar todos los acordeones
                document.querySelectorAll('.accordion-header').forEach(h => {
                    h.classList.remove('active');
                    if (h.nextElementSibling) {
                        h.nextElementSibling.style.display = 'none';
                    }
                });
                
                // Abrir el actual (si no estaba ya abierto)
                if (!isActive) {
                    header.classList.add('active');
                    content.style.display = 'block';
                }
            });
        });
    }

    // Renderizar datos de lista
    _renderListData(container) {
        const tableName = this.currentView.tableName;
        let html = `<h3>Datos de "${tableName}"</h3>`;
        
        if (!this.filteredData || this.filteredData.length === 0) {
            html += '<p>No hay datos para mostrar</p>';
        } else {
            html += `
                <div class="table-info">
                    <span>${this.filteredData.length} elementos</span>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>`;
            
            // Determinar encabezados basados en el primer elemento
            const headers = Object.keys(this.filteredData[0]);
            headers.forEach(header => {
                html += `<th>${header}</th>`;
            });
            
            html += `</tr>
                    </thead>
                    <tbody>`;
            
            // Agregar filas de datos
            this.filteredData.forEach(item => {
                html += '<tr>';
                headers.forEach(header => {
                    html += `<td>${item[header] !== undefined ? item[header] : ''}</td>`;
                });
                html += '</tr>';
            });
            
            html += `</tbody>
                </table>`;
        }
        
        container.innerHTML = html;
    }
}

// Integración con la aplicación principal
document.addEventListener('DOMContentLoaded', () => {
    // Estilos adicionales para el acordeón y las tablas
    const style = document.createElement('style');
    style.textContent = `
        .accordion {
            margin-top: 15px;
            border: 1px solid #eaeaea;
            border-radius: 5px;
            overflow: hidden;
        }
        
        .accordion-item {
            border-bottom: 1px solid #eaeaea;
        }
        
        .accordion-item:last-child {
            border-bottom: none;
        }
        
        .accordion-header {
            padding: 12px 15px;
            background-color: #f5f5f5;
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.3s;
        }
        
        .accordion-header:hover {
            background-color: #e9e9e9;
        }
        
        .accordion-header.active {
            background-color: #e0f2e0;
        }
        
        .accordion-content {
            padding: 15px;
            display: none;
            background-color: #fff;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .table-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            color: #666;
            font-size: 13px;
        }
    `;
    document.head.appendChild(style);
});

// Exportar para su uso en la aplicación
window.DataManager = DataManager;
