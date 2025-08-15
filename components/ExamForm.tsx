import React, { useState } from 'react';
import { Exam } from '../types';

interface ExamFormProps {
    exam?: Exam | null;
    onSubmit: (data: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onCancel: () => void;
}

const ExamForm = ({ exam, onSubmit, onCancel }: ExamFormProps) => {
    const [name, setName] = useState(exam?.name || '');
    const [subject, setSubject] = useState(exam?.subject || '');
    const [examDate, setExamDate] = useState(exam?.examDate || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name, subject, examDate });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exam Name</label>
                <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4 placeholder-gray-500 dark:placeholder-gray-400" placeholder="e.g. Midterm Physics" />
            </div>
            <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject (Optional)</label>
                <input type="text" id="subject" value={subject} onChange={e => setSubject(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4 placeholder-gray-500 dark:placeholder-gray-400" placeholder="e.g. Thermodynamics" />
            </div>
            <div>
                <label htmlFor="examDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exam Date (Optional)</label>
                <input type="date" id="examDate" value={examDate} onChange={e => setExamDate(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4" />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancel</button>
                <button type="submit" className="bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors">{exam ? 'Save Changes' : 'Create Exam'}</button>
            </div>
        </form>
    );
};

export default ExamForm;
