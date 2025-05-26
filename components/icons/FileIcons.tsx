
import React from 'react';

interface IconProps {
  className?: string;
}

export const UploadIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

export const FileJsonIcon: React.FC<IconProps> = ({ className }) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0_12.75h.008v.008H8.25v-.008z" />
  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5_18.75m-2.25_0a2.25_2.25_0_002.25-2.25_2.25_2.25_0_00-2.25-2.25_2.25_2.25_0_00-2.25_2.25_2.25_2.25_0_002.25_2.25zM19.5_14.25v2.625a3.375_3.375_0_01-3.375_3.375H5.25A3.375_3.375_0_011.5_16.875V7.125A3.375_3.375_0_014.875_3.75h4.875a3.375_3.375_0_013.375_3.375V11.25" />
 </svg>
);

export const FileCsvIcon: React.FC<IconProps> = ({ className }) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-1.5l-1.5.75M5.25 17.25h13.5" />
  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v2.625a3.375 3.375 0 01-3.375 3.375H5.25A3.375 3.375 0 011.5 16.875V7.125A3.375 3.375 0 014.875 3.75h4.875a3.375 3.375 0 013.375 3.375V11.25" />
 </svg>
);

export const MultiFileIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L16.5 10.5m0 0L13.5 13.5m3-3v6m0 0H10.5m6 0a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zM4.5 3.75a3 3 0 00-3 3v10.5a3 3 0 003 3h5.25a.75.75 0 000-1.5H4.5a1.5 1.5 0 01-1.5-1.5V6.75a1.5 1.5 0 011.5-1.5h10.5a1.5 1.5 0 011.5 1.5V10.5a.75.75 0 001.5 0V6.75a3 3 0 00-3-3H4.5z" />
  </svg>
);

export const ExportPackageIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.123 0 1.131.094 1.976 1.057 1.976 2.192V7.5M8.25 7.5h7.5M8.25 7.5V9a.75.75 0 01-.75.75H5.625a.75.75 0 01-.75-.75V7.5m7.5 0V9A.75.75 0 0015 9.75h2.625a.75.75 0 00.75-.75V7.5m-15 6.075A3.375 3.375 0 014.875 15h14.25a3.375 3.375 0 013.375 3.375V18.75A3.375 3.375 0 0119.125 21H4.875A3.375 3.375 0 011.5 18.75v-.375m15-6.075c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123 0c-1.131.094-1.976 1.057-1.976 2.192" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
