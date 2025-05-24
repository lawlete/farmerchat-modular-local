
import React, { useState } from 'react';

interface EntityDisplayProps {
  items: Record<string, any>[];
  defaultExpanded?: boolean;
}

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

  const preferredOrder = ['id', 'name', 'description', 'taskName', 'type', 'status', 'date'];
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
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {item.name || item.taskName || item.description?.substring(0,30) || item.id || `Elemento ${index + 1}`}
            </span>
            <span className={`transform transition-transform text-gray-600 dark:text-gray-400 ${expandedItems[index] ? 'rotate-180' : 'rotate-0'}`}>
              ▼
            </span>
          </button>
          {expandedItems[index] && (
            <div id={`details-${item.id || index}`} className="mt-1 pt-1 border-t border-gray-300 dark:border-gray-500">
              {sortedKeys.map(key => {
                if (item[key] === undefined || item[key] === null) return null;
                let value = item[key];
                if (typeof value === 'object') {
                  value = JSON.stringify(value, null, 2);
                   return (
                    <div key={key} className="grid grid-cols-3 gap-1 py-0.5">
                      <strong className="col-span-1 text-gray-600 dark:text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</strong>
                      <pre className="col-span-2 text-gray-700 dark:text-gray-100 bg-gray-100 dark:bg-gray-500 p-1 rounded text-xs overflow-x-auto">{value}</pre>
                    </div>
                  );
                }
                return (
                  <div key={key} className="grid grid-cols-3 gap-1 py-0.5">
                    <strong className="col-span-1 text-gray-600 dark:text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</strong>
                    <span className="col-span-2 text-gray-700 dark:text-gray-100 break-all">{String(value)}</span>
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
