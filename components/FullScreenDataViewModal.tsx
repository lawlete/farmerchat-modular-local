
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DataTable } from './DataTable';
import { EntityType } from '../types'; 
import { triggerCsvDownload } from '../services/dbService'; 
import { CSV_HEADERS, FIELD_DISPLAY_NAMES_ES } from '../constants';
import { MinimizeIcon, ZoomInIcon, ZoomOutIcon, SearchIcon } from './icons/ModalControlIcons';
import { PrintIcon, CsvDownloadIcon, PdfFileIcon } from './icons/ActionIcons'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Import autoTable directly

// Utility functions for data table display and filtering
export const formatDisplayValue = (value: any): string => {
  if (value === null || value === undefined || String(value).toUpperCase() === 'NULL') {
    return 'Sin Datos';
  }
  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2); // Pretty print JSON objects
  }
  return String(value);
};

export const getColumnOrderForDisplay = (allItems: Record<string, any>[]): string[] => {
    if (!allItems || allItems.length === 0) return [];
    
    const allKeys = allItems.reduce<string[]>((acc, item) => {
      Object.keys(item).forEach(key => {
        if (!acc.includes(key)) acc.push(key);
      });
      return acc;
    }, []);

    // Prioritize descriptive fields, then IDs if they are primary, then other fields.
    const preferredOrder = [
      'name', 'taskName', 'description', 'type', 'status', 'role', 'availability', 
      'crop', 'area', 'location', 'model', 'year', 'category', 'unit',
      'startDate', 'endDate', 'startDateTime', 'endDateTime',
      'contactPerson', 'phone', 'email',
      // IDs are important but should come after primary descriptive fields if those exist
      'id', 
      // Foreign Keys might be less relevant in a general list if names are shown
      'clientId', 'contractorId', 'fieldId', 'lotId', 'parcelId', 'campaignId', 
      'tasksListId', 'createdByUserId', 'taskId', 'machineryId', 'personnelId', 'productInsumeId', 'userId'
    ];
    
    const orderedKeys = [...new Set([...preferredOrder.filter(k => allKeys.includes(k)), ...allKeys])];
    
    // Special case: if 'id' is the only key or one of very few, ensure it's prominent.
    if (orderedKeys.length <= 2 && orderedKeys.includes('id') && orderedKeys[0] !== 'id') {
        const idIndex = orderedKeys.indexOf('id');
        if (idIndex > 0) {
            const idVal = orderedKeys.splice(idIndex, 1)[0];
            orderedKeys.unshift(idVal);
        }
    } else if (orderedKeys.length > 2 && orderedKeys[0] === 'id' && (orderedKeys.includes('name') || orderedKeys.includes('taskName'))) {
        // If 'id' is first but 'name' or 'taskName' exists, move 'id' after them or to a less prominent position.
        // For simplicity, we'll just ensure 'name' or 'taskName' comes before 'id' if both exist.
        const idIndex = orderedKeys.indexOf('id');
        const nameIndex = orderedKeys.indexOf('name');
        const taskNameIndex = orderedKeys.indexOf('taskName');

        if (nameIndex !== -1 && idIndex > nameIndex) { /* name is already before id */ }
        else if (taskNameIndex !== -1 && idIndex > taskNameIndex) { /* taskName is already before id */ }
        else if (idIndex !== -1) { // id exists
            const idVal = orderedKeys.splice(idIndex, 1)[0];
            let insertPos = 0;
            if (nameIndex !== -1) insertPos = nameIndex + 1;
            else if (taskNameIndex !== -1) insertPos = taskNameIndex + 1;
            else insertPos = 1; // after the first element if no name/taskName
            orderedKeys.splice(Math.min(insertPos, orderedKeys.length), 0, idVal);
        }
    }
    return orderedKeys;
};

export const formatHeaderForDisplay = (key: string): string => {
    if (FIELD_DISPLAY_NAMES_ES[key]) {
      return FIELD_DISPLAY_NAMES_ES[key];
    }
    let result = key.replace(/([A-Z])/g, ' $1'); 
    result = result.replace(/_/g, ' '); 
    result = result.charAt(0).toUpperCase() + result.slice(1); 
    return result;
};


export interface FullScreenDataModalContent {
    title: string;
    items: Record<string, any>[];
    entityType?: EntityType;
}

interface FullScreenDataViewModalProps extends FullScreenDataModalContent {
  isOpen: boolean;
  onClose: () => void;
  entityTypeForHeaders?: EntityType; 
}

