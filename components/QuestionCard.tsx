
import React, { useState, useRef, useEffect } from 'react';
import { Question, Difficulty, Tag, Status } from '../types';
import { TrashIcon, PencilIcon, TagIcon } from './icons';
import { useStoredImage } from '../hooks/useStoredImage';

interface QuestionCardProps {
    question: Question;
    tags: Tag[];
    onUpdate: (id: string, data: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>) => void;
    onDelete?: (id: string) => void;
    onSelect: (id: string) => void;
    onEditAnswer: (id: string) => void;
    isSelected: boolean;
}

const QuestionImage = ({ imageUrl, onImageClick }: { imageUrl: string, onImageClick: (url: string) => void }) => {
    const { src, isLoading } = useStoredImage(imageUrl);
    
    if (isLoading) {
        return <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 animate-pulse"></div>;
    }

    return <button onClick={() => onImageClick(imageUrl)} className="w-full h-40 block cursor-zoom-in"><img src={src} alt="Question" className="w-full h-full object-cover" loading="lazy"/></button>;
}


const QuestionCard = ({ question, tags, onUpdate, onDelete, onSelect, onEditAnswer, isSelected, onImageZoom }: QuestionCardProps & { onImageZoom: (imageKey: string) => void}) => {
    const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    const difficultyColor = {
        [Difficulty.Normal]: 'border-normal',
        [Difficulty.Hard]: 'border-hard',
        [Difficulty.NightBefore]: 'border-night-before',
    };
    const borderColor = question.difficulty ? difficultyColor[question.difficulty] : 'border-gray-400 dark:border-gray-600';


    const handleTagChange = (tagId: string, isChecked: boolean) => {
        const newTags = isChecked
            ? [...question.tags, tagId]
            : question.tags.filter(id => id !== tagId);
        onUpdate(question.id, { tags: newTags });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsTagPopoverOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [popoverRef]);

    return (
        <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border-b-4 ${borderColor} transition-all duration-300 ${isSelected ? 'ring-2 ring-indigo-500 scale-105' : 'hover:shadow-lg'}`} onClick={() => onSelect(question.id)}>
            {question.type === 'image' && question.imageUrl && <QuestionImage imageUrl={question.imageUrl} onImageClick={onImageZoom} />}
            <div className="p-3">
                 <div className="h-16">
                    <p className="text-xs text-gray-600 dark:text-gray-400 h-8 overflow-hidden">{question.text || 'Image Question'}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {question.tags.map(tagId => {
                            const tag = tags.find(t => t.id === tagId);
                            if (!tag) return null;
                            return (
                                <span key={tag.id} className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: tag.color }}>
                                    {tag.name}
                                </span>
                            );
                        })}
                    </div>
                 </div>
                 <div className="flex justify-between items-center mt-2">
                    <div className="flex space-x-1">
                        <button onClick={e => { e.stopPropagation(); onUpdate(question.id, { difficulty: Difficulty.Normal, status: Status.Seen })}} className={`w-6 h-6 rounded-full bg-normal ${question.difficulty === Difficulty.Normal && 'ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-normal'}`} aria-label="Mark as Normal"></button>
                        <button onClick={e => { e.stopPropagation(); onUpdate(question.id, { difficulty: Difficulty.Hard, status: Status.Seen })}} className={`w-6 h-6 rounded-full bg-hard ${question.difficulty === Difficulty.Hard && 'ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-hard'}`} aria-label="Mark as Hard"></button>
                        <button onClick={e => { e.stopPropagation(); onUpdate(question.id, { difficulty: Difficulty.NightBefore, status: Status.Seen })}} className={`w-6 h-6 rounded-full bg-night-before ${question.difficulty === Difficulty.NightBefore && 'ring-2 ring-offset-2 dark:ring-offset-gray-800 ring-night-before'}`} aria-label="Mark as Night Before"></button>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="relative" ref={popoverRef}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsTagPopoverOpen(prev => !prev); }}
                                aria-label="Manage tags"
                                className="text-gray-400 hover:text-indigo-500 p-1 rounded-full"
                            >
                                <TagIcon className="w-4 h-4" />
                            </button>
                            {isTagPopoverOpen && (
                                <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20 p-2 space-y-1" onClick={e => e.stopPropagation()}>
                                    {tags.length > 0 ? tags.map(tag => (
                                        <label key={tag.id} className="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={question.tags.includes(tag.id)}
                                                onChange={e => handleTagChange(tag.id, e.target.checked)}
                                                className="rounded"
                                                style={{ accentColor: tag.color }}
                                            />
                                            <span className="text-sm font-medium">{tag.name}</span>
                                        </label>
                                    )) : <span className="text-xs text-gray-500 dark:text-gray-400 p-2">No tags created yet.</span>}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEditAnswer(question.id); }}
                            aria-label="Edit answer"
                            className="text-gray-400 hover:text-indigo-500 p-1 rounded-full"
                        >
                            <PencilIcon className="w-4 h-4" />
                        </button>
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
                            className="text-gray-400 hover:text-red-500 p-1 rounded-full"
                        >
                            <TrashIcon className="w-4 h-4"/>
                        </button>
                    </div>
                 </div>
            </div>
        </div>
    );
};

export default QuestionCard;