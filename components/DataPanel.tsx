
import React, { useState } from 'react';
import { Database, EntityType, GroupedResult, ALL_ENTITY_TYPES } from '../types';
import { ENTITY_DISPLAY_NAMES } from '../constants';
import { EntityDisplay } from './EntityDisplay';
import { DataTable } from './DataTable'; 

interface DataPanelProps {
  database: Database;
  groupedResults: GroupedResult[] | null;
}

export const DataPanel: React.FC<DataPanelProps> = ({ database, groupedResults }) => {
  const [expandedEntity, setExpandedEntity] = useState<EntityType | null>(null);

  const toggleEntityExpansion = (entityType: EntityType) => {
    setExpandedEntity(prev => (prev === entityType ? null : entityType));
  };

  return (
    <div className="w-full md:w-1/3 bg-gray-100 dark:bg-gray-800 p-4 overflow-y-auto border-l border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 bg-transition">
      <h2 className="text-lg font-semibold mb-4 text-green-600 dark:text-green-400 border-b border-gray-300 dark:border-gray-600 pb-2">
        Datos del Campo
      </h2>
      
      {groupedResults && groupedResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-2 text-yellow-600 dark:text-yellow-400">Resultados de la Consulta:</h3>
          {groupedResults.map((group, index) => {
            const isListResult = group.groupTitle.toLowerCase().startsWith("listado:") && group.items.length > 0;
            const displayCount = group.count !== undefined ? group.count : group.items.length;

            return (
              <div key={index} className="mb-4 p-3 bg-gray-200 dark:bg-gray-700 rounded-lg shadow">
                <h4 className="text-sm font-medium text-yellow-500 dark:text-yellow-300 mb-1">
                  {group.groupTitle} ({displayCount} elemento{displayCount === 1 ? '' : 's'})
                </h4>
                {isListResult ? (
                  <DataTable items={group.items} />
                ) : group.items.length > 0 ? (
                  <EntityDisplay items={group.items} defaultExpanded={true} />
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No hay elementos para mostrar en este grupo.</p>
                )}
              </div>
            );
          })}
           <hr className="my-4 border-gray-300 dark:border-gray-600"/>
        </div>
      )}

      <div className="space-y-3">
        {ALL_ENTITY_TYPES.map((entityType) => {
          const items = database[entityType] as any[];
          const displayName = ENTITY_DISPLAY_NAMES[entityType];
          return (
            <div key={entityType} className="bg-gray-200 dark:bg-gray-700 rounded-lg shadow">
              <button
                onClick={() => toggleEntityExpansion(entityType)}
                className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors rounded-t-lg"
                aria-expanded={expandedEntity === entityType}
                aria-controls={`entity-details-${entityType}`}
              >
                <span className="font-medium text-gray-700 dark:text-gray-100">{displayName} ({items.length})</span>
                <span className={`transform transition-transform text-gray-600 dark:text-gray-400 ${expandedEntity === entityType ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true">
                  ▼
                </span>
              </button>
              {expandedEntity === entityType && (
                <div id={`entity-details-${entityType}`} className="p-3 border-t border-gray-300 dark:border-gray-600">
                  {items.length > 0 ? (
                    <EntityDisplay items={items} />
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No hay datos para {displayName}.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
