
import React, { useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { Exam, Difficulty, View, AppState } from '../types';
import { formatDate } from '../utils/helpers';
import Modal from '../components/Modal';
import ExamForm from '../components/ExamForm';
import { PlusIcon, TrashIcon, PencilIcon, DownloadIcon, UploadIcon } from '../components/icons';
import { getImage } from '../services/imageStore';
import { TagManager } from '../components/TagManager';

interface HomeScreenProps {
    setView: (view: View) => void;
    setCurrentExamId: (id: string) => void;
}

const isImageKey = (url?: string): url is string => !!url && url.startsWith('idb://');

const HomeScreen = ({ setView, setCurrentExamId }: HomeScreenProps) => {
    const { exams, questions: allQuestions, tags, addExam, updateExam, deleteExam, replaceData } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
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
            version: '1.2.0', // Updated version for tags
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
                const parsedData = JSON.parse(text);

                // Validation
                const importedData: AppState = parsedData.data;
                if (!importedData || !Array.isArray(importedData.exams) || !Array.isArray(importedData.questions)) {
                    throw new Error('Invalid backup file format.');
                }

                if (window.confirm('Are you sure you want to import this data? This will overwrite all your current exams and questions.')) {
                    await replaceData({ exams: importedData.exams, questions: importedData.questions, tags: importedData.tags || [] });
                    alert('Data imported successfully!');
                }
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
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Custom Tags</h3>
                        <TagManager />
                    </div>
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
        </div>
    );
};

export default HomeScreen;