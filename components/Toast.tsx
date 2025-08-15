import React from 'react';

const Toast = ({ message, onUndo }: { message: string; onUndo?: () => void }) => {
    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-800 text-white py-2 px-5 rounded-full shadow-lg flex items-center animate-slideInUp">
            <span>{message}</span>
            {onUndo && (
                <button onClick={onUndo} className="ml-4 font-bold text-indigo-400 hover:text-indigo-300">Undo</button>
            )}
        </div>
    );
};

export default Toast;
