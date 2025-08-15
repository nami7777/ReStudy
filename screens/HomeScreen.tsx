
import React, { useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { Exam, Difficulty, View, AppState } from '../types';
import { formatDate } from '../utils/helpers';
import Modal from '../components/Modal';
import ExamForm from '../components/ExamForm';
import { PlusIcon, TrashIcon, PencilIcon, DownloadIcon, UploadIcon } from '../components/icons';
import { getImage } from '../services/imageStore';

interface ImportDataModalProps {
    onClose: () => void;
    onMerge: (data: AppState) => void;
    onOverwrite: (data: AppState) => void;
    importedData: AppState;
}

const ImportDataModal = ({ onClose, onMerge, onOverwrite, importedData }: ImportDataModalProps) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 m-4 w-full max-w-md transform transition-all animate-slideInUp`} onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Import Options</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">You are importing a backup file. How would you like to proceed?</p>
                <div className="space-y-4">
                    <button
                        onClick={() => onMerge(importedData)}
                        className="w-full text-left p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Merge with existing data</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Adds new items and updates existing ones based on their ID. Does not delete anything.</p>
                    </button>
                    <button
                        onClick={() => onOverwrite(importedData)}
                        className="w-full text-left p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Overwrite existing data</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Warning: Deletes all current data before importing. This cannot be undone.</p>
                    </button>
                </div>
                <div className="flex justify-end mt-6">
                     <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancel</button>
                </div>
            </div>
        </div>
    );
};

interface HomeScreenProps {
    setView: (view: View) => void;
    setCurrentExamId: (id: string) => void;
}

const isImageKey = (url?: string): url is string => !!url && url.startsWith('idb://');

const HomeScreen = ({ setView, setCurrentExamId }: HomeScreenProps) => {
    const { exams, questions: allQuestions, tags, addExam, updateExam, deleteExam, replaceData, mergeData } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [importedData, setImportedData] = useState<AppState | null>(null);
    const importInputRef = useRef<HTMLInputElement>(null);

    const handleFormSubmit = (examData: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (editingExam) {
            updateExam(editingExam.id, examData);
        } else {
            addExam(examData);
        }
        closeModal();
    };

    const openCreateModal = () => {
        setEditingExam(null);
        setIsModalOpen(true);
    };

    const openEditModal = (exam: Exam) => {
        setEditingExam(exam);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingExam(null);
    };

    const handleSelectExam = (examId: string) => {
        setCurrentExamId(examId);
        setView('exam-detail');
    };
    
    const handleExport = async () => {
        // Deep copy data to avoid modifying state
        const questionsWithImages = await Promise.all(
            JSON.parse(JSON.stringify(allQuestions)).map(async (q: any) => {
                if(isImageKey(q.imageUrl)) {
                    q.imageUrl = await getImage(q.imageUrl);
                }
                if(q.answer?.imageUrls) {
                    q.answer.imageUrls = await Promise.all(
                        q.answer.imageUrls.map((url: string) => isImageKey(url) ? getImage(url) : url)
                    );
                }
                return q;
            })
        );
        
        const dataToExport = {
            version: '1.3.0', // Updated version for scoped tags
            createdAt: new Date().toISOString(),
            data: {
                exams,
                questions: questionsWithImages,
                tags,
            }
        };
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().slice(0, 10);
        link.download = `restudy-backup-${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error('File could not be read.');
                const parsedJson = JSON.parse(text);
                const appState: AppState = parsedJson.data;


                // Validation
                if (!appState || !Array.isArray(appState.exams) || !Array.isArray(appState.questions)) {
                    throw new Error('Invalid backup file format.');
                }
                
                const validatedAppState: AppState = {
                    exams: appState.exams,
                    questions: appState.questions,
                    tags: appState.tags || [],
                };
                setImportedData(validatedAppState);

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

    const handleMerge = async (data: AppState) => {
        await mergeData(data);
        setImportedData(null);
        alert('Data merged successfully!');
    };

    const handleOverwrite = async (data: AppState) => {
        await replaceData(data);
        setImportedData(null);
        alert('Data overwritten successfully!');
    };


    return (
        <div className="container mx-auto p-4 md:p-8">
            {exams.length === 0 ? (
                <div className="text-center py-20">
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">No exams yet.</h2>
                    <p className="text-gray-500 mt-2 mb-6">Create your first exam to start organizing questions.</p>
                    <button onClick={openCreateModal} className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300">
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
                                                 <button onClick={(e) => { e.stopPropagation(); openEditModal(exam); }} className="text-gray-400 hover:text-indigo-500 p-1 rounded-full"><PencilIcon className="w-5 h-5"/></button>
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
                    <button onClick={openCreateModal} className="fixed bottom-8 right-8 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-full p-4 shadow-2xl hover:scale-110 transform transition-transform duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-300">
                        <PlusIcon className="w-8 h-8"/>
                    </button>
                </>
            )}

            {exams.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 space-y-8">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Manage Data</h3>
                        <div className="flex items-center gap-4">
                            <button onClick={handleExport} className="flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600">
                                <DownloadIcon className="w-5 h-5" /> Export Data
                            </button>
                            <input type="file" ref={importInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
                            <button onClick={handleImportClick} className="flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600">
                                <UploadIcon className="w-5 h-5" /> Import Data
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingExam ? "Edit Exam" : "Create New Exam"}>
                <ExamForm exam={editingExam} onSubmit={handleFormSubmit} onCancel={closeModal} />
            </Modal>

            {importedData && (
                <ImportDataModal
                    importedData={importedData}
                    onClose={() => setImportedData(null)}
                    onMerge={handleMerge}
                    onOverwrite={handleOverwrite}
                />
            )}
        </div>
    );
};

export default HomeScreen;