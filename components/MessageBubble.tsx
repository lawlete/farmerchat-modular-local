
import React, { useRef } from 'react';
import { ChatMessage, GroupedResult } from '../types';
import { UserIcon, AiIcon, SystemIcon, ErrorIcon, LoadingIcon } from './icons/ChatIcons';
import { ExpandIcon } from './icons/ModalControlIcons';
import { PrintIcon, CsvDownloadIcon } from './icons/ActionIcons';
import { triggerCsvDownload } from '../services/dbService';
import { FullScreenDataModalContent } from './FullScreenDataViewModal';
import { FIELD_DISPLAY_NAMES_ES } from '../constants'; // Import the new mapping
import { MarkdownRenderer } from './MarkdownRenderer'; // Import the new MarkdownRenderer

interface MessageBubbleProps {
  message: ChatMessage;
  onViewFullScreen: (content: FullScreenDataModalContent) => void;
}

const formatValueForBubble = (value: any): string => {
  if (value === null || value === undefined || String(value).toUpperCase() === 'NULL') {
    return 'Sin Datos';
  }
  return String(value);
};

const renderItemDetails = (item: Record<string, any>): string => {
  const details: string[] = [];
  
  // Prioritize descriptive fields
  if (item.name) details.push(`${FIELD_DISPLAY_NAMES_ES['name'] || 'Nombre'}: ${formatValueForBubble(item.name)}`);
  else if (item.taskName) details.push(`${FIELD_DISPLAY_NAMES_ES['taskName'] || 'Tarea'}: ${formatValueForBubble(item.taskName)}`);
  else if (item.description) {
    const desc = formatValueForBubble(item.description);
    details.push(`${FIELD_DISPLAY_NAMES_ES['description'] || 'Desc'}: ${desc.substring(0,50)}${desc.length > 50 ? '...' : ''}`);
  }

  // Add ID if no primary descriptor was found, or if it's a very simple object
  if (item.id && (details.length === 0 || Object.keys(item).length <= 2)) {
    // Avoid adding ID if name/taskName is already present unless it's the only other field.
    if (!details.some(d => d.toLowerCase().includes('nombre:') || d.toLowerCase().includes('tarea:'))) {
       details.push(`${FIELD_DISPLAY_NAMES_ES['id'] || 'ID'}: ${formatValueForBubble(item.id)}`);
    }
  }
  
  const commonFieldsToShow: (keyof typeof FIELD_DISPLAY_NAMES_ES)[] = ['type', 'status', 'crop', 'area', 'availability', 'role'];
  commonFieldsToShow.forEach(key => {
    if (item[key] !== undefined && item[key] !== null && !details.some(d => d.toLowerCase().startsWith((FIELD_DISPLAY_NAMES_ES[key] || key).toLowerCase() + ':'))) {
      details.push(`${FIELD_DISPLAY_NAMES_ES[key] || key}: ${formatValueForBubble(item[key])}`);
    }
  });


  if (details.length === 0) { // Fallback if no specific fields were matched
    return Object.entries(item)
      .filter(([key, value]) => key !== 'id' && value !== null && value !== undefined && String(value).toUpperCase() !== 'NULL')
      .slice(0, 2) 
      .map(([key, value]) => `${FIELD_DISPLAY_NAMES_ES[key] || key}: ${formatValueForBubble(value)}`)
      .join(' | ') || `${FIELD_DISPLAY_NAMES_ES['id'] || 'ID'}: ${formatValueForBubble(item.id) || 'N/A'}`;
  }
  
  return details.slice(0, 3).join(' | '); // Show up to 3 details for brevity
};


