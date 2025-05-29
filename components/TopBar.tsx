
import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { EntityType } from '../types';
import { ENTITY_DISPLAY_NAMES } from '../constants';
import { 
    DownloadIcon, UploadIcon, FileCsvIcon, MultiFileIcon, ExportPackageIcon, 
    DeleteDatabaseIcon, SaveHistoryIcon, LoadHistoryIcon, OfflineQueueIcon 
} from './icons/FileIcons';
import { Theme } from '../App';
import { SunIcon, MoonIcon } from './icons/ThemeIcons';
import { VoiceOnIcon, VoiceOffIcon } from './icons/VoiceModeIcons';
import { DropdownMenu, DropdownMenuItem } from './DropdownMenu';
import { DatabaseIcon, TableCellsIcon, ChatHistoryIcon } from './icons/TopBarIcons';

export interface TopBarHandles {
  // Potentially expose methods if App needs to trigger something in TopBar
}

interface TopBarProps {
  onFileUpload: (file: File, type: 'json_db' | EntityType) => void;
  onFileExport: (type: 'json_db') => void;
  onExportToCsvs: () => void;
  entityTypes: EntityType[];
  currentTheme: Theme;
  onToggleTheme: () => void;
  isInteractiveVoiceMode: boolean;
  onToggleInteractiveVoiceMode: () => void;
  onMultipleFileUploadRequest: (files: File[]) => void;
  onDeleteDatabaseRequest: () => void;
  onSaveChatHistory: () => void;
  onLoadChatHistoryFile: (file: File) => void;
  pendingOfflineRequestCount: number;
}

