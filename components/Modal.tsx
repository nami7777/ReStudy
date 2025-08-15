import React, { ReactNode } from 'react';
import { XIcon } from './icons';

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: ReactNode }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 m-4 w-full max-w-md transform transition-all animate-slideInUp`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default Modal;
