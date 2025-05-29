
import React from 'react';

interface IconProps {
  className?: string;
}

export const DatabaseIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25C15.75 18.4926 14.1426 19.5 12.375 19.5C10.6074 19.5 9 18.4926 9 17.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75C9 13.9926 10.6074 15 12.375 15C14.1426 15 15.75 13.9926 15.75 12.75" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25C9 9.49264 10.6074 10.5 12.375 10.5C14.1426 10.5 15.75 9.49264 15.75 8.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5V17.25C4.5 14.7337 7.91015 12.75 12.375 12.75C16.8398 12.75 20.25 14.7337 20.25 17.25V19.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15V12.75C4.5 10.2337 7.91015 8.25 12.375 8.25C16.8398 8.25 20.25 10.2337 20.25 12.75V15" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5V8.25C4.5 5.73371 7.91015 3.75 12.375 3.75C16.8398 3.75 20.25 5.73371 20.25 8.25V10.5" />
  </svg>
);

export const TableCellsIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v12.75c0 .621.504 1.125 1.125 1.125z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 10.5h19.5M10.125 4.5v15" />
  </svg>
);

export const ChatHistoryIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25h.01M12 15.75h.01M7.5 12h.01M16.5 12h.01" />
  </svg>
);
