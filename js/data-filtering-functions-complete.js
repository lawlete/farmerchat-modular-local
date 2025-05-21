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
            message: `Elementos de