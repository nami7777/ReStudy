
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Exam, Difficulty, View } from '../types';
import { formatDate } from '../utils/helpers';
import Modal from '../components/Modal';
import ExamForm from '../components/ExamForm';
import { PlusIcon, TrashIcon, PencilIcon } from '../components/icons';

interface HomeScreenProps {
    setView: (view: View) => void;
    setCurrentExamId: (id: string) => void;
}

const HomeScreen = ({ setView, setCurrentExamId }: HomeScreenProps) => {
    const { exams, questions: allQuestions, addExam, updateExam, deleteExam } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);

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
            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingExam ? "Edit Exam" : "Create New Exam"}>
                <ExamForm exam={editingExam} onSubmit={handleFormSubmit} onCancel={closeModal} />
            </Modal>
        </div>
    );
};

export default HomeScreen;