export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onViewFullScreen }) => {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const isAi = message.sender === 'ai';

  const groupContentRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());


  const bubbleClasses = isUser
    ? 'bg-green-600 text-white self-end rounded-l-xl rounded-tr-xl'
    : isSystem 
    ? 'bg-gray-500 dark:bg-gray-600 text-gray-100 dark:text-gray-300 self-center text-xs italic px-3 py-1 rounded-full'
    : 'bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 self-start rounded-r-xl rounded-tl-xl'; 

  const Icon = isUser ? UserIcon : isAi ? AiIcon : SystemIcon;
  const iconBgColor = isUser 
    ? 'bg-green-500' 
    : isAi 
    ? 'bg-blue-500' 
    : '';

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

  const getPrintableHTMLForGroup = (targetElement: HTMLElement, title: string): string => {
    let contentHTML = '';
    const titleElement = targetElement.querySelector('h4');
    const listElement = targetElement.querySelector('ul');
    
    if (titleElement) {
      contentHTML += `<h4>${titleElement.innerText}</h4>`;
    }

    if (listElement) {
      const clonedList = listElement.cloneNode(true) as HTMLElement;
      clonedList.querySelectorAll('.no-print-in-section, button, [aria-hidden="true"]').forEach(el => el.remove());
      clonedList.querySelectorAll('li').forEach(li => {
        const textContent = li.innerText || li.textContent || "";
        li.innerHTML = textContent.trim().replace(/\n\s*\n/g, '\n'); // Clean up extra newlines
      });
      contentHTML += clonedList.outerHTML;
    } else {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = targetElement.innerHTML;
      tempDiv.querySelectorAll('.no-print-in-section, button, [aria-hidden="true"], h4').forEach(el => el.remove()); 
      contentHTML += tempDiv.innerHTML.trim();
    }

    const styles = `
      <style>
        body { font-family: 'Inter', sans-serif; margin: 20px; color: #333; }
        h1.print-page-title { font-size: 16pt; text-align: center; margin-bottom: 15px; color: black !important; }
        h4 { font-size: 11pt; margin-bottom: 8px; color: black !important; font-weight: bold; }
        ul { list-style-type: none; padding-left: 0; margin-top: 5px; font-size: 9pt; }
        li { margin-bottom: 6px; padding: 4px; border: 1px solid #eee; border-radius: 3px; color: black !important; page-break-inside: avoid; background-color: #f9f9f9; }
        .no-print-in-section { display: none !important; }
        .dark\\:bg-gray-800, .dark\\:bg-gray-700, .dark\\:bg-gray-600, .dark\\:bg-gray-500 { background-color: white !important; }
        .dark\\:text-gray-100, .dark\\:text-gray-200, .dark\\:text-gray-300, .dark\\:text-gray-400, .dark\\:text-yellow-300, .dark\\:text-yellow-600 { color: black !important; }
        .dark\\:border-gray-500, .dark\\:border-gray-400 { border-color: #ccc !important; }
        .dark\\:bg-gray-100 { background-color: #f0f0f0 !important; } /* For li items in dark mode */

        /* Markdown specific print styles */
        .markdown-content h1, .markdown-content h2, .markdown-content h3 { color: black !important; margin-top: 0.5em; margin-bottom: 0.25em; }
        .markdown-content h1 { font-size: 14pt; }
        .markdown-content h2 { font-size: 12pt; }
        .markdown-content h3 { font-size: 10pt; }
        .markdown-content p { margin-bottom: 0.5em; font-size: 9pt; line-height: 1.4; color: black !important;}
        .markdown-content ul, .markdown-content ol { margin-left: 20px; margin-bottom: 0.5em; font-size: 9pt; color: black !important;}
        .markdown-content li { margin-bottom: 0.2em; border: none; background-color: transparent; padding: 0; color: black !important;}
        .markdown-content code { font-family: monospace; background-color: #f0f0f0; padding: 1px 3px; border-radius: 3px; font-size: 8.5pt; color: black !important;}
        .markdown-content pre { background-color: #f0f0f0; padding: 0.5em; border-radius: 3px; overflow-x: auto; font-size: 8.5pt; color: black !important; page-break-inside: avoid; }
        .markdown-content pre code { background-color: transparent; padding: 0; }
        .markdown-content strong { font-weight: bold; color: black !important;}
        .markdown-content em { font-style: italic; color: black !important;}
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
          <div class="markdown-content">
             ${contentHTML}
          </div>
        </body>
      </html>
    `;
  };

  const handlePrintGroup = (groupIndex: number, pageTitle: string) => {
    const groupContentElement = groupContentRefs.current.get(groupIndex);
    if (!groupContentElement) {
      console.error("Content element for printing not found for group index:", groupIndex);
      alert("No se pudo encontrar el contenido para imprimir.");
      return;
    }

    const printContentHTML = getPrintableHTMLForGroup(groupContentElement, pageTitle);
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
    printFrame.style.zIndex = '99999'; 
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
                console.warn("iframe onload fallback: Removing print frame for", pageTitle);
                document.body.removeChild(printFrame);
            }
        }, 3000);

        printFrame.onload = () => {
            if (cleanupTimeoutId) clearTimeout(cleanupTimeoutId);
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
                    }, 100); 
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
        if (cleanupTimeoutId) clearTimeout(cleanupTimeoutId);
        if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
        }
    }
  };


  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
      <div className={`flex items-start max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isSystem && (
          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white ${iconBgColor} ${isUser ? 'ml-2' : 'mr-2'} no-print`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className={`p-3 shadow-md ${bubbleClasses} ${isSystem ? '' : 'min-w-[100px]'}`}>
          {message.isLoading && (
            <div className="flex items-center">
              <LoadingIcon className="h-5 w-5 animate-spin mr-2" />
              <span>Procesando...</span>
            </div>
          )}
          {!message.isLoading && message.isError && (
            <div className="flex items-center text-red-600 dark:text-red-300">
              <ErrorIcon className="h-5 w-5 mr-2" />
              <span>{message.text}</span>
            </div>
          )}
          {!message.isLoading && !message.isError && (
            <>
              {isAi && message.actionType === 'HELP' ? (
                <MarkdownRenderer markdownText={message.text} />
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
              )}
              {isAi && message.groupedData && message.groupedData.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-400 dark:border-gray-500 space-y-2">
                  {message.groupedData.map((group: GroupedResult, groupIndex: number) => (
                    <div 
                      key={groupIndex} 
                      className="p-2 bg-gray-200 dark:bg-gray-600 rounded-md"
                      ref={(el: HTMLDivElement | null) => {
                        if (el) {
                          groupContentRefs.current.set(groupIndex, el);
                        } else {
                          groupContentRefs.current.delete(groupIndex);
                        }
                      }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-semibold text-xs text-yellow-600 dark:text-yellow-300">
                          {group.groupTitle}
                          {typeof group.count === 'number' ? ` (${group.count} encontrado${group.count === 1 ? '' : 's'})` : ` (${group.items.length} encontrado${group.items.length === 1 ? '' : 's'})`}
                        </h4>
                        {group.items.length > 0 && (
                            <div className="flex space-x-1 no-print-in-section">
                                <button
                                    onClick={() => handleDownloadCsv(group)}
                                    title="Descargar CSV"
                                    className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs"
                                    aria-label="Descargar lista como CSV"
                                >
                                    <CsvDownloadIcon className="h-3 w-3" />
                                </button>
                                <button
                                    onClick={() => handleViewFullScreen(group)}
                                    title="Ver en Pantalla Completa"
                                    className="p-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full text-xs"
                                    aria-label="Ver lista en pantalla completa"
                                >
                                    <ExpandIcon className="h-3 w-3" />
                                </button>
                                <button
                                    onClick={() => handlePrintGroup(groupIndex, `Impresión: ${group.groupTitle}`)}
                                    title="Imprimir Lista"
                                    className="p-1 bg-gray-500 hover:bg-gray-600 text-white rounded-full text-xs"
                                    aria-label="Imprimir lista"
                                >
                                    <PrintIcon className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                      </div>
                      {group.items.length > 0 ? (
                        <ul className="list-none space-y-1 text-xs max-h-40 overflow-y-auto">
                          {group.items.slice(0, 5).map((item: Record<string, any>, itemIndex: number) => ( 
                            <li key={item.id || itemIndex} className="p-1.5 bg-gray-100 dark:bg-gray-500 rounded text-gray-700 dark:text-gray-100">
                              {renderItemDetails(item)}
                            </li>
                          ))}
                          {group.items.length > 5 && (
                             <li className="p-1.5 text-center text-gray-500 dark:text-gray-400 italic">
                                ...y {group.items.length - 5} más (ver en pantalla completa).
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-xs italic text-gray-500 dark:text-gray-400">No hay elementos en este grupo.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
           {message.rawLLMResponse && isAi && (
            <details className="mt-2 text-xs no-print">
              <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">Ver respuesta LLM completa</summary>
              <pre className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300 text-xs overflow-x-auto max-h-60">
                {message.rawLLMResponse}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};
