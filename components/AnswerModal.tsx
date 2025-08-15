import React, { useState, useCallback, useEffect } from 'react';
import { Question, Answer } from '../types';
import { fileToBase64 } from '../utils/helpers';
import Modal from './Modal';
import { XIcon } from './icons';
import { storeImage } from '../services/imageStore';
import { useStoredImage } from '../hooks/useStoredImage';

interface AnswerModalProps {
    question: Question;
    onClose: () => void;
    onSave: (answer: Answer) => void;
}

const ImagePreview = ({ imageKey }: { imageKey: string }) => {
    const { src, isLoading } = useStoredImage(imageKey);
    return (
        <div className="w-full h-24 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
            {isLoading ? <span>...</span> : <img src={src} alt="Answer image" className="w-full h-full object-cover rounded-md"/>}
        </div>
    );
}

const QuestionContextImage = ({ imageUrl }: { imageUrl: string }) => {
    const { src, isLoading } = useStoredImage(imageUrl);

    if (isLoading) {
        return (
            <div className="max-h-32 w-full object-contain rounded-md bg-gray-100 dark:bg-gray-700 mb-4 flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">Loading image...</p>
            </div>
        );
    }
    
    if (!src) return null;

    return <img src={src} alt="Question context" className="max-h-32 w-full object-contain rounded-md bg-gray-100 dark:bg-gray-700 mb-4"/>;
}


const AnswerModal = ({ question, onClose, onSave }: AnswerModalProps) => {
    const [answerText, setAnswerText] = useState(question.answer?.text || '');
    const [answerImageKeys, setAnswerImageKeys] = useState<string[]>(question.answer?.imageUrls || []);

    const handleSave = () => {
        if (answerText.trim() || answerImageKeys.length > 0) {
            onSave({ text: answerText, imageUrls: answerImageKeys });
        } else {
            onClose(); // Just close if nothing was entered
        }
    };

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        for (const file of Array.from(files)) {
            if (file.type.startsWith('image/')) {
                const base64 = await fileToBase64(file);
                const key = await storeImage(base64);
                setAnswerImageKeys(prev => [...prev, key]);
            }
        }
    }, []);

    const handlePaste = useCallback((event: ClipboardEvent) => {
        const items = event.clipboardData?.items;
        if (!items) return;
        const files = Array.from(items).filter(item => item.kind === 'file').map(item => item.getAsFile() as File);
        if (files.length > 0) {
            event.preventDefault();
            handleFiles(files);
        }
    }, [handleFiles]);
    
    useEffect(() => {
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [handlePaste]);


    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.currentTarget.classList.remove('border-indigo-500');
        handleFiles(event.dataTransfer.files);
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.currentTarget.classList.add('border-indigo-500');
    };
    
    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.currentTarget.classList.remove('border-indigo-500');
    };
    
    const removeImage = (indexToRemove: number) => {
        // Note: This doesn't delete from IndexedDB yet, as the user might not save.
        // A cleanup process for orphaned images could be implemented later if needed.
        setAnswerImageKeys(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Add Answer">
            <div className="space-y-4">
                {question.imageUrl && <QuestionContextImage imageUrl={question.imageUrl} />}
                
                <div>
                    <label htmlFor="answerText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Answer Text (Optional)</label>
                    <textarea 
                        id="answerText" 
                        rows={4} 
                        value={answerText} 
                        onChange={(e) => setAnswerText(e.target.value)} 
                        className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="Type the answer here..."
                    ></textarea>
                </div>
                
                <div>
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Answer Images (Optional)</span>
                    <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md transition-colors">
                        <div className="space-y-1 text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Drag & drop, or paste images</p>
                        </div>
                    </div>
                </div>

                {answerImageKeys.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                        {answerImageKeys.map((key, index) => (
                            <div key={key} className="relative group">
                                <ImagePreview imageKey={key} />
                                <button onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Skip</button>
                    <button type="button" onClick={handleSave} className="bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors">Save Answer</button>
                </div>
            </div>
        </Modal>
    );
};

export default AnswerModal;