export const TopBar = forwardRef<TopBarHandles, TopBarProps>((
  {
    onFileUpload,
    onFileExport,
    onExportToCsvs,
    entityTypes,
    currentTheme,
    onToggleTheme,
    isInteractiveVoiceMode,
    onToggleInteractiveVoiceMode,
    onMultipleFileUploadRequest,
    onDeleteDatabaseRequest,
    onSaveChatHistory,
    onLoadChatHistoryFile,
    pendingOfflineRequestCount
  },
  ref
) => {
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const multiCsvFileInputRef = useRef<HTMLInputElement>(null);
  const chatHistoryInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedCsvEntityType, setSelectedCsvEntityType] = useState<EntityType | null>(null);
  const [showCsvEntityTypeSelector, setShowCsvEntityTypeSelector] = useState(false);
  const tablesGroupButtonRef = useRef<HTMLButtonElement>(null); // Ref for positioning entity type selector

  useImperativeHandle(ref, () => ({
    // Define methods to be called from parent if needed
  }));

  // Close entity type selector if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showCsvEntityTypeSelector && tablesGroupButtonRef.current && !tablesGroupButtonRef.current.contains(event.target as Node)) {
        // Check if click is outside the selector itself as well
        const selectorElement = document.getElementById('csv-entity-type-selector-dropdown');
        if (selectorElement && !selectorElement.contains(event.target as Node)) {
          setShowCsvEntityTypeSelector(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCsvEntityTypeSelector]);


  const handleJsonImportClick = () => jsonFileInputRef.current?.click();
  const handleMultiCsvImportClick = () => multiCsvFileInputRef.current?.click();
  const handleLoadHistoryClick = () => chatHistoryInputRef.current?.click();

  const handleJsonFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFileUpload(file, 'json_db');
    event.target.value = '';
  };

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedCsvEntityType) onFileUpload(file, selectedCsvEntityType);
    event.target.value = '';
    setSelectedCsvEntityType(null);
    setShowCsvEntityTypeSelector(false);
  };
  
  const handleMultiCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) onMultipleFileUploadRequest(Array.from(files));
    event.target.value = '';
  };

  const handleChatHistoryFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onLoadChatHistoryFile(file);
    event.target.value = ''; 
  };

  const handleCsvIndividualImportClick = (entityType: EntityType) => {
    setSelectedCsvEntityType(entityType);
    csvFileInputRef.current?.click(); // This will trigger handleCsvFileChange
    // setShowCsvEntityTypeSelector(false); // Already handled by useEffect or selection
  };

  // Menu items definitions
  const dbMenuItems: DropdownMenuItem[] = [
    { label: "Cargar BD (JSON)", icon: <UploadIcon className="h-4 w-4" />, onClick: handleJsonImportClick },
    { label: "Guardar BD (JSON)", icon: <DownloadIcon className="h-4 w-4" />, onClick: () => onFileExport('json_db') },
    { label: "Borrar BD", icon: <DeleteDatabaseIcon className="h-4 w-4" />, onClick: onDeleteDatabaseRequest, isDangerous: true },
  ];

  const tableMenuItems: DropdownMenuItem[] = [
    { label: "Cargar Múltiples (CSV)", icon: <MultiFileIcon className="h-4 w-4" />, onClick: handleMultiCsvImportClick },
    { label: "Guardar Todas (CSV)", icon: <ExportPackageIcon className="h-4 w-4" />, onClick: onExportToCsvs },
    { 
      label: "Cargar Individual (CSV)", 
      icon: <FileCsvIcon className="h-4 w-4" />, 
      onClick: () => {
        setShowCsvEntityTypeSelector(prev => !prev); // Toggle the entity selector
      } 
    },
  ];

  const historyMenuItems: DropdownMenuItem[] = [
    { label: "Guardar Historial", icon: <SaveHistoryIcon className="h-4 w-4" />, onClick: onSaveChatHistory },
    { label: "Cargar Historial", icon: <LoadHistoryIcon className="h-4 w-4" />, onClick: handleLoadHistoryClick },
  ];

  const groupButtonBaseClass = "flex items-center text-white py-2 px-2 sm:px-3 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800";
  const groupButtonIconClass = "h-4 w-4 mr-0 sm:mr-1 md:mr-2";

  return (
    <div className="bg-gray-200 dark:bg-gray-800 p-3 shadow-md flex items-center justify-between border-b border-gray-300 dark:border-gray-700 bg-transition">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">FarmerChat AI v10.0</h1>
      </div>
      
      <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
        {/* Offline Queue Indicator (Direct) */}
        {pendingOfflineRequestCount > 0 && (
            <div 
              className="flex items-center bg-yellow-500 text-yellow-900 dark:bg-yellow-400 dark:text-yellow-900 py-1 px-2 sm:px-3 rounded-md text-xs sm:text-sm transition-colors animate-pulse"
              title={`${pendingOfflineRequestCount} solicitud(es) pendientes de procesar`}
            >
              <OfflineQueueIcon className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xxs:inline">{pendingOfflineRequestCount} Pendiente{pendingOfflineRequestCount > 1 ? 's' : ''}</span>
              <span className="xxs:hidden">{pendingOfflineRequestCount}</span>
            </div>
          )}

        {/* Database Operations Dropdown */}
        <DropdownMenu
          triggerButton={
            <button
              className={`${groupButtonBaseClass} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}
              title="Operaciones de Base de Datos"
            >
              <DatabaseIcon className={groupButtonIconClass} />
              <span className="hidden sm:inline">BD</span>
            </button>
          }
          menuItems={dbMenuItems}
        />
        <input type="file" ref={jsonFileInputRef} onChange={handleJsonFileChange} accept=".json" className="hidden" />

        {/* Table Operations Dropdown */}
        <div className="relative"> {/* Container for the Tables group and its specific dropdown */}
          <DropdownMenu
            triggerButton={
              <button
                ref={tablesGroupButtonRef}
                className={`${groupButtonBaseClass} bg-purple-500 hover:bg-purple-600 focus:ring-purple-500`}
                title="Operaciones de Tablas (CSV)"
              >
                <TableCellsIcon className={groupButtonIconClass} />
                <span className="hidden sm:inline">Tablas</span>
              </button>
            }
            menuItems={tableMenuItems}
            onClose={() => {
                // Do not close entity selector if it was just opened by a menu item
                // The click outside handler for entity selector will manage it.
            }}
          />
          {showCsvEntityTypeSelector && (
            <div 
              id="csv-entity-type-selector-dropdown"
              className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-md shadow-lg z-40 py-1 border dark:border-gray-600 max-h-60 overflow-y-auto"
              // Basic positioning; might need adjustment based on actual layout / more robust library if precise control needed
              style={{ top: tablesGroupButtonRef.current ? tablesGroupButtonRef.current.offsetHeight + 5 : '100%'}} 
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1">Importar para:</p>
              {entityTypes.map(entity => (
                <a
                  key={entity}
                  href="#"
                  onClick={(e) => { 
                    e.preventDefault(); 
                    handleCsvIndividualImportClick(entity); 
                    setShowCsvEntityTypeSelector(false); // Close after selection
                  }}
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                  role="menuitem"
                >
                  {ENTITY_DISPLAY_NAMES[entity]}
                </a>
              ))}
            </div>
          )}
        </div>
        <input type="file" ref={multiCsvFileInputRef} onChange={handleMultiCsvFileChange} accept=".csv" multiple className="hidden" />
        <input type="file" ref={csvFileInputRef} onChange={handleCsvFileChange} accept=".csv" className="hidden" />

        {/* Chat History Dropdown */}
        <DropdownMenu
          triggerButton={
            <button
              className={`${groupButtonBaseClass} bg-orange-500 hover:bg-orange-600 focus:ring-orange-500`}
              title="Operaciones de Historial de Chat"
            >
              <ChatHistoryIcon className={groupButtonIconClass} />
              <span className="hidden sm:inline">Historial</span>
            </button>
          }
          menuItems={historyMenuItems}
        />
        <input type="file" ref={chatHistoryInputRef} onChange={handleChatHistoryFileChange} accept=".json" className="hidden" />

        {/* Direct Controls */}
        <button
          onClick={onToggleInteractiveVoiceMode}
          className={`p-2 rounded-full transition-colors ${
            isInteractiveVoiceMode
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
          }`}
          title={isInteractiveVoiceMode ? "Desactivar Modo Voz" : "Activar Modo Voz"}
        >
          {isInteractiveVoiceMode ? <VoiceOnIcon className="h-5 w-5" /> : <VoiceOffIcon className="h-5 w-5" />}
        </button>
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-full bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-yellow-500 dark:text-yellow-400 transition-colors"
          title={currentTheme === 'dark' ? "Modo Claro" : "Modo Oscuro"}
        >
          {currentTheme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
});
