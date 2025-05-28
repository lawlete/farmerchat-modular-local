import React from 'react';

interface IconProps {
  className?: string;
}

export const PrintIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a2.25 2.25 0 014.56 0m-4.56 0A2.25 2.25 0 005.85 15H5.25v-3.75c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V15h-.094c-.24-.034-.48-.066-.72-.096A2.25 2.25 0 016.72 13.83zM19.5 12c0-1.036-.84-1.875-1.875-1.875L17.25 9V6.75A2.25 2.25 0 0015 4.5h-6a2.25 2.25 0 00-2.25 2.25V9l.375 1.125L12 12m0 0V9.75M12 12H6.75m5.25 0H17.25m0 0l2.25-2.25M15 12H9m6 0l2.25 2.25m0 0l2.25 2.25M12 12l-2.25 2.25M12 12l2.25-2.25M12 12l-2.25-2.25M6 12l-2.25 2.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 4.5H9a2.25 2.25 0 00-2.25 2.25V7.5h9V6.75A2.25 2.25 0 0015 4.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 16.5v3A2.25 2.25 0 0117.25 21H6.75A2.25 2.25 0 014.5 18.75v-3" />
  </svg>
);

// Moved from FileIcons.tsx for better organization
export const CsvDownloadIcon: React.FC<IconProps> = ({ className }) => ( // Renamed from DownloadIcon to be specific
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

// Moved from ModalControlIcons.tsx for better organization
export const PdfFileIcon: React.FC<IconProps> = ({ className }) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h.008v.008H8.25v-.008z" />
  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 18.75m-2.25 0a2.25 2.25 0 002.25-2.25A2.25 2.25 0 0010.5 14m0 4.5V16.5m2.25-2.25a2.25 2.25 0 00-2.25-2.25M16.5 13.5V18m2.25-4.5a2.25 2.25 0 00-2.25-2.25M19.5 14.25v2.625a3.375 3.375 0 01-3.375 3.375H5.25A3.375 3.375 0 011.5 16.875V7.125A3.375 3.375 0 014.875 3.75h4.875a3.375 3.375 0 013.375 3.375V11.25" />
 </svg>
);