
import React, { useState } from 'react';
import { FIELD_DISPLAY_NAMES_ES } from '../constants'; // Import the new mapping

interface EntityDisplayProps {
  items: Record<string, any>[];
  defaultExpanded?: boolean;
}

const formatValueForEntityDisplay = (value: any): string => {
  if (value === null || value === undefined || String(value).toUpperCase() === 'NULL') {
    return 'Sin Datos';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2); // Pretty print for objects
  }
  return String(value);
};


export const EntityDisplay: React.FC<EntityDisplayProps> = ({ items, defaultExpanded = false }) => {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(() => {
    if (defaultExpanded) {
      return items.reduce((acc, _, index) => ({ ...acc, [index]: true }), {});
    }
    return {};
  });

  if (!items || items.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 italic">No hay elementos para mostrar.</p>;
  }

  const toggleItemExpansion = (index: number) => {
    setExpandedItems(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const allKeys = items.reduce<string[]>((acc, item) => {
    Object.keys(item).forEach(key => {
      if (!acc.includes(key)) {
        acc.push(key);
      }
    });
    return acc;
  }, []);

  // More comprehensive preferred order for EntityDisplay
  const preferredOrder = [
    'name', 'taskName', 'description', 'id', 'type', 'status', 'category', 'unit', 'role', 'availability',
    'crop', 'area', 'location', 'model', 'year', 
    'startDate', 'endDate', 'startDateTime', 'endDateTime', 'durationHours',
    'contactPerson', 'phone', 'email', 'address', 'isInternal',
    'clientId', 'contractorId', 'fieldId', 'lotId', 'parcelId', 'campaignId', 
    'tasksListId', 'createdByUserId', 'taskId', 'machineryId', 'personnelId', 'productInsumeId', 'userId',
    'costEstimated', 'costActual', 'resultDescription', 'notes', 'creationTimestamp', 'additionalInfo',
    'machineryIds', 'personnelIds', 'productInsumeDetails', 'quantityUsed', 'unitUsed',
    'hoursUsed', 'hoursWorked', 'roleInTask', 'applicationDetails', 'accessTotal'
  ];
  const sortedKeys = [...new Set([...preferredOrder.filter(k => allKeys.includes(k)), ...allKeys])];


  return (
    <div className="space-y-2 text-xs">
      {items.map((item, index) => (
        <div key={item.id || index} className="bg-gray-200 dark:bg-gray-600 p-2 rounded shadow">
          <button
            onClick={() => toggleItemExpansion(index)}
            className="w-full text-left flex justify-between items-center hover:bg-gray-300 dark:hover:bg-gray-500 p-1 rounded"
            aria-expanded={expandedItems[index]}
            aria-controls={`details-${item.id || index}`}
          >
            <span className="font-medium text-gray-800 dark:text-gray-100 truncate pr-2">
              {item.name || item.taskName || formatValueForEntityDisplay(item.description)?.substring(0,40) || item.id || `Elemento ${index + 1}`}
            </span>
            <span className={`transform transition-transform text-gray-600 dark:text-gray-400 ${expandedItems[index] ? 'rotate-180' : 'rotate-0'}`}>
              ▼
            </span>
          </button>
          {expandedItems[index] && (
            <div id={`details-${item.id || index}`} className="mt-1 pt-1 border-t border-gray-300 dark:border-gray-500">
              {sortedKeys.map(key => {
                const rawValue = item[key];
                // Skip rendering if value is undefined (null or "NULL" will be handled by formatValueForEntityDisplay)
                if (rawValue === undefined) return null; 
                
                const displayValue = formatValueForEntityDisplay(rawValue);
                const displayKey = FIELD_DISPLAY_NAMES_ES[key] || key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');

                if (typeof rawValue === 'object' && rawValue !== null && displayValue !== 'Sin Datos') {
                   return (
                    <div key={key} className="grid grid-cols-3 gap-1 py-0.5">
                      <strong className="col-span-1 text-gray-600 dark:text-gray-300 capitalize">{displayKey}:</strong>
                      <pre className="col-span-2 text-gray-700 dark:text-gray-100 bg-gray-100 dark:bg-gray-500 p-1 rounded text-xs overflow-x-auto">{displayValue}</pre>
                    </div>
                  );
                }
                return (
                  <div key={key} className="grid grid-cols-3 gap-1 py-0.5">
                    <strong className="col-span-1 text-gray-600 dark:text-gray-300 capitalize">{displayKey}:</strong>
                    <span className="col-span-2 text-gray-700 dark:text-gray-100 break-words">{displayValue}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
