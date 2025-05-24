
import React from 'react';
import { ChatMessage, GroupedResult } from '../types';
import { UserIcon, AiIcon, SystemIcon, ErrorIcon, LoadingIcon } from './icons/ChatIcons';

interface MessageBubbleProps {
  message: ChatMessage;
}

const renderItemDetails = (item: Record<string, any>): string => {
  const details: string[] = [];
  if (item.name) details.push(`Nombre: ${item.name}`);
  else if (item.taskName) details.push(`Tarea: ${item.taskName}`);
  else if (item.description) details.push(`Desc: ${item.description?.substring(0,50)}${item.description && item.description.length > 50 ? '...' : ''}`);
  
  if (item.id && details.length === 0) details.push(`ID: ${item.id}`); 

  if (item.crop && !details.some(d => d.toLowerCase().includes('cultivo'))) details.push(`Cultivo: ${item.crop}`);
  if (item.area && !details.some(d => d.toLowerCase().includes('área'))) details.push(`Área: ${item.area}`);
  if (item.status && !details.some(d => d.toLowerCase().includes('estado'))) details.push(`Estado: ${item.status}`);
  if (item.date && !details.some(d => d.toLowerCase().includes('fecha'))) details.push(`Fecha: ${item.date}`);
  
  if (details.length === 0) {
    return Object.entries(item)
      .filter(([key]) => key !== 'id') 
      .slice(0, 2) 
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(', ') || `ID: ${item.id || 'N/A'}`;
  }
  return details.join(' | '); 
};


export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const isAi = message.sender === 'ai';

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
    : ''; // System messages don't have a separate icon background

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
      <div className={`flex items-start max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isSystem && (
          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white ${iconBgColor} ${isUser ? 'ml-2' : 'mr-2'}`}>
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
              <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
              {isAi && message.groupedData && message.groupedData.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-400 dark:border-gray-500 space-y-2">
                  {message.groupedData.map((group: GroupedResult, groupIndex: number) => (
                    <div key={groupIndex} className="p-2 bg-gray-200 dark:bg-gray-600 rounded-md">
                      <h4 className="font-semibold text-xs text-yellow-600 dark:text-yellow-300 mb-1">
                        {group.groupTitle}
                        {typeof group.count === 'number' ? ` (${group.count} encontrado${group.count === 1 ? '' : 's'})` : ` (${group.items.length} encontrado${group.items.length === 1 ? '' : 's'})`}
                      </h4>
                      {group.items.length > 0 ? (
                        <ul className="list-none space-y-1 text-xs">
                          {group.items.map((item: Record<string, any>, itemIndex: number) => (
                            <li key={item.id || itemIndex} className="p-1.5 bg-gray-100 dark:bg-gray-500 rounded text-gray-700 dark:text-gray-100">
                              {renderItemDetails(item)}
                            </li>
                          ))}
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
            <details className="mt-2 text-xs">
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
