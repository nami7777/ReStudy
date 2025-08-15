

import React, { useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { Exam, Difficulty, View, AppState } from '../types';
import { formatDate } from '../utils/helpers';
import Modal from '../components/Modal';
import ExamForm from '../components/ExamForm';
import { PlusIcon, TrashIcon, PencilIcon, DownloadIcon, UploadIcon } from '../components/icons';

interface HomeScreenProps {
    setView: (view: View) => void;
    setCurrentExamId: (id: string) => void;
}

const HomeScreen = ({ setView, setCurrentExamId }: HomeScreenProps) => {
    const { exams, questions: allQuestions, addExam, updateExam, deleteExam, replaceData, mergeData } = useData();
    const [isExamFormModalOpen, setIsExamFormModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const importInputRef = useRef<HTMLInputElement>(null);

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [selectedExamIdsForExport, setSelectedExamIdsForExport] = useState<string[]>([]);
    
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importedData, setImportedData] = useState<AppState | null>(null);

    const handleFormSubmit = (examData: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (editingExam) {
            updateExam(editingExam.id, examData);
        } else {
            addExam(examData);
        }
        closeExamFormModal();
    };

    const openCreateExamModal = () => {
        setEditingExam(null);
        setIsExamFormModalOpen(true);
    };

    const openEditExamModal = (exam: Exam) => {
        setEditingExam(exam);
        setIsExamFormModalOpen(true);
    };

    const closeExamFormModal = () => {
        setIsExamFormModalOpen(false);
        setEditingExam(null);
    };

    const handleSelectExam = (examId: string) => {
        setCurrentExamId(examId);
        setView('exam-detail');
    };
    
    const handleToggleExportSelection = (examId: string) => {
        setSelectedExamIdsForExport(prev => 
            prev.includes(examId) ? prev.filter(id => id !== examId) : [...prev, examId]
        );
    };

    const handleToggleSelectAllForExport = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedExamIdsForExport(exams.map(ex => ex.id));
        } else {
            setSelectedExamIdsForExport([]);
        }
    };
    
    const handlePerformExport = () => {
        if (selectedExamIdsForExport.length === 0) {
            alert("Please select at least one exam to export.");
            return;
        }

        const selectedExams = exams.filter(ex => selectedExamIdsForExport.includes(ex.id));
        const selectedQuestions = allQuestions.filter(q => selectedExamIdsForExport.includes(q.examId));

        const dataToExport = {
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            data: {
                exams: selectedExams,
                questions: selectedQuestions,
            }
        };
        
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().slice(0, 10);
        const allSelected = selectedExamIdsForExport.length === exams.length;
        link.download = `restudy-backup-${allSelected ? 'all' : 'selected'}-${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setIsExportModalOpen(false);
        setSelectedExamIdsForExport([]);
    };

    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error('File could not be read.');
                const parsedData = JSON.parse(text);

                // Validation
                const importedState: AppState = parsedData.data;
                if (!importedState || !Array.isArray(importedState.exams) || !Array.isArray(importedState.questions)) {
                    throw new Error('Invalid backup file format.');
                }

                setImportedData(importedState);
                setIsImportModalOpen(true);

            } catch (error) {
                console.error('Import failed:', error);
                alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                if (event.target) {
                    event.target.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

    const handlePerformImport = (mode: 'merge' | 'overwrite') => {
        if (!importedData) return;

        if (mode === 'merge') {
            mergeData(importedData);
            alert('Data merged successfully!');
        } else {
            replaceData(importedData);
            alert('Data overwritten successfully!');
        }
        
        setIsImportModalOpen(false);
        setImportedData(null);
    };


    return (
        <div className="container mx-auto p-4 md:p-8">
            {exams.length === 0 ? (
                <div className="text-center py-20">
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">No exams yet.</h2>
                    <p className="text-gray-500 mt-2 mb-6">Create your first exam to start organizing questions.</p>
                    <button onClick={openCreateExamModal} className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                        + Create Exam
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exams.map(exam => {
                             const questions = allQuestions.filter(q => q.examId === exam.id);
                             const hardCount = questions.filter(q => q.difficulty === Difficulty.Hard).length;
                             const nightBeforeCount = questions.filter(q => q.difficulty === Difficulty.NightBefore).length;

                            return (
                                <div key={exam.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
                                    <div className="p-6 flex-grow">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{exam.name}</h3>
                                            <div className="flex space-x-2">
                                                 <button onClick={(e) => { e.stopPropagation(); openEditExamModal(exam); }} className="text-gray-400 hover:text-indigo-500 p-1 rounded-full"><PencilIcon className="w-5 h-5"/></button>
                                                 <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        if (window.confirm(`Are you sure you want to delete "${exam.name}"? This will also delete all its questions.`)) {
                                                            deleteExam(exam.id);
                                                        }
                                                    }}
                                                    className="text-gray-400 hover:text-red-500 p-1 rounded-full"
                                                    aria-label="Delete exam"
                                                  >
                                                    <TrashIcon className="w-5 h-5" />
                                                  </button>
                                            </div>
                                        </div>
                                        {exam.subject && <p className="text-indigo-500 dark:text-indigo-400 font-semibold mt-1">{exam.subject}</p>}
                                        {exam.examDate && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Due: {formatDate(exam.examDate)}</p>}
                                        <div className="mt-4 flex space-x-4 text-sm">
                                            <span className="text-gray-600 dark:text-gray-300">{questions.length} Questions</span>
                                            <span className="text-hard">{hardCount} Hard</span>
                                            <span className="text-night-before">{nightBeforeCount} Night-Before</span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4">
                                        <button onClick={() => handleSelectExam(exam.id)} className="w-full bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors duration-200">
                                            Open
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <button onClick={openCreateExamModal} className="fixed bottom-8 right-8 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-full p-4 shadow-2xl hover:scale-110 transform transition-transform duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-300">
                        <PlusIcon className="w-8 h-8"/>
                    </button>
                </>
            )}

            {exams.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Manage Data</h3>
                    <div className="flex items-center gap-4">
                         <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600">
                            <DownloadIcon className="w-5 h-5" /> Export Data
                        </button>
                        <input type="file" ref={importInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
                        <button onClick={handleImportClick} className="flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600">
                            <UploadIcon className="w-5 h-5" /> Import Data
                        </button>
                    </div>
                </div>
            )}

            <Modal isOpen={isExamFormModalOpen} onClose={closeExamFormModal} title={editingExam ? "Edit Exam" : "Create New Exam"}>
                <ExamForm exam={editingExam} onSubmit={handleFormSubmit} onCancel={closeExamFormModal} />
            </Modal>

            <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Export Exams">
                <div className="space-y-4">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                className="h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-indigo-600 focus:ring-indigo-500"
                                checked={exams.length > 0 && selectedExamIdsForExport.length === exams.length}
                                onChange={handleToggleSelectAllForExport}
                                aria-label="Select all exams"
                            />
                            <span className="font-semibold text-gray-800 dark:text-gray-200">Select All</span>
                        </label>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 p-1">
                        {exams.map(exam => (
                            <div key={exam.id} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-indigo-600 focus:ring-indigo-500"
                                        id={`exam-${exam.id}`}
                                        checked={selectedExamIdsForExport.includes(exam.id)}
                                        onChange={() => handleToggleExportSelection(exam.id)}
                                    />
                                    <span className="text-gray-700 dark:text-gray-300">{exam.name}</span>
                                </label>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={() => setIsExportModalOpen(false)} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancel</button>
                        <button 
                            type="button" 
                            onClick={handlePerformExport} 
                            disabled={selectedExamIdsForExport.length === 0}
                            className="bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed">
                                Export ({selectedExamIdsForExport.length})
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Options">
                <div>
                    <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg mb-6">
                        <p className="font-semibold">Backup file loaded:</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{importedData?.exams.length} exams and {importedData?.questions.length} questions</p>
                    </div>
                    <p className="text-center font-medium mb-4">How would you like to import this data?</p>
                    <div className="space-y-4">
                        <button onClick={() => handlePerformImport('merge')} className="w-full text-left p-4 rounded-lg border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                            <h4 className="font-bold text-blue-600 dark:text-blue-400">Merge with existing data</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Adds new exams and questions. Existing data will not be changed or deleted.</p>
                        </button>
                        <button onClick={() => {
                            if(window.confirm('ARE YOU SURE? This will delete all your current data before importing. This action cannot be undone.')) {
                                handlePerformImport('overwrite');
                            }
                        }} className="w-full text-left p-4 rounded-lg border-2 border-transparent hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                            <h4 className="font-bold text-red-600 dark:text-red-400">Overwrite existing data</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Deletes all current exams and questions and replaces them with the imported data.</p>
                        </button>
                    </div>
                    <div className="flex justify-end mt-6">
                        <button type="button" onClick={() => setIsImportModalOpen(false)} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancel</button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default HomeScreen;