export const FullScreenDataViewModal: React.FC<FullScreenDataViewModalProps> = ({
  isOpen,
  onClose,
  title,
  items,
  entityTypeForHeaders,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1); 
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setZoomLevel(1);
    }
  }, [isOpen, items, title]);

  const columnKeysForTable = useMemo(() => getColumnOrderForDisplay(items), [items]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return items.filter(item =>
      columnKeysForTable.some(key => {
        const rawValue = item[key];
        const displayedValue = formatDisplayValue(rawValue); 
        return String(displayedValue).toLowerCase().includes(lowerSearchTerm);
      })
    );
  }, [items, searchTerm, columnKeysForTable]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2)); 
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5)); 

  const handleDownloadCsvInternal = () => {
    triggerCsvDownload(filteredItems, title, entityTypeForHeaders);
  };
  
  const getPrintableHTMLForTable = (targetElement: HTMLElement, pageTitle: string): string => {
    const tableClone = targetElement.querySelector('table')?.cloneNode(true) as HTMLTableElement | undefined;
    if (!tableClone) return `<html><body><h1>${pageTitle}</h1><p>No se pudo encontrar la tabla para imprimir.</p></body></html>`;
    
    tableClone.querySelectorAll('.no-print, .no-print-in-section').forEach(el => el.remove());

    const styles = `
      <style>
        body { font-family: 'Inter', sans-serif; margin: 20px; }
        h1.print-page-title { font-size: 16pt; text-align: center; margin-bottom: 15px; color: black !important; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th, td { border: 1px solid #888; padding: 5px 8px; text-align: left; font-size: 9pt; word-break: break-word; color: black !important; page-break-inside: avoid; }
        th { background-color: #eee; font-weight: bold; }
        .no-print, .no-print-in-section { display: none !important; }
        .dark\\:bg-gray-800, .dark\\:bg-gray-700, .dark\\:bg-gray-600, .dark\\:bg-gray-500, .dark\\:bg-gray-650, .dark\\:bg-gray-100 { background-color: white !important; }
        .dark\\:text-gray-100, .dark\\:text-gray-200, .dark\\:text-gray-300, .dark\\:text-gray-400 { color: black !important; }
        .dark\\:divide-gray-500, .dark\\:divide-gray-300 { border-color: #ccc !important; }
        .dark\\:hover\\:bg-gray-550:hover, .dark\\:hover\\:bg-gray-200:hover { background-color: #f0f0f0 !important; }
        /* Sticky header removal for print */
        thead { position: static !important; }
      </style>
    `;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${pageTitle}</title>
          ${styles}
        </head>
        <body>
          <h1 class="print-page-title">${pageTitle}</h1>
          ${tableClone.outerHTML}
        </body>
      </html>
    `;
  };

  const handleSystemPrint = () => {
    if (!tableContainerRef.current) {
      alert("No se pudo encontrar el contenido para imprimir.");
      return;
    }
    const printContentHTML = getPrintableHTMLForTable(tableContainerRef.current, title);
     if (!printContentHTML || printContentHTML.includes("<body></body>")) {
        console.error("Generated printable HTML is empty or malformed for:", title);
        alert("No se pudo generar el contenido para la impresión. Intente de nuevo.");
        return;
    }
    
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.setAttribute('title', 'Contenido de Impresión');
    printFrame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(printFrame);

    let cleanupTimeoutId: number | null = null; 

    try {
        const frameDoc = printFrame.contentWindow?.document;
        if (!frameDoc) {
            throw new Error("Could not access iframe document.");
        }

        frameDoc.open();
        frameDoc.write(printContentHTML);
        frameDoc.close();

        cleanupTimeoutId = window.setTimeout(() => { 
            if (document.body.contains(printFrame)) {
                console.warn("iframe onload fallback: Removing print frame for", title);
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
                            console.error(`Error during print() call for ${title}:`, innerPrintError);
                            alert(`Ocurrió un error al invocar la impresión: ${(innerPrintError as Error).message}`);
                        } finally {
                            setTimeout(() => {
                                if (document.body.contains(printFrame)) {
                                    document.body.removeChild(printFrame);
                                }
                            }, 1000);
                        }
                    }, 100); 
                } else {
                     throw new Error("iframe contentWindow is not available after load.");
                }
            } catch (printError) {
                console.error(`Error during print operation for ${title}:`, printError);
                alert(`Ocurrió un error al intentar imprimir: ${(printError as Error).message}`);
                setTimeout(() => {
                    if (document.body.contains(printFrame)) {
                        document.body.removeChild(printFrame);
                    }
                }, 500);
            }
        };
    } catch (setupError) {
        console.error(`Error setting up iframe for print (${title}):`, setupError);
        alert(`Error al preparar la impresión: ${(setupError as Error).message}`);
        if(cleanupTimeoutId) clearTimeout(cleanupTimeoutId);
        if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
        }
    }
  };


  const handleDownloadPdf = () => {
    if (!filteredItems || filteredItems.length === 0) {
      alert("No hay datos para exportar a PDF.");
      return;
    }
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      
      let headRows: string[][];
      let bodyRows: any[][];
      
      let pdfDataKeys: string[];
      let pdfDisplayHeaders: string[];

      if (entityTypeForHeaders && CSV_HEADERS[entityTypeForHeaders]) {
        const csvHeaders = CSV_HEADERS[entityTypeForHeaders];
        pdfDisplayHeaders = csvHeaders.map(header => FIELD_DISPLAY_NAMES_ES[header.replace(/_([a-z0-9])/g, (g) => g[1].toUpperCase())] || formatHeaderForDisplay(header));
        pdfDataKeys = csvHeaders.map(csvHeader => {
           let objectKey = csvHeader.replace(/_([a-z0-9])/g, (g) => g[1].toUpperCase());
            if (entityTypeForHeaders === 'contractors' && csvHeader === 'contractor_id') objectKey = 'id';
            else if (entityTypeForHeaders === 'tasks' && csvHeader === 'task_entry_id') objectKey = 'id';
            return objectKey;
        });
      } else {
        pdfDataKeys = getColumnOrderForDisplay(filteredItems);
        pdfDisplayHeaders = pdfDataKeys.map(key => FIELD_DISPLAY_NAMES_ES[key] || formatHeaderForDisplay(key));
      }
      headRows = [pdfDisplayHeaders];

      bodyRows = filteredItems.map(item => {
        return pdfDataKeys.map(key => {
          const rawValue = item[key];
          if (rawValue === null || rawValue === undefined || String(rawValue).toUpperCase() === 'NULL') return 'Sin Datos';
          if (typeof rawValue === 'boolean') return rawValue ? 'Sí' : 'No';
          return String(rawValue);
        });
      });

      autoTable(doc, { // Use autoTable as a function
        head: headRows,
        body: bodyRows,
        startY: 20, 
        headStyles: { fillColor: [22, 160, 133] }, 
        alternateRowStyles: { fillColor: [240, 240, 240] },
        styles: { fontSize: 8, cellPadding: 1.5, minCellHeight: 5 }, 
        columnStyles: pdfDisplayHeaders.reduce((acc, _, i) => { 
            acc[i] = { cellWidth: 'wrap' };
            return acc;
        }, {} as any),
        tableWidth: 'auto', 
        margin: { top: 20, right: 10, bottom: 10, left: 10 },
        didDrawPage: (data: any) => {
          doc.setFontSize(14);
          doc.text(title, data.settings.margin.left, 15);
           doc.setFontSize(8);
           doc.text(`Página ${data.pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 5);
        }
      });
      
      const filename = `${title.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase()}_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(filename);

    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert(`Error al generar PDF: ${(error as Error).message}`);
    }
  };


  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-2 sm:p-4 md:p-6 no-print"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fullscreen-data-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full h-full max-w-full max-h-full flex flex-col text-gray-800 dark:text-gray-100">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-300 dark:border-gray-700 flex-shrink-0">
          <h2 id="fullscreen-data-title" className="text-base sm:text-lg font-semibold text-green-600 dark:text-green-400 truncate pr-2 flex-shrink min-w-0">
            {title} ({filteredItems.length} {filteredItems.length === 1 ? 'el.' : 'els.'})
          </h2>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md p-1 my-1">
                <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="px-2 py-1 text-xs sm:text-sm bg-transparent focus:outline-none w-20 xxs:w-24 xs:w-32 sm:w-auto"
                aria-label="Buscar en la tabla"
                />
                <SearchIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
            </div>
             <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline my-1">
              Zoom: {Math.round(zoomLevel * 100)}%
            </span>
            <button onClick={handleZoomOut} title="Alejar" className="p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 my-1" aria-label="Alejar zoom">
              <ZoomOutIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button onClick={handleZoomIn} title="Acercar" className="p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 my-1" aria-label="Acercar zoom">
              <ZoomInIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button onClick={handleSystemPrint} title="Imprimir Tabla" className="p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 my-1" aria-label="Imprimir tabla">
              <PrintIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button onClick={handleDownloadCsvInternal} title="Descargar CSV" className="p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 my-1" aria-label="Descargar CSV">
              <CsvDownloadIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button onClick={handleDownloadPdf} title="Descargar PDF" className="p-1.5 sm:p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 my-1" aria-label="Descargar PDF">
              <PdfFileIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button onClick={onClose} title="Cerrar Vista Completa" className="p-1.5 sm:p-2 rounded bg-red-500 hover:bg-red-600 text-white my-1" aria-label="Cerrar vista completa">
              <MinimizeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div ref={tableContainerRef} className="flex-grow p-1 sm:p-2 overflow-auto" style={{ fontSize: `${zoomLevel * 100}%` }}>
          {filteredItems.length > 0 ? (
            <DataTable 
                items={filteredItems} 
                columnOrder={columnKeysForTable}
                formatValueFunction={formatDisplayValue}
                formatHeaderFunction={formatHeaderForDisplay}
            />
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 italic mt-10">
              {searchTerm ? 'No hay resultados para su búsqueda.' : 'No hay datos para mostrar.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
