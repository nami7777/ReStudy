

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Question, Difficulty, View, Status } from '../types';
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/icons';
import AnswerDisplayModal from '../components/AnswerDisplayModal';
import { useStoredImage } from '../hooks/useStoredImage';
import Spinner from '../components/Spinner';
import ImageZoomModal from '../components/ImageZoomModal';

interface StudyModeScreenProps {
    initialQuestions: Question[];
    setView: (view: View) => void;
    updateQuestion: (id: string, data: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>) => void;
    examId: string;
    startIndex?: number;
}

const StudyModeScreen = ({ initialQuestions, setView, updateQuestion, examId, startIndex = 0 }: StudyModeScreenProps) => {
    const [questions, setQuestions] = useState(initialQuestions);
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [animationClass, setAnimationClass] = useState('animate-fadeIn');
    const [isFinished, setIsFinished] = useState(false);
    const [isAnswerVisible, setIsAnswerVisible] = useState(false);
    const [zoomedImageKey, setZoomedImageKey] = useState<string | null>(null);
    const swipeRef = useRef({ startX: 0, isSwiping: false });

    const progressKey = `restudy-progress-${examId}`; // Note: This key is simplified and doesn't account for filters.
    const currentQuestion = questions[currentIndex];
    const hasAnswer = !!currentQuestion?.answer && (!!currentQuestion.answer.text || (currentQuestion.answer.imageUrls && currentQuestion.answer.imageUrls.length > 0));

    useEffect(() => {
        // Persist progress
        localStorage.setItem(progressKey, currentIndex.toString());

        // Update status to 'seen' if it's 'new'
        if (currentQuestion?.status === Status.New) {
            updateQuestion(currentQuestion.id, { status: Status.Seen });
            // Optimistically update local state to avoid re-triggering
            setQuestions(qs => qs.map(q => q.id === currentQuestion.id ? {...q, status: Status.Seen} : q));
        }
    }, [currentIndex, progressKey, currentQuestion, updateQuestion]);

    const navigate = useCallback((direction: 'next' | 'prev') => {
        if (isAnswerVisible) setIsAnswerVisible(false);

        if (direction === 'next' && currentIndex === questions.length - 1) {
            setIsFinished(true);
            localStorage.removeItem(progressKey); // Clear progress on finish
            return;
        }

        setAnimationClass(direction === 'next' ? 'animate-slideOutLeft' : 'animate-slideOutRight');
        
        setTimeout(() => {
            setCurrentIndex(prev => {
                const newIndex = direction === 'next' ? prev + 1 : prev - 1;
                if (newIndex >= questions.length) return questions.length - 1;
                if (newIndex < 0) return 0;
                return newIndex;
            });
            setAnimationClass(direction === 'next' ? 'animate-slideInRight' : 'animate-slideInLeft');
        }, 300);
    }, [questions.length, currentIndex, isAnswerVisible, progressKey]);
    
    const handleTriage = (difficulty: Difficulty) => {
        if (!currentQuestion) return;
        updateQuestion(currentQuestion.id, { difficulty, status: Status.Seen });
        // Optimistically update local state for smoother UI
        const updatedQuestions = questions.map(q => q.id === currentQuestion.id ? {...q, difficulty, status: Status.Seen} : q);
        setQuestions(updatedQuestions);
        setTimeout(() => navigate('next'), 200);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isFinished || zoomedImageKey || isAnswerVisible) return;
            if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'l') navigate('next');
            if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'h') navigate('prev');
            if (e.key === '1') handleTriage(Difficulty.Normal);
            if (e.key === '2') handleTriage(Difficulty.Hard);
            if (e.key === '3') handleTriage(Difficulty.NightBefore);
            if (e.key === ' ' || e.key === 'Enter') {
                if(hasAnswer) {
                    e.preventDefault();
                    setIsAnswerVisible(v => !v);
                }
            }
            if (e.key === 'Escape') {
                 setView('exam-detail');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate, setView, handleTriage, isFinished, hasAnswer, isAnswerVisible, zoomedImageKey]);

    const handleTouchStart = (e: React.TouchEvent) => {
        swipeRef.current.startX = e.touches[0].clientX;
        swipeRef.current.isSwiping = true;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!swipeRef.current.isSwiping) return;
        const endX = e.changedTouches[0].clientX;
        const deltaX = endX - swipeRef.current.startX;

        if (Math.abs(deltaX) > 50) { // Swipe threshold
            if (deltaX < 0) navigate('next');
            else navigate('prev');
        }
        swipeRef.current.isSwiping = false;
    };
    
    const handlePracticeFlagged = () => {
        const flaggedQuestions = initialQuestions.filter(q => q.difficulty === Difficulty.Hard || q.difficulty === Difficulty.NightBefore);
        if (flaggedQuestions.length === 0) {
            alert("You have no 'Hard' or 'Night-Before' questions to practice!");
            return;
        }
        setQuestions(flaggedQuestions);
        setCurrentIndex(0);
        setIsFinished(false);
        setAnimationClass('animate-fadeIn');
    };

    const handleRestart = () => {
        localStorage.removeItem(progressKey);
        setQuestions(initialQuestions);
        setCurrentIndex(0);
        setIsFinished(false);
        setAnimationClass('animate-fadeIn');
    };

    const QuestionImage = ({ imageUrl, onImageClick }: { imageUrl: string, onImageClick: (url: string) => void }) => {
        const { src, isLoading } = useStoredImage(imageUrl);
        if (isLoading) {
            return (
                <div className="w-full h-full flex justify-center items-center">
                    <Spinner />
                </div>
            );
        }
        return (
            <button onClick={() => onImageClick(imageUrl)} className="w-full h-full flex justify-center items-center cursor-zoom-in">
                <img src={src} alt="Question" className="max-w-full max-h-full object-contain rounded-lg"/>
            </button>
        );
    }


    if (isFinished) {
        return (
             <div className="fixed inset-0 bg-gray-900 flex flex-col justify-center items-center text-white z-50 p-4 animate-fadeIn">
                <h2 className="text-4xl font-bold text-green-400 mb-4">Congratulations!</h2>
                <p className="text-lg text-gray-300 mb-8">You've completed your study session.</p>
                <div className="flex flex-col md:flex-row gap-4">
                    <button onClick={handlePracticeFlagged} className="bg-yellow-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-yellow-600 transition-colors">
                        Practice Flagged Questions
                    </button>
                    <button onClick={handleRestart} className="bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors">
                        Restart Session
                    </button>
                    <button onClick={() => setView('home')} className="bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors">
                        Return Home
                    </button>
                </div>
            </div>
        )
    }

    if (!currentQuestion) {
        return (
            <div className="fixed inset-0 bg-gray-900 flex flex-col justify-center items-center text-white z-50">
                <p>No questions to study.</p>
                <button onClick={() => setView('exam-detail')} className="mt-4 px-4 py-2 bg-indigo-500 rounded-lg">Exit</button>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-gray-900 flex flex-col text-white z-50 p-4 overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {zoomedImageKey && <ImageZoomModal imageKey={zoomedImageKey} onClose={() => setZoomedImageKey(null)} />}
            {isAnswerVisible && currentQuestion.answer && (
                <AnswerDisplayModal answer={currentQuestion.answer} onClose={() => setIsAnswerVisible(false)} />
            )}
            <div className="absolute top-4 left-4 text-lg font-mono">{currentIndex + 1} / {questions.length}</div>
            <button onClick={() => setView('exam-detail')} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20">
                <XIcon />
            </button>

            <main className="flex-1 flex justify-center items-center min-h-0 w-full max-w-6xl mx-auto">
                <div className={`w-full h-full flex justify-center items-center ${animationClass}`}>
                    {currentQuestion.imageUrl ? (
                        <QuestionImage imageUrl={currentQuestion.imageUrl} onImageClick={setZoomedImageKey} />
                    ) : (
                        <p className="text-2xl p-8 bg-gray-800 rounded-lg">{currentQuestion.text}</p>
                    )}
                </div>
            </main>
            
            <footer className="flex-shrink-0 flex justify-center items-center gap-2 md:gap-8 pt-4">
                <button onClick={() => handleTriage(Difficulty.Normal)} className="flex flex-col items-center gap-2 text-normal hover:text-green-300 transition-colors p-2 rounded-lg hover:bg-white/10">
                    <span className="text-2xl">✅</span><span className="text-xs font-semibold">Got It (1)</span>
                </button>
                <button onClick={() => handleTriage(Difficulty.Hard)} className="flex flex-col items-center gap-2 text-hard hover:text-yellow-300 transition-colors p-2 rounded-lg hover:bg-white/10">
                    <span className="text-2xl">🤔</span><span className="text-xs font-semibold">Hard (2)</span>
                </button>
                <button onClick={() => handleTriage(Difficulty.NightBefore)} className="flex flex-col items-center gap-2 text-night-before hover:text-pink-400 transition-colors p-2 rounded-lg hover:bg-white/10">
                    <span className="text-2xl">🔥</span><span className="text-xs font-semibold">Night Before (3)</span>
                </button>
                 {hasAnswer && (
                    <button onClick={() => setIsAnswerVisible(true)} className="flex flex-col items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors p-2 rounded-lg hover:bg-white/10">
                        <span className="text-2xl">💡</span><span className="text-xs font-semibold">Answer (Space)</span>
                    </button>
                 )}
            </footer>
            
             <button onClick={() => navigate('prev')} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 rounded-full hover:bg-white/20 hidden md:block" aria-label="Previous Question"><ChevronLeftIcon /></button>
             <button onClick={() => navigate('next')} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 rounded-full hover:bg-white/20 hidden md:block" aria-label="Next Question"><ChevronRightIcon /></button>

        </div>
    );
};

export default StudyModeScreen;