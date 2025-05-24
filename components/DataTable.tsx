
import React from 'react';

interface DataTableProps {
  items: Record<string, any>[];
}

export const DataTable: React.FC<DataTableProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 italic p-2">No hay datos para mostrar en la tabla.</p>;
  }

  const allKeys = items.reduce<string[]>((acc, item) => {
    Object.keys(item).forEach(key => {
      if (!acc.includes(key)) {
        acc.push(key);
      }
    });
    return acc;
  }, []);

  const preferredOrder = ['id', 'name', 'description', 'taskName', 'type', 'status', 'date', 'crop', 'area', 'location', 'clientId', 'fieldId', 'lotId'];
  const sortedKeys = [...new Set([...preferredOrder.filter(k => allKeys.includes(k)), ...allKeys])];

  const formatHeader = (key: string): string => {
    let result = key.replace(/([A-Z])/g, ' $1');
    result = result.charAt(0).toUpperCase() + result.slice(1);
    return result;
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value); 
    }
    if (value === null || value === undefined) {
      return '-';
    }
    return String(value);
  };

  return (
    <div className="overflow-x-auto bg-gray-200 dark:bg-gray-650 rounded-md shadow">
      <table className="min-w-full text-xs text-left text-gray-700 dark:text-gray-300">
        <thead className="bg-gray-300 dark:bg-gray-700 sticky top-0">
          <tr>
            {sortedKeys.map(key => (
              <th key={key} scope="col" className="px-3 py-2 font-medium tracking-wider capitalize">
                {formatHeader(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-gray-100 dark:bg-gray-600 divide-y divide-gray-300 dark:divide-gray-500">
          {items.map((item, index) => (
            <tr key={item.id || index} className="hover:bg-gray-200 dark:hover:bg-gray-550 transition-colors">
              {sortedKeys.map(key => (
                <td key={`${item.id || index}-${key}`} className="px-3 py-2 whitespace-nowrap">
                  {formatValue(item[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
