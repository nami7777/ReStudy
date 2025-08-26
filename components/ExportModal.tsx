import React, { useState, useEffect, useMemo } from 'react';
import { Exam, Question, Tag, Difficulty, Status } from '../types';
import { exportExamAsJson, exportExamAsPdf } from '../utils/export';
import Modal from './Modal';
import Spinner from './Spinner';

interface ExportModalProps {
    exam: Exam;
    questions: Question[];
    tags: Tag[];
    onClose: () => void;
}

const ALL_DIFFICULTY_STATUS_FILTERS = [Difficulty.Normal, Difficulty.Hard, Difficulty.NightBefore, Status.New];

const ExportModal = ({ exam, questions, tags, onClose }: ExportModalProps) => {
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [exportMessage, setExportMessage] = useState('');
    const [tagFilterLogic, setTagFilterLogic] = useState<'union' | 'intersection'>('union');

    const allFilterOptions = useMemo(() => {
        const options = [...ALL_DIFFICULTY_STATUS_FILTERS, ...tags.map(t => t.id)];
        return options;
    }, [tags]);

    useEffect(() => {
        // Initially, select all filters
        setSelectedFilters(allFilterOptions);
    }, [allFilterOptions]);

    const handleToggleFilter = (filterId: string) => {
        setSelectedFilters(prev =>
            prev.includes(filterId)
                ? prev.filter(id => id !== filterId)
                : [...prev, filterId]
        );
    };

    const handleToggleAll = () => {
        if (selectedFilters.length === allFilterOptions.length) {
            setSelectedFilters([]);
        } else {
            setSelectedFilters(allFilterOptions);
        }
    };

    const questionsToExport = useMemo(() => {
        const selectedTagFilters = selectedFilters.filter(f => tags.some(t => t.id === f));
        const selectedDifficultyStatusFilters = selectedFilters.filter(f => ALL_DIFFICULTY_STATUS_FILTERS.includes(f as any));
        
        // If the user has deselected all filters in either category, treat that category as "passing" all questions.
        // This makes the filtering behave like an AND condition across categories.
        return questions.filter(q => {
            const difficultyStatusCriteriaMet = selectedDifficultyStatusFilters.length === 0 ||
                selectedDifficultyStatusFilters.some(f => f === q.difficulty || f === q.status);
            
            const tagCriteriaMet = selectedTagFilters.length === 0 ||
                (tagFilterLogic === 'intersection'
                    ? selectedTagFilters.every(tagId => q.tags.includes(tagId))
                    : selectedTagFilters.some(tagId => q.tags.includes(tagId))
                );
            
            return difficultyStatusCriteriaMet && tagCriteriaMet;
        });
    }, [questions, selectedFilters, tags, tagFilterLogic]);

    const getFilterLabel = (filterId: string) => {
        switch (filterId) {
            case Difficulty.Normal: return 'Normal';
            case Difficulty.Hard: return 'Hard';
            case Difficulty.NightBefore: return 'Night Before';
            case Status.New: return 'New';
            default: return tags.find(t => t.id === filterId)?.name || 'Unknown Tag';
        }
    };

    const handleExport = async (format: 'json' | 'pdf') => {
        if (questionsToExport.length === 0) {
            alert("No questions match the selected filters for export.");
            return;
        }
        setIsExporting(true);
        setExportMessage(`Exporting ${questionsToExport.length} questions as ${format.toUpperCase()}...`);
        try {
            if (format === 'json') {
                await exportExamAsJson(exam, questionsToExport, tags);
            } else {
                await exportExamAsPdf(exam, questionsToExport);
            }
        } catch (error) {
            console.error(`Export failed:`, error);
            alert(`An error occurred during export. See console for details.`);
        } finally {
            setIsExporting(false);
            setExportMessage('');
            onClose();
        }
    };


    return (
        <Modal isOpen={true} onClose={onClose} title={`Export Exam: ${exam.name}`}>
            {isExporting ? (
                 <div className="flex flex-col items-center justify-center space-y-4 p-8">
                    <Spinner />
                    <p className="text-lg text-gray-600 dark:text-gray-300">{exportMessage}</p>
                 </div>
            ) : (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">1. Select questions to export</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose which question categories you want to include. A question must match a selected difficulty/status AND the selected tag criteria.</p>
                        
                        <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
                             <label className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer font-bold">
                                <input
                                    type="checkbox"
                                    checked={selectedFilters.length === allFilterOptions.length}
                                    onChange={handleToggleAll}
                                    className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700"
                                />
                                <span>Select All / Deselect All</span>
                            </label>
                            <hr className="border-gray-300 dark:border-gray-600"/>
                            {allFilterOptions.map(filterId => (
                                <label key={filterId} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedFilters.includes(filterId)}
                                        onChange={() => handleToggleFilter(filterId)}
                                        className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700"
                                    />
                                    <span>{getFilterLabel(filterId)}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                         <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">2. Set tag matching logic</h3>
                         <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                            <button 
                                onClick={() => setTagFilterLogic('union')} 
                                className={`flex-1 px-3 py-1 text-sm font-semibold rounded-md transition-colors ${tagFilterLogic === 'union' ? 'bg-indigo-500 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                            >
                                Match Any Tag
                            </button>
                            <button 
                                onClick={() => setTagFilterLogic('intersection')} 
                                className={`flex-1 px-3 py-1 text-sm font-semibold rounded-md transition-colors ${tagFilterLogic === 'intersection' ? 'bg-indigo-500 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                            >
                                Match All Tags
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-1">
                            {tagFilterLogic === 'union' 
                                ? "Includes questions with at least one of the selected tags."
                                : "Includes only questions that have ALL of the selected tags."
                            }
                        </p>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-center font-semibold text-gray-700 dark:text-gray-300 mb-4">{questionsToExport.length} questions selected</p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => handleExport('json')} className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50" disabled={questionsToExport.length === 0}>
                                Export as JSON
                            </button>
                            <button onClick={() => handleExport('pdf')} className="bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50" disabled={questionsToExport.length === 0}>
                                Export as PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default ExportModal;
