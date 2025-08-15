
import React from 'react';
import { Question, Difficulty } from '../types';
import { TrashIcon } from './icons';

interface QuestionCardProps {
    question: Question;
    onUpdate: (id: string, data: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>) => void;
    onDelete?: (id: string) => void;
    onSelect: (id: string) => void;
    isSelected: boolean;
}

const QuestionCard = ({ question, onUpdate, onDelete, onSelect, isSelected }: QuestionCardProps) => {
    const difficultyColor = {
        [Difficulty.Normal]: 'border-normal',
        [Difficulty.Hard]: 'border-hard',
        [Difficulty.NightBefore]: 'border-night-before',
    };

    return (
        <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border-b-4 ${difficultyColor[question.difficulty]} transition-all duration-300 ${isSelected ? 'ring-2 ring-indigo-500 scale-105' : 'hover:shadow-lg'}`} onClick={() => onSelect(question.id)}>
            {question.type === 'image' && question.imageUrl && <img src={question.imageUrl} alt="Question" className="w-full h-40 object-cover" loading="lazy"/>}
            <div className="p-3">
                 <p className="text-xs text-gray-600 dark:text-gray-400 h-12 overflow-hidden">{question.text || 'Image Question'}</p>
                 <div className="flex justify-between items-center mt-2">
                    <div className="flex space-x-1">
                        <button onClick={e => { e.stopPropagation(); onUpdate(question.id, { difficulty: Difficulty.Normal })}} className={`w-6 h-6 rounded-full bg-normal ${question.difficulty === Difficulty.Normal && 'ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-normal'}`} aria-label="Mark as Normal"></button>
                        <button onClick={e => { e.stopPropagation(); onUpdate(question.id, { difficulty: Difficulty.Hard })}} className={`w-6 h-6 rounded-full bg-hard ${question.difficulty === Difficulty.Hard && 'ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-hard'}`} aria-label="Mark as Hard"></button>
                        <button onClick={e => { e.stopPropagation(); onUpdate(question.id, { difficulty: Difficulty.NightBefore })}} className={`w-6 h-6 rounded-full bg-night-before ${question.difficulty === Difficulty.NightBefore && 'ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-night-before'}`} aria-label="Mark as Night Before"></button>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (window.confirm('Are you sure you want to delete this question?')) {
                                onDelete?.(question.id);
                            }
                        }}
                        aria-label="Delete question"
                        className="text-gray-400 hover:text-red-500"
                    >
                        <TrashIcon className="w-4 h-4"/>
                    </button>
                 </div>
            </div>
        </div>
    );
};

export default QuestionCard;