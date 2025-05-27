
import React, { useState, useEffect } from 'react';
import { EntityType, ALL_ENTITY_TYPES } from '../types';
import { ENTITY_DISPLAY_NAMES } from '../constants';

interface MultipleCsvUploadModalProps {
  files: File[];
  onClose: () => void;
  onSubmit: (filesToProcess: { file: File, entityType: EntityType }[]) => void;
  entityTypes: EntityType[]; // All available entity types for dropdown
}

interface FileMapping {
  file: File;
  suggestedType: EntityType | null;
  selectedType: EntityType | ''; // Empty string for 'not selected'
}

const normalizeString = (str: string): string => {
  return str.toLowerCase().replace(/[\s_-]+/g, '');
};

const suggestEntityType = (filename: string): EntityType | null => {
  const normalizedFilename = normalizeString(filename.substring(0, filename.lastIndexOf('.'))); // remove extension
  
  for (const entity of ALL_ENTITY_TYPES) {
    const displayName = ENTITY_DISPLAY_NAMES[entity];
    if (normalizedFilename.includes(normalizeString(entity))) {
      return entity;
    }
    if (displayName && normalizedFilename.includes(normalizeString(displayName))) {
      return entity;
    }
  }
  // More specific suggestions common in filenames
  if (normalizedFilename.includes("cliente")) return 'clients';
  if (normalizedFilename.includes("usuario")) return 'users';
  if (normalizedFilename.includes("contratista")) return 'contractors';
  if (normalizedFilename.includes("personal") || normalizedFilename.includes("empleado")) return 'personnel';
  if (normalizedFilename.includes("maquinaria") || normalizedFilename.includes("maquina")) return 'machineries';
  if (normalizedFilename.includes("campo") || normalizedFilename.includes("finca")) return 'fields';
  if (normalizedFilename.includes("lote")) return 'lots';
  if (normalizedFilename.includes("parcela")) return 'parcels';
  if (normalizedFilename.includes("campana") || normalizedFilename.includes("campaña")) return 'campaigns';
  if (normalizedFilename.includes("tipotarea") || normalizedFilename.includes("taskslist") || normalizedFilename.includes("tasklist")) return 'tasksList';
  if (normalizedFilename.includes("producto") || normalizedFilename.includes("insumo")) return 'productsInsumes';
  
  return null;
};

export const MultipleCsvUploadModal: React.FC<MultipleCsvUploadModalProps> = ({
  files,
  onClose,
  onSubmit,
  entityTypes,
}) => {
  const [fileMappings, setFileMappings] = useState<FileMapping[]>([]);

  useEffect(() => {
    setFileMappings(
      files.map(file => {
        const suggestion = suggestEntityType(file.name);
        return {
          file,
          suggestedType: suggestion,
          selectedType: suggestion || '',
        };
      })
    );
  }, [files]);

  const handleTypeChange = (index: number, type: EntityType | '') => {
    setFileMappings(prevMappings =>
      prevMappings.map((mapping, i) =>
        i === index ? { ...mapping, selectedType: type } : mapping
      )
    );
  };

  const handleSubmit = () => {
    const filesToProcess = fileMappings
      .filter(mapping => mapping.selectedType !== '')
      .map(mapping => ({ file: mapping.file, entityType: mapping.selectedType as EntityType }));
    
    if (filesToProcess.length > 0) {
      onSubmit(filesToProcess);
    } else {
      // Optionally, show a message if no files are ready for processing
      alert("Por favor, selecciona un tipo de entidad para al menos un archivo.");
    }
  };

  const allFilesMapped = fileMappings.every(m => m.selectedType !== '');

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="multi-csv-modal-title"
    >
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col text-gray-800 dark:text-gray-100">
        <h2 id="multi-csv-modal-title" className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
          Asignar Tipos a Archivos de Tabla
        </h2>
        
        <div className="overflow-y-auto mb-4 pr-2 flex-grow">
          {fileMappings.length === 0 && <p className="text-gray-600 dark:text-gray-400">No hay archivos seleccionados.</p>}
          {fileMappings.map((mapping, index) => (
            <div key={index} className="mb-4 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
              <p className="font-medium text-sm truncate" title={mapping.file.name}>
                Archivo: <span className="text-blue-600 dark:text-blue-400">{mapping.file.name}</span>
              </p>
              {mapping.suggestedType && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Sugerencia: {ENTITY_DISPLAY_NAMES[mapping.suggestedType]}
                </p>
              )}
              <label htmlFor={`entity-type-${index}`} className="block text-sm font-medium mt-1 mb-1">
                Seleccionar tipo de entidad:
              </label>
              <select
                id={`entity-type-${index}`}
                value={mapping.selectedType}
                onChange={e => handleTypeChange(index, e.target.value as EntityType | '')}
                className="w-full p-2 border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-600 focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value="">-- Seleccionar --</option>
                {entityTypes.map(type => (
                  <option key={type} value={type}>
                    {ENTITY_DISPLAY_NAMES[type]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!allFilesMapped || fileMappings.length === 0}
            className="py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Procesar Seleccionados
          </button>
        </div>
      </div>
    </div>
  );
};
