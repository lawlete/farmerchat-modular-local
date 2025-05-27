
import React from 'react';
import { TractorIcon, TreeIcon, WorkersIcon } from './icons/WelcomeIcons';
import { VoiceOnIcon, VoiceOffIcon } from './icons/VoiceModeIcons'; 
import { UploadIcon, MultiFileIcon, FileCsvIcon, DownloadIcon, ExportPackageIcon } from './icons/FileIcons'; // Added DownloadIcon, ExportPackageIcon for completeness

interface WelcomeBannerProps {
  isVoiceModeActive: boolean;
  onToggleVoiceMode: () => void;
  onDismiss: () => void; 
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ 
    isVoiceModeActive, 
    onToggleVoiceMode,
    onDismiss 
}) => {
  return (
    <div 
        className="fixed inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 dark:from-blue-700 dark:via-blue-800 dark:to-indigo-900 flex items-center justify-center z-50 p-4 sm:p-6 md:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-banner-title"
    >
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-3xl text-center transform transition-all duration-500 ease-out scale-100 opacity-100 max-h-[95vh] overflow-y-auto">
        <div className="flex justify-center space-x-4 sm:space-x-6 mb-6">
          <TractorIcon className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 dark:text-green-400" />
          <TreeIcon className="h-12 w-12 sm:h-16 sm:w-16 text-lime-500 dark:text-lime-400" />
          <WorkersIcon className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-500 dark:text-yellow-400" />
        </div>

        <h1 id="welcome-banner-title" className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-3">
          ¡Bienvenido a FarmerChat AI! <span role="img" aria-label="rocket">🚀</span>
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm sm:text-base leading-relaxed">
          Soy tu asistente virtual para ayudarte a gestionar los registros y tareas de tu actividad agropecuaria de forma sencilla.
        </p>

        <div className="text-left bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-6">
            <p className="text-gray-700 dark:text-gray-200 font-semibold mb-2 text-sm sm:text-base">Puedes interactuar conmigo escribiendo comandos como:</p>
            <ul className="list-none space-y-2 text-sm text-gray-600 dark:text-gray-300 pl-2">
                <li><span role="img" aria-label="plant" className="mr-2">🌱</span> "Crear cliente llamado Finca Verde"</li>
                <li><span role="img" aria-label="clipboard" className="mr-2">📋</span> "Listar todas las tareas pendientes para hoy"</li>
                <li><span role="img" aria-label="wheat" className="mr-2">🌾</span> "Mostrar los lotes del campo El Progreso"</li>
                <li><span role="img" aria-label="question mark" className="mr-2">❓</span> "Ayuda" (para ver más acciones)</li>
            </ul>
        </div>

        <div className="text-left bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-2 text-sm sm:text-base">Opciones de Carga y Guardado de Datos:</h3>
            <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 mb-3">
                Puedes gestionar tus datos usando los botones en la barra superior:
            </p>
            <ul className="list-none space-y-2 text-xs sm:text-sm text-yellow-600 dark:text-yellow-400">
                <li className="flex items-center">
                    <UploadIcon className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
                    <span><strong className="text-blue-600 dark:text-blue-400">Cargar BD:</strong> Carga una base de datos completa desde un archivo JSON. (Botón <span className="inline-flex items-center"><UploadIcon className="h-3 w-3 mx-0.5"/>Cargar BD</span>)</span>
                </li>
                <li className="flex items-center">
                    <DownloadIcon className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                    <span><strong className="text-green-600 dark:text-green-400">Guardar BD:</strong> Guarda la base de datos actual en un archivo JSON. (Botón <span className="inline-flex items-center"><DownloadIcon className="h-3 w-3 mx-0.5"/>Guardar BD</span>)</span>
                </li>
                <li className="flex items-center">
                    <MultiFileIcon className="h-4 w-4 mr-2 text-purple-500 flex-shrink-0" />
                    <span><strong className="text-purple-600 dark:text-purple-400">Cargar Tablas:</strong> Sube varios archivos CSV (tablas) a la vez. (Botón <span className="inline-flex items-center"><MultiFileIcon className="h-3 w-3 mx-0.5"/>Tablas</span>)</span>
                </li>
                 <li className="flex items-center">
                    <ExportPackageIcon className="h-4 w-4 mr-2 text-teal-500 flex-shrink-0" />
                    <span><strong className="text-teal-600 dark:text-teal-400">Guardar Tablas:</strong> Guarda todas las tablas actuales en archivos CSV individuales. (Botón <span className="inline-flex items-center"><ExportPackageIcon className="h-3 w-3 mx-0.5"/>Tablas</span>)</span>
                </li>
                 <li className="flex items-center">
                    <FileCsvIcon className="h-4 w-4 mr-2 text-yellow-700 flex-shrink-0" />
                    <span><strong className="text-yellow-800 dark:text-yellow-500">Cargar Tabla:</strong> Importa datos para una tabla específica desde un archivo CSV. (Botón <span className="inline-flex items-center"><FileCsvIcon className="h-3 w-3 mx-0.5"/>Tabla</span>)</span>
                </li>
            </ul>
             <p className="text-xs text-yellow-500 dark:text-yellow-600 mt-2">
                No olvides la opción de <strong className="text-red-600 dark:text-red-400">Borrar BD</strong> para limpiar todos los datos (¡con confirmación!).
            </p>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mb-8 text-sm">
          <p className="text-blue-700 dark:text-blue-300 flex items-center justify-center">
            {isVoiceModeActive ? <VoiceOnIcon className="h-5 w-5 mr-2 text-green-500" /> : <VoiceOffIcon className="h-5 w-5 mr-2 text-red-500" />}
            Modo Voz Interactiva: <span className={`font-semibold ml-1 ${isVoiceModeActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isVoiceModeActive ? 'ACTIVADO' : 'DESACTIVADO'}
            </span>.
          </p>
          <p className="text-blue-600 dark:text-blue-400 mt-1">
            Actívalo/Desactívalo con el icono <button onClick={onToggleVoiceMode} aria-label="Toggle voice mode" className="inline-block align-middle p-1 bg-gray-200 dark:bg-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500">{ isVoiceModeActive ? <VoiceOnIcon className="h-4 w-4"/> : <VoiceOffIcon className="h-4 w-4"/> }</button> en la barra superior para respuestas por voz y activación automática del micrófono.
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
          aria-label="Acceder al chat"
        >
          Acceder al Chat
        </button>
      </div>
    </div>
  );
};
