import React, { useState, useEffect } from 'react';
import { Question, View } from './types';
import { DataProvider, useData } from './contexts/DataContext';
import Header from './components/Header';
import HomeScreen from './screens/HomeScreen';
import ExamDetailScreen from './screens/ExamDetailScreen';
import StudyModeScreen from './screens/StudyModeScreen';

function AppContent() {
    const [view, setView] = useState<View>('home');
    const [currentExamId, setCurrentExamId] = useState<string | null>(null);
    const [studyQuestions, setStudyQuestions] = useState<Question[]>([]);
    
    const [isDarkMode, setIsDarkMode] = useState(() => 
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    );

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(prev => !prev);
    
    const renderContent = () => {
        switch (view) {
            case 'exam-detail':
                if (currentExamId) return <ExamDetailScreen examId={currentExamId} setView={setView} setStudyQuestions={setStudyQuestions}/>;
                setView('home'); // fallback
                return null;
            case 'home':
            default:
                return <HomeScreen setView={setView} setCurrentExamId={setCurrentExamId} />;
        }
    };
    
    // Using a separate component to access the context hook
    const DataUpdaterForStudyMode = () => {
        const { updateQuestion } = useData();
        return view === 'study-mode' ? <StudyModeScreen initialQuestions={studyQuestions} setView={setView} updateQuestion={updateQuestion}/> : null;
    }

    return (
        <main className="min-h-screen">
            <Header setView={setView} toggleTheme={toggleTheme} isDarkMode={isDarkMode}/>
            <div key={view + (currentExamId || '')} className="animate-fadeIn">
              {view !== 'study-mode' && renderContent()}
            </div>
            <DataUpdaterForStudyMode />
        </main>
    );
}

function App() {
    return (
        <DataProvider>
            <AppContent />
        </DataProvider>
    );
}

export default App;
