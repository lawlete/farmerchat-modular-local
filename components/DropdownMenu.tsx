
import React, { useState, useEffect, useRef } from 'react';

export interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  isDangerous?: boolean; // For styling destructive actions
}

interface DropdownMenuProps {
  triggerButton: React.ReactElement;
  menuItems: DropdownMenuItem[];
  menuTitle?: string;
  align?: 'left' | 'right';
  onClose?: () => void; // Callback when dropdown closes
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  triggerButton,
  menuItems,
  menuTitle,
  align = 'right',
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up to document click listener immediately
    setIsOpen(prev => !prev);
  };
  
  const closeDropdown = () => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose]);

  const alignmentClass = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div className="relative inline-block text-left" ref={triggerRef}>
      {React.cloneElement<React.HTMLAttributes<HTMLElement>>(
        triggerButton, 
        { 
          onClick: toggleDropdown, 
          'aria-haspopup': 'true', 
          'aria-expanded': isOpen 
        }
      )}
      
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`${alignmentClass} absolute mt-2 w-64 origin-top-${align} bg-white dark:bg-gray-700 rounded-md shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-30`}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={(triggerButton.props as { id?: string }).id || undefined}
        >
          <div className="py-1" role="none">
            {menuTitle && (
              <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {menuTitle}
              </div>
            )}
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  closeDropdown(); 
                }}
                disabled={item.disabled}
                className={`w-full text-left flex items-center px-4 py-2 text-sm 
                  ${item.isDangerous 
                    ? 'text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-800/50' 
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'}
                  ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  transition-colors duration-150 ease-in-out`}
                role="menuitem"
              >
                {item.icon && <span className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400" aria-hidden="true">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
