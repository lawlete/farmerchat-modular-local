import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md text-gray-800 dark:text-gray-100">
        <h2 id="confirm-modal-title" className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
          {title}
        </h2>
        <div className="mb-6 text-sm leading-relaxed">
          {message}
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md transition-colors"
            aria-label={cancelText}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
            aria-label={confirmText}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
