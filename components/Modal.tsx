
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, title, children, className }) => {
  if (!isOpen) return null;

  const baseModalClasses = "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4";
  
  // Check if the provided className already includes a z-index utility class (e.g., z-10, z-[100])
  const hasCustomZIndex = className && /\bz-\[\d+\]\b|\bz-\d+\b/.test(className);
  const zIndexClass = hasCustomZIndex ? '' : 'z-50';

  // Construct the final classes, ensuring custom className comes first to allow overrides,
  // and then zIndexClass (which is empty if custom z-index was found).
  const finalClassName = `${baseModalClasses} ${className || ''} ${zIndexClass}`.trim().replace(/\s+/g, ' ');

  return (
    <div className={finalClassName}>
      <div className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md text-center overflow-y-auto max-h-[90vh]">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-sky-400">{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default Modal;
