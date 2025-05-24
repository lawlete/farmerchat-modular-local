
import { EntityType, Database } from '../types';
import { CSV_HEADERS } from '../constants';

export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const parseCSV = (csvText: string): Record<string, string>[] => {
  const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(','); // Basic split, might need improvement for CSVs with commas in values
    const entry: Record<string, string> = {};
    headers.forEach((header, index) => {
      entry[header.trim()] = values[index] ? values[index].trim() : '';
    });
    data.push(entry);
  }
  return data;
};

const camelToSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

export const convertEntityArrayToCsvString = (dataArray: any[], entityType: EntityType): string => {
  if (!dataArray || dataArray.length === 0) {
    return "";
  }

  const csvHeadersDef = CSV_HEADERS[entityType];
  if (!csvHeadersDef) {
    console.warn(`No CSV headers defined for exporting entity type: ${entityType}`);
    // Fallback: use object keys from first item, converted to snake_case
    const firstItemKeys = Object.keys(dataArray[0]);
    const headerRow = firstItemKeys.map(camelToSnakeCase).join(',');
    const dataRows = dataArray.map(row => {
      return firstItemKeys.map(key => {
        let value = row[key];
        if (value === null || value === undefined) value = '';
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`; // Basic quoting
        return value;
      }).join(',');
    });
    return [headerRow, ...dataRows].join('\r\n');
  }

  // Use defined CSV_HEADERS for order and naming
  const headerRow = csvHeadersDef.join(',');

  const dataRows = dataArray.map(row => {
    return csvHeadersDef.map(csvHeader => {
      // Convert snake_case CSV header to camelCase to find the property in the object
      let objectKey = csvHeader.replace(/_([a-z0-9])/g, (g) => g[1].toUpperCase());

      // Special handling for primary keys that are different in CSV vs object's 'id'
      if (entityType === 'contractors' && csvHeader === 'contractor_id') objectKey = 'id';
      else if (entityType === 'tasks' && csvHeader === 'task_entry_id') objectKey = 'id';
      else if (entityType === 'taskMachineryLinks' && csvHeader === 'task_machinery_link_id') objectKey = 'id';
      else if (entityType === 'taskPersonnelLinks' && csvHeader === 'task_personnel_link_id') objectKey = 'id';
      else if (entityType === 'taskInsumeLinks' && csvHeader === 'task_insume_link_id') objectKey = 'id';
      // userAccess special PK handling might be needed if export is enabled for it

      let value = row[objectKey];
      if (value === null || value === undefined) value = '';
      if (typeof value === 'string' && value.includes(',')) return `"${value}"`; // Basic CSV quoting
      return value;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\r\n');
};


export const processCsvData = (csvText: string, entityType: EntityType): any[] => {
  const parsedData = parseCSV(csvText);
  const expectedCsvHeaders = CSV_HEADERS[entityType];

  if (!expectedCsvHeaders || expectedCsvHeaders.length === 0) {
    console.warn(`No CSV headers for entity type: ${entityType}. Skipping.`);
    return [];
  }

  const results = parsedData.map(row => {
    const entity: any = {};
    let idAssignedFromCsv = false;

    for (const csvHeader of expectedCsvHeaders) {
      if (row[csvHeader] === undefined || row[csvHeader] === null || row[csvHeader] === '') {
        continue; 
      }
      
      let value: any = row[csvHeader];
      let objectKey = csvHeader.replace(/_([a-z0-9])/g, (g) => g[1].toUpperCase()); 

      let isPrimaryKeyColumn = false;
      if (csvHeader === 'id') { 
        isPrimaryKeyColumn = true;
      } else if (entityType === 'contractors' && csvHeader === 'contractor_id') {
        isPrimaryKeyColumn = true;
      } else if (entityType === 'tasks' && csvHeader === 'task_entry_id') {
        isPrimaryKeyColumn = true;
      } else if (entityType === 'taskMachineryLinks' && csvHeader === 'task_machinery_link_id') {
        isPrimaryKeyColumn = true;
      } else if (entityType === 'taskPersonnelLinks' && csvHeader === 'task_personnel_link_id') {
        isPrimaryKeyColumn = true;
      } else if (entityType === 'taskInsumeLinks' && csvHeader === 'task_insume_link_id') {
        isPrimaryKeyColumn = true;
      }
      
      if (isPrimaryKeyColumn) {
        objectKey = 'id';
        entity[objectKey] = String(value);
        idAssignedFromCsv = true;
      }

      const numericFields: Record<EntityType, string[]> = {
        clients: ['area'], users: [], contractors: [], personnel: [],
        machineries: ['year'], fields: ['area'], lots: ['area'], parcels: ['area'],
        campaigns: [], tasksList: [], productsInsumes: [],
        tasks: ['durationHours', 'costEstimated', 'costActual'],
        taskMachineryLinks: ['hoursUsed'], taskPersonnelLinks: ['hoursWorked'],
        taskInsumeLinks: ['quantityUsed'], userAccess: []
      };
      if (numericFields[entityType] && numericFields[entityType].includes(objectKey)) {
        value = parseFloat(String(value));
        if (isNaN(value)) value = undefined; 
      }

      const booleanFields: Record<EntityType, string[]> = {
        clients: [], users: [], contractors: ['isInternal'], personnel: [],
        machineries: [], fields: [], lots: [], parcels: [], campaigns: [],
        tasksList: [], productsInsumes: [], tasks: [],
        taskMachineryLinks: [], taskPersonnelLinks: [], taskInsumeLinks: [],
        userAccess: ['accessTotal']
      };
      if (booleanFields[entityType] && booleanFields[entityType].includes(objectKey)) {
        value = String(value).toLowerCase() === 'true';
      }
      
      if (value !== undefined) {
        if (!isPrimaryKeyColumn) {
            entity[objectKey] = value;
        }
      }
    }

    if (!idAssignedFromCsv && !entity.id) {
      entity.id = generateUUID();
    }

    const meaningfulKeys = Object.keys(entity).filter(k => {
        if (k === 'id' && !idAssignedFromCsv) return false; 
        return entity[k] !== undefined && entity[k] !== null && String(entity[k]).trim() !== '';
    });
    
    return meaningfulKeys.length > 0 ? entity : null;

  }).filter(e => e !== null); 

  return results;
};
