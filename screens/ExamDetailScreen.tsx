
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Question, Difficulty, View, Status, Tag, Exam } from '../types';
import { calculateHash, fileToBase64 } from '../utils/helpers';
import QuestionCard from '../components/QuestionCard';
import AnswerModal from '../components/AnswerModal';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import ExportModal from '../components/ExportModal';
import { DocumentAddIcon, TrashIcon, DownloadIcon } from '../components/icons';
import { TagManager } from '../components/TagManager';
import ImageZoomModal from '../components/ImageZoomModal';

declare const pdfjsLib: any;

interface ExamDetailScreenProps {
    examId: string;
    setView: (view: View) => void;
    setStudyQuestions: (questions: Question[]) => void;
    setStudyStartIndex: (index: number) => void;
}

const ExamDetailScreen = ({ examId, setView, setStudyQuestions, setStudyStartIndex }: ExamDetailScreenProps) => {
    const { exams, questions: allQuestions, tags: allTags, addQuestions, deleteQuestion, updateQuestion, deleteQuestions, updateQuestions } = useData();
    const exam = useMemo(() => exams.find(e => e.id === examId) as Exam, [exams, examId]);
    const tags = useMemo(() => allTags.filter(t => t.examId === examId), [allTags, examId]);
    const questions = useMemo(() =>
        allQuestions
            .filter(q => q.examId === examId)
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    , [allQuestions, examId]);
    
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [studyOrder, setStudyOrder] = useState<'forward' | 'reverse'>('forward');
    const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
    const [processingFiles, setProcessingFiles] = useState(0);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const [isImportingPdf, setIsImportingPdf] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [zoomedImageKey, setZoomedImageKey] = useState<string | null>(null);


    const [questionsToAnswerQueue, setQuestionsToAnswerQueue] = useState<Question[]>([]);
    const [currentQuestionForAnswer, setCurrentQuestionForAnswer] = useState<Question | null>(null);
    const [isEditingAnswer, setIsEditingAnswer] = useState(false);

    useEffect(() => {
        if (questionsToAnswerQueue.length > 0 && !currentQuestionForAnswer) {
            setCurrentQuestionForAnswer(questionsToAnswerQueue[0]);
        }
    }, [questionsToAnswerQueue, currentQuestionForAnswer]);

    const closeAnswerModal = () => {
        if (!isEditingAnswer) {
            setQuestionsToAnswerQueue(prev => prev.slice(1));
        }
        setCurrentQuestionForAnswer(null);
        setIsEditingAnswer(false);
    };

    const handleEditAnswer = (questionId: string) => {
        const questionToEdit = questions.find(q => q.id === questionId);
        if (questionToEdit) {
            setIsEditingAnswer(true);
            setCurrentQuestionForAnswer(questionToEdit);
        }
    };

    const handleFilterToggle = (filterKey: string) => {
        setActiveFilters(prev => {
            const newFilters = new Set(prev);
            if (newFilters.has(filterKey)) {
                newFilters.delete(filterKey);
            } else {
                newFilters.add(filterKey);
            }
            return Array.from(newFilters);
        });
    };

    const filteredQuestions = useMemo(() => {
        if (activeFilters.length === 0) return questions;
        return questions.filter(q => {
            const difficultyMatch = activeFilters.some(f => Object.values(Difficulty).includes(f as Difficulty) && q.difficulty === f);
            const statusMatch = activeFilters.includes(Status.New) && q.status === Status.New;
            const tagMatch = activeFilters.some(f => q.tags.includes(f));
            return difficultyMatch || statusMatch || tagMatch;
        });
    }, [questions, activeFilters]);


    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        setProcessingFiles(files.length);
        const questionHashes = new Set(questions.filter(q => q.type === 'image' && q.notes).map(q => q.notes));
        const newQuestionsData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = [];
        let skippedCount = 0;

        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue;

            const hash = await calculateHash(file);
            if (questionHashes.has(hash)) {
                skippedCount++;
                continue;
            }
            questionHashes.add(hash);
            
            const base64 = await fileToBase64(file);
            
            const newQuestion: Omit<Question, 'id' | 'createdAt' | 'updatedAt'> = {
                examId,
                type: 'image',
                imageUrl: base64,
                tags: [],
                status: Status.New,
                notes: hash
            };
            newQuestionsData.push(newQuestion);
        }
        
        if (newQuestionsData.length > 0) {
            const addedQuestions = await addQuestions(newQuestionsData);
            setQuestionsToAnswerQueue(prev => [...prev, ...addedQuestions]);
        }
        
        setProcessingFiles(0);
        if (newQuestionsData.length > 0) showToast(`Added ${newQuestionsData.length} questions.`);
        if (skippedCount > 0) showToast(`Skipped ${skippedCount} duplicate questions.`);
    }, [addQuestions, examId, questions]);

    const handlePdfFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImportingPdf(true);
        showToast('Importing from PDF...');

        const fileReader = new FileReader();
        fileReader.onload = async () => {
            try {
                const typedarray = new Uint8Array(fileReader.result as ArrayBuffer);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                const newQuestionsData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');

                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (!context) continue;
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    const imageUrl = canvas.toDataURL();
                    
                    if (pageText.trim() || imageUrl) {
                        const newQuestion: Omit<Question, 'id' | 'createdAt' | 'updatedAt'> = {
                            examId,
                            type: 'image',
                            imageUrl,
                            text: pageText.trim() || `Page ${i} from PDF`,
                            tags: [],
                            status: Status.New,
                        };
                        newQuestionsData.push(newQuestion);
                    }
                }
                if(newQuestionsData.length > 0) {
                    const addedQuestions = await addQuestions(newQuestionsData);
                    setQuestionsToAnswerQueue(prev => [...prev, ...addedQuestions]);
                    showToast(`Added ${addedQuestions.length} questions from PDF.`);
                }
            } catch (error) {
                console.error("Failed to process PDF:", error);
                showToast("Error importing PDF.");
            } finally {
                setIsImportingPdf(false);
                if (event.target) event.target.value = ''; // Reset file input
            }
        };
        fileReader.readAsArrayBuffer(file);
    };

    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            if (currentQuestionForAnswer || isExportModalOpen || zoomedImageKey) return; // Don't handle paste if a modal is open
            const items = event.clipboardData?.items;
            if (!items) return;
            const files = Array.from(items).filter(item => item.kind === 'file').map(item => item.getAsFile() as File);
            if(files.length > 0) {
                event.preventDefault();
                handleFiles(files);
            }
        };
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [handleFiles, currentQuestionForAnswer, isExportModalOpen, zoomedImageKey]);

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.currentTarget.classList.remove('border-indigo-500');
        handleFiles(event.dataTransfer.files);
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.currentTarget.classList.add('border-indigo-500');
    };
    
    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.currentTarget.classList.remove('border-indigo-500');
    };

    const handleSelectQuestion = (questionId: string) => {
        setSelectedQuestions(prev => 
            prev.includes(questionId) 
            ? prev.filter(id => id !== questionId) 
            : [...prev, questionId]
        );
    };
    
    const handleBulkDelete = () => {
        if(window.confirm(`Delete ${selectedQuestions.length} selected questions?`)) {
            deleteQuestions(selectedQuestions);
            setSelectedQuestions([]);
        }
    };
    
    const handleBulkUpdateDifficulty = (difficulty: Difficulty) => {
        updateQuestions(selectedQuestions, { difficulty, status: Status.Seen });
        setSelectedQuestions([]);
    };

    const startStudyMode = () => {
        if (filteredQuestions.length === 0) {
            alert("No questions in the current filter to study.");
            return;
        }
        
        const filterKey = activeFilters.join(',') || 'all';
        const progressKey = `restudy-progress-${examId}-${filterKey}`;
        const savedIndexStr = localStorage.getItem(progressKey);
        let startIndex = 0;

        if (savedIndexStr) {
            const savedIndex = parseInt(savedIndexStr, 10);
            if (window.confirm(`You left off at question ${savedIndex + 1} of your last session. Do you want to resume?`)) {
                startIndex = savedIndex;
            } else {
                localStorage.removeItem(progressKey);
            }
        }
        
        setStudyStartIndex(startIndex);

        let questionsToStudy = [...filteredQuestions];
        if (studyOrder === 'reverse') {
            questionsToStudy.reverse();
        }

        setStudyQuestions(questionsToStudy);
        setView('study-mode');
    };
    
    if (!exam) return <div className="text-center p-10">Exam not found. <button onClick={() => setView('home')} className="text-indigo-500">Go Home</button></div>;

    const counts = {
        all: questions.length,
        [Status.New]: questions.filter(q => q.status === Status.New).length,
        [Difficulty.Normal]: questions.filter(q => q.difficulty === Difficulty.Normal).length,
        [Difficulty.Hard]: questions.filter(q => q.difficulty === Difficulty.Hard).length,
        [Difficulty.NightBefore]: questions.filter(q => q.difficulty === Difficulty.NightBefore).length,
        ...tags.reduce((acc, tag) => ({ ...acc, [tag.id]: questions.filter(q => q.tags.includes(tag.id)).length }), {})
    };

    const filterOptions = [
      { id: 'all', label: 'All', count: counts.all },
      { id: Status.New, label: 'New', count: counts[Status.New], colorClass: 'bg-gray-500', activeClass: 'bg-gray-500 text-white' },
      { id: Difficulty.Normal, label: 'Normal', count: counts[Difficulty.Normal], colorClass: 'bg-normal', activeClass: 'bg-normal text-white' },
      { id: Difficulty.Hard, label: 'Hard', count: counts[Difficulty.Hard], colorClass: 'bg-hard', activeClass: 'bg-hard text-white' },
      { id: Difficulty.NightBefore, label: 'Night Before', count: counts[Difficulty.NightBefore], colorClass: 'bg-night-before', activeClass: 'bg-night-before text-white' },
    ];


    return (
        <div className="container mx-auto p-4 md:p-8">
             {zoomedImageKey && <ImageZoomModal imageKey={zoomedImageKey} onClose={() => setZoomedImageKey(null)} />}
            {currentQuestionForAnswer && (
                <AnswerModal 
                    question={currentQuestionForAnswer} 
                    onClose={closeAnswerModal} 
                    onSave={(answer) => {
                        updateQuestion(currentQuestionForAnswer.id, { answer, status: Status.Seen });
                        closeAnswerModal();
                    }}
                />
            )}
            {isExportModalOpen && (
                <ExportModal exam={exam} questions={questions} tags={tags} onClose={() => setIsExportModalOpen(false)} />
            )}
            <div className="flex items-center mb-6">
                <button onClick={() => setView('home')} className="text-indigo-500 hover:underline">Home</button>
                <span className="mx-2 text-gray-400">/</span>
                <h2 className="text-2xl font-bold">{exam.name}</h2>
            </div>
            
             <div className="flex justify-end mb-4">
                <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600">
                    <DownloadIcon className="w-5 h-5" /> Export Exam
                </button>
            </div>


            <div className="sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm py-4 z-10 flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                    {filterOptions.map(opt => (
                         <button key={opt.id} onClick={() => handleFilterToggle(opt.id)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${activeFilters.includes(opt.id) ? opt.activeClass : 'bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                            {opt.label} <span className="text-xs opacity-70">{opt.count}</span>
                        </button>
                    ))}
                     {tags.map(tag => (
                        <button key={tag.id} onClick={() => handleFilterToggle(tag.id)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 text-white shadow-md ${activeFilters.includes(tag.id) ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`} style={{ backgroundColor: tag.color }}>
                           {tag.name} <span className="text-xs opacity-70">{counts[tag.id] || 0}</span>
                        </button>
                    ))}
                </div>
                 <div className="flex items-center space-x-2">
                    <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg">
                        <button onClick={() => setStudyOrder('forward')} className={`px-3 py-2 text-sm font-semibold rounded-l-lg ${studyOrder === 'forward' ? 'bg-indigo-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Forward</button>
                        <button onClick={() => setStudyOrder('reverse')} className={`px-3 py-2 text-sm font-semibold rounded-r-lg ${studyOrder === 'reverse' ? 'bg-indigo-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Reverse</button>
                    </div>
                    <button onClick={startStudyMode} className="bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
                        Study
                    </button>
                 </div>
            </div>

            {selectedQuestions.length > 0 && (
                 <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-4 flex items-center justify-between animate-fadeIn">
                    <span className="font-semibold">{selectedQuestions.length} selected</span>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => handleBulkUpdateDifficulty(Difficulty.Normal)} className="px-3 py-1 text-sm bg-normal text-white rounded-full">Mark Normal</button>
                        <button onClick={() => handleBulkUpdateDifficulty(Difficulty.Hard)} className="px-3 py-1 text-sm bg-hard text-white rounded-full">Mark Hard</button>
                        <button onClick={() => handleBulkUpdateDifficulty(Difficulty.NightBefore)} className="px-3 py-1 text-sm bg-night-before text-white rounded-full">Mark Night-Before</button>
                        <button onClick={handleBulkDelete} className="p-2 text-gray-500 hover:text-red-500 rounded-full"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                </div>
            )}

            <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center mb-8 transition-colors">
                {processingFiles > 0 || isImportingPdf ? (
                    <div className="flex flex-col items-center justify-center">
                        <Spinner/>
                        <p className="mt-4 text-gray-500">{isImportingPdf ? 'Importing PDF...' : `Processing files...`}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400">Drag & drop images, or paste with Ctrl/Cmd+V</p>
                        <div className="flex items-center my-4">
                            <hr className="w-24 border-gray-300 dark:border-gray-600" />
                            <span className="mx-4 text-gray-400 text-sm">OR</span>
                            <hr className="w-24 border-gray-300 dark:border-gray-600" />
                        </div>
                        <input type="file" ref={pdfInputRef} onChange={handlePdfFile} accept=".pdf" className="hidden" />
                        <button onClick={() => pdfInputRef.current?.click()} className="flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600">
                           <DocumentAddIcon className="w-5 h-5" /> Import from PDF
                        </button>
                    </div>
                )}
            </div>

            {filteredQuestions.length === 0 && questions.length > 0 && (
                <div className="text-center py-10">
                    <h3 className="text-xl font-semibold">No questions match your filter.</h3>
                    <button onClick={() => setActiveFilters([])} className="mt-4 text-indigo-500 hover:underline">Clear all filters</button>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredQuestions.map(q => (
                    <QuestionCard
                        key={q.id}
                        question={q}
                        tags={tags}
                        onUpdate={updateQuestion}
                        onDelete={(id) => {
                            deleteQuestion(id);
                            setSelectedQuestions(prev => prev.filter(selId => selId !== id));
                        }}
                        onSelect={handleSelectQuestion}
                        isSelected={selectedQuestions.includes(q.id)}
                        onEditAnswer={handleEditAnswer}
                        onImageZoom={setZoomedImageKey}
                    />
                ))}
            </div>
            
            <div className="my-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Custom Tags for {exam.name}</h3>
                <TagManager examId={examId} />
            </div>

            {toastMessage && <Toast message={toastMessage} />}
        </div>
    );
};

export default ExamDetailScreen;