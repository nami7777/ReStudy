
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Tag } from '../types';
import { PlusIcon, TrashIcon, PencilIcon, XIcon } from './icons';

export const TagManager = () => {
    const { tags, addTag, updateTag, deleteTag } = useData();
    const [name, setName] = useState('');
    const [color, setColor] = useState('#6366f1');
    const [editingTag, setEditingTag] = useState<Tag | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        if (editingTag) {
            updateTag(editingTag.id, { name, color });
            setEditingTag(null);
        } else {
            addTag({ name, color });
        }
        setName('');
        setColor('#6366f1');
    };

    const handleEdit = (tag: Tag) => {
        setEditingTag(tag);
        setName(tag.name);
        setColor(tag.color);
    };

    const handleCancelEdit = () => {
        setEditingTag(null);
        setName('');
        setColor('#6366f1');
    };

    const canAddTag = tags.length < 3;

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="flex items-end gap-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="flex-grow">
                    <label htmlFor="tagName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tag Name</label>
                    <input
                        id="tagName"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Chapter 5"
                        maxLength={20}
                        required
                        className="mt-1 block w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3"
                    />
                </div>
                <div>
                    <label htmlFor="tagColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
                    <input
                        id="tagColor"
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="mt-1 block w-14 h-10 rounded-md"
                    />
                </div>
                <button
                    type="submit"
                    disabled={!canAddTag && !editingTag}
                    className="flex items-center gap-2 bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {editingTag ? 'Save' : <PlusIcon className="w-5 h-5"/>}
                </button>
                {editingTag && (
                    <button type="button" onClick={handleCancelEdit} className="p-2.5 bg-gray-200 dark:bg-gray-600 rounded-lg"><XIcon className="w-5 h-5"/></button>
                )}
            </form>
            {!canAddTag && !editingTag && <p className="text-sm text-yellow-600 dark:text-yellow-400 text-center">You can create up to 3 custom tags.</p>}

            <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                    <div key={tag.id} className="flex items-center gap-2 rounded-full py-1 pl-3 pr-1" style={{ backgroundColor: tag.color, color: 'white' }}>
                        <span className="font-semibold text-sm">{tag.name}</span>
                        <button onClick={() => handleEdit(tag)} className="p-1 hover:bg-white/20 rounded-full"><PencilIcon className="w-4 h-4"/></button>
                        <button onClick={() => window.confirm(`Delete tag "${tag.name}"? It will be removed from all questions.`) && deleteTag(tag.id)} className="p-1 hover:bg-white/20 rounded-full"><TrashIcon className="w-4 h-4"/></button>
                    </div>
                ))}
            </div>
        </div>
    );
};
