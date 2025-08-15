
import React from 'react';
import { Answer } from '../types';
import { XIcon } from './icons';

interface AnswerDisplayModalProps {
    answer: Answer;
    onClose: () => void;
}

const AnswerDisplayModal = ({ answer, onClose }: AnswerDisplayModalProps) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex justify-center items-center backdrop-blur-md animate-fadeIn" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 m-4 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Answer</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    {answer.text && <p className="text-gray-300 whitespace-pre-wrap">{answer.text}</p>}
                    {answer.imageUrls && answer.imageUrls.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {answer.imageUrls.map((url, index) => (
                                <img key={index} src={url} alt={`Answer image ${index + 1}`} className="rounded-lg object-contain w-full" />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnswerDisplayModal;
