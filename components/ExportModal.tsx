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

const ALL_FILTERS = [Difficulty.Normal, Difficulty.Hard, Difficulty.NightBefore, Status.New];

const ExportModal = ({ exam, questions, tags, onClose }: ExportModalProps) => {
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [exportMessage, setExportMessage] = useState('');

    const allFilterOptions = useMemo(() => {
        const options = [...ALL_FILTERS, ...tags.map(t => t.id)];
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
        if (selectedFilters.length === 0) return [];
        return questions.filter(q => {
            if (selectedFilters.includes(q.difficulty)) return true;
            if (selectedFilters.includes(q.status)) return true;
            return q.tags.some(tagId => selectedFilters.includes(tagId));
        });
    }, [questions, selectedFilters]);

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
            alert("No questions selected for export.");
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
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Select questions to export</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose which question categories you want to include in the export file.</p>
                        
                        <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
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
