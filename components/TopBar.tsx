
import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { EntityType } from '../types';
import { ENTITY_DISPLAY_NAMES } from '../constants';
import { DownloadIcon, UploadIcon, FileCsvIcon, MultiFileIcon, ExportPackageIcon, DeleteDatabaseIcon, SaveHistoryIcon, LoadHistoryIcon } from './icons/FileIcons';
import { Theme } from '../App';
import { SunIcon, MoonIcon } from './icons/ThemeIcons';
import { VoiceOnIcon, VoiceOffIcon } from './icons/VoiceModeIcons';


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
    onLoadChatHistoryFile
  },
  ref
) => {
  const [showCsvImportOptions, setShowCsvImportOptions] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const multiCsvFileInputRef = useRef<HTMLInputElement>(null);
  const chatHistoryInputRef = useRef<HTMLInputElement>(null);
  const [selectedCsvEntityType, setSelectedCsvEntityType] = useState<EntityType | null>(null);

  useImperativeHandle(ref, () => ({
    // Define methods to be called from parent if needed
  }));

  const handleJsonImportClick = () => {
    jsonFileInputRef.current?.click();
  };

  const handleJsonFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file, 'json_db');
    }
    event.target.value = '';
  };

  const handleCsvImportClick = (entityType: EntityType) => {
    setSelectedCsvEntityType(entityType);
    csvFileInputRef.current?.click();
  };

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedCsvEntityType) {
      onFileUpload(file, selectedCsvEntityType);
    }
    event.target.value = '';
    setSelectedCsvEntityType(null);
    setShowCsvImportOptions(false);
  };

  const handleMultiCsvImportClick = () => {
    multiCsvFileInputRef.current?.click();
  };

  const handleMultiCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onMultipleFileUploadRequest(Array.from(files));
    }
    event.target.value = '';
  };

  const handleLoadHistoryClick = () => {
    chatHistoryInputRef.current?.click();
  };

  const handleChatHistoryFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onLoadChatHistoryFile(file);
    }
    event.target.value = ''; // Reset file input
  };

  return (
    <div className="bg-gray-200 dark:bg-gray-800 p-3 shadow-md flex items-center justify-between border-b border-gray-300 dark:border-gray-700 bg-transition">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">FarmerChat AI v10.0</h1>
      </div>
      
      <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
        <button
          onClick={onDeleteDatabaseRequest}
          className="flex items-center bg-red-500 hover:bg-red-600 text-white py-2 px-2 sm:px-3 rounded-md text-sm transition-colors"
          title="Borrar Base de Datos (¡Peligro!)"
        >
          <DeleteDatabaseIcon className="h-4 w-4 mr-0 sm:mr-1 md:mr-2" />
          <span className="hidden sm:inline">Borrar BD</span>
        </button>

        <div className="flex items-center space-x-1 sm:space-x-2 p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg">
          <button
            onClick={handleJsonImportClick}
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-2 sm:px-3 rounded-md text-sm transition-colors"
            title="Importar Base de Datos Completa desde Archivo"
          >
            <UploadIcon className="h-4 w-4 mr-0 sm:mr-1 md:mr-2" />
            <span className="hidden sm:inline">Cargar BD</span>
            <input type="file" ref={jsonFileInputRef} onChange={handleJsonFileChange} accept=".json" className="hidden" />
          </button>
          <button
            onClick={() => onFileExport('json_db')}
            className="flex items-center bg-green-600 hover:bg-green-700 text-white py-2 px-2 sm:px-3 rounded-md text-sm transition-colors"
            title="Exportar Base de Datos Completa a Archivo (Respaldo)"
          >
            <DownloadIcon className="h-4 w-4 mr-0 sm:mr-1 md:mr-2" />
            <span className="hidden sm:inline">Guardar BD</span>
          </button>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg">
          <button
            onClick={handleMultiCsvImportClick}
            className="flex items-center bg-purple-500 hover:bg-purple-600 text-white py-2 px-2 sm:px-3 rounded-md text-sm transition-colors"
            title="Importar Múltiples Tablas desde Archivos"
          >
            <MultiFileIcon className="h-4 w-4 mr-0 sm:mr-1 md:mr-2" />
            <span className="hidden sm:inline">Tablas</span>
            <input type="file" ref={multiCsvFileInputRef} onChange={handleMultiCsvFileChange} accept=".csv" multiple className="hidden" />
          </button>
          <button
            onClick={onExportToCsvs}
            className="flex items-center bg-teal-500 hover:bg-teal-600 text-white py-2 px-2 sm:px-3 rounded-md text-sm transition-colors"
            title="Exportar Todas las Tablas a Archivos"
          >
            <ExportPackageIcon className="h-4 w-4 mr-0 sm:mr-1 md:mr-2" />
            <span className="hidden sm:inline">Tablas</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowCsvImportOptions(!showCsvImportOptions)}
              className="flex items-center bg-yellow-500 hover:bg-yellow-600 text-gray-900 py-2 px-2 sm:px-3 rounded-md text-sm transition-colors"
              title="Importar Tabla Individual desde Archivo"
            >
              <FileCsvIcon className="h-4 w-4 mr-0 sm:mr-1 md:mr-2" />
              <span className="hidden sm:inline">Tabla</span>
            </button>
            {showCsvImportOptions && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-md shadow-lg z-20 py-1 border dark:border-gray-600 max-h-60 overflow-y-auto">
                <p className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1">Importar Tabla para:</p>
                {entityTypes.map(entity => (
                  <a
                    key={entity}
                    href="#"
                    onClick={(e) => { e.preventDefault(); handleCsvImportClick(entity); }}
                    className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    role="menuitem"
                  >
                    {ENTITY_DISPLAY_NAMES[entity]}
                  </a>
                ))}
              </div>
            )}
            <input type="file" ref={csvFileInputRef} onChange={handleCsvFileChange} accept=".csv" className="hidden" />
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg">
          <button
            onClick={onSaveChatHistory}
            className="flex items-center bg-sky-500 hover:bg-sky-600 text-white py-2 px-2 sm:px-3 rounded-md text-sm transition-colors"
            title="Guardar Historial de Chat"
          >
            <SaveHistoryIcon className="h-4 w-4 mr-0 sm:mr-1 md:mr-2" />
            <span className="hidden sm:inline">G. Hist.</span>
          </button>
          <button
            onClick={handleLoadHistoryClick}
            className="flex items-center bg-orange-500 hover:bg-orange-600 text-white py-2 px-2 sm:px-3 rounded-md text-sm transition-colors"
            title="Cargar Historial de Chat"
          >
            <LoadHistoryIcon className="h-4 w-4 mr-0 sm:mr-1 md:mr-2" />
            <span className="hidden sm:inline">C. Hist.</span>
            <input type="file" ref={chatHistoryInputRef} onChange={handleChatHistoryFileChange} accept=".json" className="hidden" />
          </button>
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
    </div>
  );
});
