
import React, { useState, useRef } from 'react';
import { Database, EntityType, GroupedResult, ALL_ENTITY_TYPES } from '../types';
import { ENTITY_DISPLAY_NAMES } from '../constants';
import { EntityDisplay } from './EntityDisplay';
import { DataTable } from './DataTable'; 
import { ExpandIcon } from './icons/ModalControlIcons';
import { PrintIcon, CsvDownloadIcon } from './icons/ActionIcons';
import { triggerCsvDownload } from '../services/dbService';
import { FullScreenDataModalContent, getColumnOrderForDisplay, formatDisplayValue, formatHeaderForDisplay } from './FullScreenDataViewModal';

interface DataPanelProps {
  database: Database;
  groupedResults: GroupedResult[] | null;
  onViewFullScreen: (content: FullScreenDataModalContent) => void;
}

export const DataPanel: React.FC<DataPanelProps> = ({ database, groupedResults, onViewFullScreen }) => {
  const [expandedEntity, setExpandedEntity] = useState<EntityType | null>(null);
  const groupContentRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  const toggleEntityExpansion = (entityType: EntityType) => {
    setExpandedEntity(prev => (prev === entityType ? null : entityType));
  };

  const handleDownloadCsv = (group: GroupedResult) => {
    triggerCsvDownload(group.items, group.groupTitle, group.entityType);
  };

  const handleViewFullScreen = (group: GroupedResult) => {
    onViewFullScreen({
        title: group.groupTitle,
        items: group.items,
        entityType: group.entityType
    });
  };

  const getPrintableHTMLForData = (targetElement: HTMLElement, title: string): string => {
    let contentHTML = '';
    const tableElement = targetElement.querySelector('table');
    const entityDisplayContainer = targetElement.querySelector('.space-y-2'); // Used by EntityDisplay

    if (tableElement) {
        const newTable = document.createElement('table');
        const thead = tableElement.querySelector('thead');
        const tbody = tableElement.querySelector('tbody');
        if (thead) newTable.appendChild(thead.cloneNode(true));
        if (tbody) newTable.appendChild(tbody.cloneNode(true));
        // Remove any no-print elements from the cloned table headers/cells if necessary
        newTable.querySelectorAll('.no-print, .no-print-in-section').forEach(el => el.remove());
        contentHTML = newTable.outerHTML;
    } else if (entityDisplayContainer && entityDisplayContainer.closest('.mb-4.p-3')) { // check if it's part of a grouped result
        // For EntityDisplay within a grouped result: Reconstruct a simplified list
        let listItemsHTML = '<ul>';
        const items = targetElement.querySelectorAll('.bg-gray-200.dark\\:bg-gray-600.p-2.rounded.shadow'); // Each item's div in EntityDisplay
        items.forEach(itemDiv => {
            const titleEl = itemDiv.querySelector('button > span.font-medium');
            let itemEntry = `<li><strong>${titleEl ? titleEl.textContent : 'Elemento'}</strong>: `;
            const detailsDiv = itemDiv.querySelector('div[id^="details-"]'); // Assumes details are expanded
            if (detailsDiv) {
                const detailEntries: string[] = [];
                detailsDiv.querySelectorAll('div.grid.grid-cols-3').forEach(detailRow => {
                    const keyEl = detailRow.querySelector('strong');
                    const valueEl = detailRow.querySelector('span.col-span-2, pre.col-span-2');
                    if (keyEl && valueEl) {
                        detailEntries.push(`${keyEl.textContent?.replace(':','').trim()} - ${valueEl.textContent?.trim()}`);
                    }
                });
                itemEntry += detailEntries.join('; ') || '(No hay detalles visibles)';
            } else {
                itemEntry += "(Detalles no expandidos en esta vista)";
            }
            itemEntry += '</li>';
            listItemsHTML += itemEntry;
        });
        listItemsHTML += '</ul>';
        contentHTML = listItemsHTML;
    } else {
        // Fallback for other structures (e.g. full entity type list if EntityDisplay is used there)
        // This part needs careful consideration if printing full entity lists from accordion is desired.
        // For now, focus on grouped results.
        const clone = targetElement.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.no-print, .no-print-in-section, button, [aria-hidden="true"]').forEach(el => el.remove());
        contentHTML = clone.innerHTML;
    }
    
    const styles = `
      <style>
        body { font-family: 'Inter', sans-serif; margin: 20px; color: #333; }
        h1.print-page-title { font-size: 16pt; text-align: center; margin-bottom: 15px; color: black !important; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th, td { border: 1px solid #888; padding: 5px 8px; text-align: left; font-size: 9pt; word-break: break-word; color: black !important; page-break-inside: avoid; }
        th { background-color: #eee; font-weight: bold; }
        ul { list-style-type: disc; padding-left: 20px; font-size: 9pt; }
        li { margin-bottom: 4px; color: black !important; page-break-inside: avoid; }
        strong { font-weight: bold; }
        .no-print, .no-print-in-section { display: none !important; }
        .dark\\:bg-gray-800, .dark\\:bg-gray-700, .dark\\:bg-gray-600, .dark\\:bg-gray-500, .dark\\:bg-gray-200 { background-color: white !important; }
        .dark\\:text-gray-100, .dark\\:text-gray-200, .dark\\:text-gray-300, .dark\\:text-gray-400, .dark\\:text-yellow-300, .dark\\:text-yellow-400, .dark\\:text-yellow-500, .dark\\:text-gray-700 { color: black !important; }
        .dark\\:border-gray-600, .dark\\:border-gray-500, .dark\\:border-gray-300 { border-color: #ccc !important; }
      </style>
    `;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          ${styles}
        </head>
        <body>
          <h1 class="print-page-title">${title}</h1>
          ${contentHTML}
        </body>
      </html>
    `;
  };

  const handlePrintData = (groupIndex: number, pageTitle: string) => {
    const contentElement = groupContentRefs.current.get(groupIndex);
     if (!contentElement) {
      console.error("Content element for printing not found for group index:", groupIndex);
      alert("No se pudo encontrar el contenido para imprimir.");
      return;
    }

    const printContentHTML = getPrintableHTMLForData(contentElement, pageTitle);
     if (!printContentHTML || printContentHTML.includes("<body></body>")) {
        console.error("Generated printable HTML is empty or malformed for:", pageTitle);
        alert("No se pudo generar el contenido para la impresión. Intente de nuevo.");
        return;
    }
    
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.zIndex = '99999'; // Ensure iframe is on top
    printFrame.setAttribute('title', 'Contenido de Impresión');
    printFrame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(printFrame);

    let cleanupTimeoutId: number | null = null; // Changed NodeJS.Timeout to number

    try {
        const frameDoc = printFrame.contentWindow?.document;
        if (!frameDoc) {
            throw new Error("Could not access iframe document.");
        }

        frameDoc.open();
        frameDoc.write(printContentHTML);
        frameDoc.close();

        cleanupTimeoutId = window.setTimeout(() => { // Explicitly use window.setTimeout
            if (document.body.contains(printFrame)) {
                console.warn("iframe onload fallback: Removing print frame for", pageTitle);
                document.body.removeChild(printFrame);
            }
        }, 3000);
        
        printFrame.onload = () => {
            if(cleanupTimeoutId) clearTimeout(cleanupTimeoutId);
            try {
                if (printFrame.contentWindow) {
                    printFrame.contentWindow.focus();
                    setTimeout(() => {
                        try {
                            printFrame.contentWindow?.print();
                        } catch (innerPrintError) {
                            console.error(`Error during print() call for ${pageTitle}:`, innerPrintError);
                            alert(`Ocurrió un error al invocar la impresión: ${(innerPrintError as Error).message}`);
                        } finally {
                            setTimeout(() => {
                                if (document.body.contains(printFrame)) {
                                    document.body.removeChild(printFrame);
                                }
                            }, 1000);
                        }
                    }, 100); // 100ms delay
                } else {
                     throw new Error("iframe contentWindow is not available after load.");
                }
            } catch (printError) {
                console.error(`Error during print operation for ${pageTitle}:`, printError);
                alert(`Ocurrió un error al intentar imprimir: ${(printError as Error).message}`);
                 setTimeout(() => {
                    if (document.body.contains(printFrame)) {
                        document.body.removeChild(printFrame);
                    }
                }, 500);
            }
        };
    } catch (setupError) {
       console.error(`Error setting up iframe for print (${pageTitle}):`, setupError);
       alert(`Error al preparar la impresión: ${(setupError as Error).message}`);
       if(cleanupTimeoutId) clearTimeout(cleanupTimeoutId);
       if (document.body.contains(printFrame)) {
           document.body.removeChild(printFrame);
       }
    }
  };


  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 p-4 overflow-y-auto border-l border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 bg-transition no-print">
      <h2 className="text-lg font-semibold mb-4 text-green-600 dark:text-green-400 border-b border-gray-300 dark:border-gray-600 pb-2">
        Datos del Campo
      </h2>
      
      {groupedResults && groupedResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-2 text-yellow-600 dark:text-yellow-400">Resultados de la Consulta:</h3>
          {groupedResults.map((group, index) => {
            const isListResult = group.items.length > 0 && (group.entityType || group.groupTitle.toLowerCase().startsWith("listado:")); // DataTable for explicit entity types or "Listado:"
            const displayCount = group.count !== undefined ? group.count : group.items.length;

            return (
              <div key={index} className="mb-4 p-3 bg-gray-200 dark:bg-gray-700 rounded-lg shadow">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-yellow-500 dark:text-yellow-300">
                    {group.groupTitle} ({displayCount} elemento{displayCount === 1 ? '' : 's'})
                    </h4>
                    {group.items.length > 0 && (
                         <div className="flex space-x-1 no-print-in-section">
                            <button
                                onClick={() => handleDownloadCsv(group)}
                                title="Descargar CSV"
                                className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-xs"
                                aria-label="Descargar resultados como CSV"
                            >
                                <CsvDownloadIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => handleViewFullScreen(group)}
                                title="Ver en Pantalla Completa"
                                className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-xs"
                                aria-label="Ver resultados en pantalla completa"
                            >
                                <ExpandIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => handlePrintData(index, `Impresión: ${group.groupTitle}`)}
                                title="Imprimir Resultados"
                                className="p-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-xs"
                                aria-label="Imprimir Resultados"
                            >
                                <PrintIcon className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>
                <div 
                   ref={(el: HTMLDivElement | null) => {
                     if (el) {
                       groupContentRefs.current.set(index, el);
                     } else {
                       groupContentRefs.current.delete(index);
                     }
                   }}
                >
                  {isListResult ? (
                    <DataTable 
                      items={group.items} 
                      columnOrder={getColumnOrderForDisplay(group.items)}
                      formatValueFunction={formatDisplayValue}
                      formatHeaderFunction={formatHeaderForDisplay}
                    />
                  ) : group.items.length > 0 ? (
                     // defaultExpanded=true helps EntityDisplay show its content for printing
                    <EntityDisplay items={group.items} defaultExpanded={true} />
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No hay elementos para mostrar en este grupo.</p>
                  )}
                </div>
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
                    // Note: Printing for these full entity lists via accordion is not implemented with a dedicated button here.
                    // The print buttons are for 'Resultados de la Consulta'.
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
