
import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { EntityType } from '../types';
import { ENTITY_DISPLAY_NAMES } from '../constants';
import { DownloadIcon, UploadIcon, FileCsvIcon, MultiFileIcon, ExportPackageIcon } from './icons/FileIcons';
import { Theme } from '../App'; 
import { SunIcon, MoonIcon } from './icons/ThemeIcons';
import { VoiceOnIcon, VoiceOffIcon } from './icons/VoiceModeIcons';


export interface TopBarHandles {
  // Potentially expose methods if App needs to trigger something in TopBar
}

interface TopBarProps {
  onFileUpload: (file: File, type: 'json_db' | EntityType) => void;
  onFileExport: (type: 'json_db') => void;
  onExportToCsvs: () => void; // New prop for exporting all CSVs
  entityTypes: EntityType[];
  currentTheme: Theme;
  onToggleTheme: () => void;
  isInteractiveVoiceMode: boolean;
  onToggleInteractiveVoiceMode: () => void; // Changed to expect a function
  onMultipleFileUploadRequest: (files: File[]) => void;
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
    onMultipleFileUploadRequest
  }, 
  ref
) => {
  const [showCsvImportOptions, setShowCsvImportOptions] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const multiCsvFileInputRef = useRef<HTMLInputElement>(null);
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

  return (
    <div className="bg-gray-200 dark:bg-gray-800 p-3 shadow-md flex items-center justify-between border-b border-gray-300 dark:border-gray-700 bg-transition">
      <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">FarmerChat AI</h1>
      <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
        {/* Multi CSV Import */}
        <button
          onClick={handleMultiCsvImportClick}
          className="flex items-center bg-purple-500 hover:bg-purple-600 text-white py-2 px-2 sm:px-3 rounded-md text-sm transition-colors"
          title="Importar Múltiples CSVs"
        >
          <MultiFileIcon className="h-4 w-4 mr-0 sm:mr-1 md:mr-2" /> <span className="hidden sm:inline">CSVs</span>
          <input type="file" ref={multiCsvFileInputRef} onChange={handleMultiCsvFileChange} accept=".csv" multiple className="hidden" />
        </button>
        
        {/* JSON DB Import/Export */}
        <button
          onClick={handleJsonImportClick}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-2 sm:px-3 rounded-md text-sm transition-colors"
          title="Importar Base de Datos (JSON)"
        >
          <UploadIcon className="h-4 w-4 mr-0 sm:mr-1 md:mr-2" /> <span className="hidden sm:inline">JSON</span>
          <input type="file" ref={jsonFileInputRef} onChange={handleJsonFileChange} accept=".json" className="hidden" />
        </button>
        <button
          onClick={() => onFileExport('json_db')}
          className="flex items-center bg-green-600 hover:bg-green-700 text-white py-2 px-2 sm:px-3 rounded-md text-sm transition-colors"
          title="Exportar Base de Datos (JSON)"
        >
          <DownloadIcon className="h-4 w-4 mr-0 sm:mr-1 md:mr-2" /> <span className="hidden sm:inline">JSON</span>
        </button>
        
        {/* Export All to CSVs */}
        <button
          onClick={onExportToCsvs}
          className="flex items-center bg-teal-500 hover:bg-teal-600 text-white py-2 px-2 sm:px-3 rounded-md text-sm transition-colors"
          title="Exportar Todo a CSVs"
        >
          <ExportPackageIcon className="h-4 w-4 mr-0 sm:mr-1 md:mr-2" /> <span className="hidden sm:inline">CSVs</span>
        </button>

        {/* CSV Import Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowCsvImportOptions(!showCsvImportOptions)}
            className="flex items-center bg-yellow-500 hover:bg-yellow-600 text-gray-900 py-2 px-2 sm:px-3 rounded-md text-sm transition-colors"
            title="Importar CSV Individual"
          >
            <FileCsvIcon className="h-4 w-4 mr-0 sm:mr-1 md:mr-2" /> <span className="hidden sm:inline">CSV</span>
          </button>
          {showCsvImportOptions && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-md shadow-lg z-20 py-1 border dark:border-gray-600 max-h-60 overflow-y-auto">
              <p className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1">Importar CSV para:</p>
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

        {/* Voice Mode Toggle */}
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

        {/* Theme Toggle */}
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
