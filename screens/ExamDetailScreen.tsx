

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Question, Difficulty, View, Status } from '../types';
import { calculateHash, fileToBase64, base64ToBlob } from '../utils/helpers';
import QuestionCard from '../components/QuestionCard';
import AnswerModal from '../components/AnswerModal';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import { DocumentAddIcon, TrashIcon } from '../components/icons';

declare const jspdf: any;
declare const JSZip: any;
declare const pdfjsLib: any;

interface ExamDetailScreenProps {
    examId: string;
    setView: (view: View) => void;
    setStudyQuestions: (questions: Question[]) => void;
}

const ExamDetailScreen = ({ examId, setView, setStudyQuestions }: ExamDetailScreenProps) => {
    const { exams, questions: allQuestions, addQuestions, deleteQuestion, updateQuestion, deleteQuestions, updateQuestions } = useData();
    const exam = useMemo(() => exams.find(e => e.id === examId), [exams, examId]);
    const questions = useMemo(() =>
        allQuestions
            .filter(q => q.examId === examId)
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    , [allQuestions, examId]);
    
    const [filter, setFilter] = useState<Difficulty | 'all'>('all');
    const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
    const [processingFiles, setProcessingFiles] = useState(0);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const [isImportingPdf, setIsImportingPdf] = useState(false);

    const [questionsToAnswerQueue, setQuestionsToAnswerQueue] = useState<Question[]>([]);
    const [currentQuestionForAnswer, setCurrentQuestionForAnswer] = useState<Question | null>(null);

    useEffect(() => {
        if (questionsToAnswerQueue.length > 0 && !currentQuestionForAnswer) {
            setCurrentQuestionForAnswer(questionsToAnswerQueue[0]);
        }
    }, [questionsToAnswerQueue, currentQuestionForAnswer]);

    const closeAnswerModal = () => {
        setCurrentQuestionForAnswer(null);
        setQuestionsToAnswerQueue(prev => prev.slice(1));
    };

    const filteredQuestions = useMemo(() => {
        return filter === 'all' ? questions : questions.filter(q => q.difficulty === filter);
    }, [questions, filter]);

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
                difficulty: Difficulty.Normal,
                status: Status.New,
                notes: hash
            };
            newQuestionsData.push(newQuestion);
        }
        
        if (newQuestionsData.length > 0) {
            const addedQuestions = addQuestions(newQuestionsData);
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
                            tags: ['pdf-import'],
                            difficulty: Difficulty.Normal,
                            status: Status.New,
                        };
                        newQuestionsData.push(newQuestion);
                    }
                }
                if(newQuestionsData.length > 0) {
                    const addedQuestions = addQuestions(newQuestionsData);
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
            if (currentQuestionForAnswer) return; // Don't handle paste if answer modal is open
            const items = event.clipboardData?.items;
            if (!items) return;
            const files = Array.from(items).filter(item => item.kind === 'file').map(item => item.getAsFile() as File);
            if(files.length > 0) handleFiles(files);
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handleFiles, currentQuestionForAnswer]);

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
        updateQuestions(selectedQuestions, { difficulty });
        setSelectedQuestions([]);
    };

    const startStudyMode = () => {
        if (filteredQuestions.length === 0) {
            alert("No questions in the current filter to study.");
            return;
        }
        setStudyQuestions(filteredQuestions);
        setView('study-mode');
    };
    
    const handleExport = async (format: 'pdf' | 'zip') => {
        if (filteredQuestions.length === 0) {
            showToast("No questions to export.");
            return;
        }
    
        const { jsPDF } = jspdf;
        showToast(`Exporting as ${format.toUpperCase()}...`);
    
        if (format === 'pdf') {
            const doc = new jsPDF();
            for (let i = 0; i < filteredQuestions.length; i++) {
                const q = filteredQuestions[i];
                if (i > 0) doc.addPage();
                doc.text(q.text || `Question ${i + 1}`, 10, 10);
                if (q.imageUrl) {
                    try {
                        doc.addImage(q.imageUrl, 'JPEG', 15, 40, 180, 160, undefined, 'FAST');
                    } catch (e) {
                        console.error("Error adding image to PDF:", e);
                        doc.text("Error rendering image.", 15, 40);
                    }
                }
            }
            doc.save(`${exam?.name || 'exam'}-export.pdf`);
        } else if (format === 'zip') {
            const zip = new JSZip();
            const manifest = ["id,type,difficulty,text,tags"];
            for (const q of filteredQuestions) {
                manifest.push([q.id, q.type, q.difficulty, `"${q.text || ''}"`, q.tags.join(';')].join(','));
                if (q.imageUrl) {
                    const blob = await base64ToBlob(q.imageUrl);
                    zip.file(`question-${q.id}.png`, blob);
                }
            }
            zip.file('manifest.csv', manifest.join('\n'));
            zip.generateAsync({ type: "blob" }).then(content => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `${exam?.name || 'exam'}-export.zip`;
                link.click();
                URL.revokeObjectURL(link.href);
            });
        }
    };

    if (!exam) return <div className="text-center p-10">Exam not found. <button onClick={() => setView('home')} className="text-indigo-500">Go Home</button></div>;

    const counts = {
        all: questions.length,
        [Difficulty.Normal]: questions.filter(q => q.difficulty === Difficulty.Normal).length,
        [Difficulty.Hard]: questions.filter(q => q.difficulty === Difficulty.Hard).length,
        [Difficulty.NightBefore]: questions.filter(q => q.difficulty === Difficulty.NightBefore).length,
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            {currentQuestionForAnswer && (
                <AnswerModal 
                    question={currentQuestionForAnswer} 
                    onClose={closeAnswerModal} 
                    onSave={(answer) => {
                        updateQuestion(currentQuestionForAnswer.id, { answer });
                        closeAnswerModal();
                    }}
                />
            )}
            <div className="flex items-center mb-6">
                <button onClick={() => setView('home')} className="text-indigo-500 hover:underline">Home</button>
                <span className="mx-2 text-gray-400">/</span>
                <h2 className="text-2xl font-bold">{exam.name}</h2>
            </div>

            <div className="sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm py-4 z-10 flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center space-x-2">
                    {(['all', Difficulty.Normal, Difficulty.Hard, Difficulty.NightBefore] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === f ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                            {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')} <span className="text-xs opacity-70">{counts[f]}</span>
                        </button>
                    ))}
                </div>
                 <div className="flex items-center space-x-2">
                    <button onClick={() => handleExport('pdf')} className="px-4 py-2 text-sm font-semibold bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg">Export PDF</button>
                    <button onClick={() => handleExport('zip')} className="px-4 py-2 text-sm font-semibold bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg">Export ZIP</button>
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
                        <p className="mt-4 text-gray-500">{isImportingPdf ? 'Importing PDF...' : `Processing ${processingFiles} files...`}</p>
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
                    <button onClick={() => setFilter('all')} className="mt-4 text-indigo-500 hover:underline">Clear filter</button>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredQuestions.map(q => (
                    <QuestionCard
                        key={q.id}
                        question={q}
                        onUpdate={updateQuestion}
                        onDelete={(id) => {
                            deleteQuestion(id);
                            setSelectedQuestions(prev => prev.filter(selId => selId !== id));
                        }}
                        onSelect={handleSelectQuestion}
                        isSelected={selectedQuestions.includes(q.id)}
                    />
                ))}
            </div>

            {toastMessage && <Toast message={toastMessage} />}
        </div>
    );
};

export default ExamDetailScreen;