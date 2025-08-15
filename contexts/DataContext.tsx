
import React, { createContext, useContext, ReactNode, useReducer, useEffect, useCallback } from 'react';
import { Exam, Question } from '../types';

// 1. Define State and Actions
interface AppState {
    exams: Exam[];
    questions: Question[];
}

type Action =
    | { type: 'ADD_EXAM'; payload: Exam }
    | { type: 'UPDATE_EXAM'; payload: { examId: string; data: Partial<Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>> } }
    | { type: 'DELETE_EXAM'; payload: { examId: string } }
    | { type: 'ADD_QUESTIONS'; payload: Question[] }
    | { type: 'UPDATE_QUESTION'; payload: { questionId: string; data: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>> } }
    | { type: 'DELETE_QUESTION'; payload: { questionId: string } }
    | { type: 'DELETE_QUESTIONS'; payload: { questionIds: string[] } }
    | { type: 'UPDATE_QUESTIONS'; payload: { questionIds: string[]; data: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>> } };

// 2. Define Context Type (what consumers get)
interface DataContextType {
    exams: Exam[];
    questions: Question[];
    addExam: (examData: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateExam: (examId: string, examData: Partial<Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>>) => void;
    deleteExam: (examId: string) => void;
    addQuestions: (questionsData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[]) => Question[];
    updateQuestion: (questionId: string, questionData: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>) => void;
    deleteQuestion: (questionId: string) => void;
    deleteQuestions: (questionIds: string[]) => void;
    updateQuestions: (questionIds: string[], questionData: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("useData must be used within a DataProvider");
    return context;
};

// 3. Create the Reducer
const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'ADD_EXAM':
            return { ...state, exams: [...state.exams, action.payload] };
        
        case 'UPDATE_EXAM':
            return {
                ...state,
                exams: state.exams.map(e => e.id === action.payload.examId ? { ...e, ...action.payload.data, updatedAt: new Date().toISOString() } : e)
            };
        
        case 'DELETE_EXAM':
            return {
                ...state,
                exams: state.exams.filter(e => e.id !== action.payload.examId),
                questions: state.questions.filter(q => q.examId !== action.payload.examId) // Cascade delete
            };
        
        case 'ADD_QUESTIONS':
            return { ...state, questions: [...state.questions, ...action.payload] };
        
        case 'UPDATE_QUESTION':
            return {
                ...state,
                questions: state.questions.map(q => q.id === action.payload.questionId ? { ...q, ...action.payload.data, updatedAt: new Date().toISOString() } : q)
            };
        
        case 'DELETE_QUESTION':
            return {
                ...state,
                questions: state.questions.filter(q => q.id !== action.payload.questionId)
            };
        
        case 'DELETE_QUESTIONS': {
            const idSetDelete = new Set(action.payload.questionIds);
            return { ...state, questions: state.questions.filter(q => !idSetDelete.has(q.id)) };
        }
        
        case 'UPDATE_QUESTIONS': {
            const idSetUpdate = new Set(action.payload.questionIds);
            return {
                ...state,
                questions: state.questions.map(q => idSetUpdate.has(q.id) ? { ...q, ...action.payload.data, updatedAt: new Date().toISOString() } : q)
            };
        }
        
        default:
            return state;
    }
};

// 4. Create the Provider Component
const initializer = (): AppState => {
    try {
        const storedExams = localStorage.getItem('exams');
        const storedQuestions = localStorage.getItem('questions');
        return {
            exams: storedExams ? JSON.parse(storedExams) : [],
            questions: storedQuestions ? JSON.parse(storedQuestions) : [],
        };
    } catch (error) {
        console.error("Error reading from localStorage", error);
        return { exams: [], questions: [] };
    }
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(appReducer, undefined, initializer);

    useEffect(() => {
        try {
            localStorage.setItem('exams', JSON.stringify(state.exams));
            localStorage.setItem('questions', JSON.stringify(state.questions));
        } catch (error) {
            console.error("Error writing to localStorage", error);
        }
    }, [state]);
    
    // Create memoized action creators that dispatch actions
    const addExam = useCallback((examData: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newExam: Exam = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...examData
        };
        dispatch({ type: 'ADD_EXAM', payload: newExam });
    }, []);

    const updateExam = useCallback((examId: string, data: Partial<Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>>) => {
        dispatch({ type: 'UPDATE_EXAM', payload: { examId, data } });
    }, []);
    
    const deleteExam = useCallback((examId: string) => {
        dispatch({ type: 'DELETE_EXAM', payload: { examId } });
    }, []);
    
    const addQuestions = useCallback((questionsData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[]): Question[] => {
        const newQuestions: Question[] = questionsData.map(q => ({
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...q
        }));
        if(newQuestions.length > 0) {
            dispatch({ type: 'ADD_QUESTIONS', payload: newQuestions });
        }
        return newQuestions;
    }, []);

    const updateQuestion = useCallback((questionId: string, data: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>) => {
        dispatch({ type: 'UPDATE_QUESTION', payload: { questionId, data } });
    }, []);
    
    const deleteQuestion = useCallback((questionId: string) => {
        dispatch({ type: 'DELETE_QUESTION', payload: { questionId } });
    }, []);

    const deleteQuestions = useCallback((questionIds: string[]) => {
        dispatch({ type: 'DELETE_QUESTIONS', payload: { questionIds } });
    }, []);
    
    const updateQuestions = useCallback((questionIds: string[], data: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>) => {
        dispatch({ type: 'UPDATE_QUESTIONS', payload: { questionIds, data } });
    }, []);

    const value = {
        exams: state.exams,
        questions: state.questions,
        addExam,
        updateExam,
        deleteExam,
        addQuestions,
        updateQuestion,
        deleteQuestion,
        deleteQuestions,
        updateQuestions,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
