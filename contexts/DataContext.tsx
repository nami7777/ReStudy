
import React, { createContext, useContext, ReactNode, useReducer, useEffect, useCallback, useState } from 'react';
import { Exam, Question, AppState, Tag } from '../types';
import * as imageStore from '../services/imageStore';

// 1. Define State and Actions

type Action =
    | { type: 'ADD_EXAM'; payload: Exam }
    | { type: 'UPDATE_EXAM'; payload: { examId: string; data: Partial<Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>> } }
    | { type: 'DELETE_EXAM'; payload: { examId: string } }
    | { type: 'ADD_QUESTIONS'; payload: Question[] }
    | { type: 'UPDATE_QUESTION'; payload: { questionId: string; data: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>> } }
    | { type: 'DELETE_QUESTION'; payload: { questionId: string } }
    | { type: 'DELETE_QUESTIONS'; payload: { questionIds: string[] } }
    | { type: 'UPDATE_QUESTIONS'; payload: { questionIds: string[]; data: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>> } }
    | { type: 'REPLACE_DATA'; payload: AppState }
    | { type: 'MERGE_DATA'; payload: AppState }
    | { type: 'ADD_TAG'; payload: Tag }
    | { type: 'UPDATE_TAG'; payload: Tag }
    | { type: 'DELETE_TAG'; payload: { tagId: string } }
    | { type: 'ADD_TAG_TO_QUESTIONS'; payload: { questionIds: string[]; tagId: string } }
    | { type: 'REMOVE_TAG_FROM_QUESTIONS'; payload: { questionIds: string[]; tagId: string } };

// 2. Define Context Type (what consumers get)
interface DataContextType {
    exams: Exam[];
    questions: Question[];
    tags: Tag[];
    isInitialized: boolean;
    addExam: (examData: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateExam: (examId: string, examData: Partial<Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>>) => void;
    deleteExam: (examId: string) => Promise<void>;
    addQuestions: (questionsData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<Question[]>;
    updateQuestion: (questionId: string, questionData: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
    deleteQuestion: (questionId: string) => Promise<void>;
    deleteQuestions: (questionIds: string[]) => Promise<void>;
    updateQuestions: (questionIds: string[], questionData: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>) => void;
    replaceData: (data: AppState) => Promise<void>;
    mergeData: (data: AppState) => Promise<void>;
    addTag: (tagData: Omit<Tag, 'id'>) => void;
    updateTag: (tagId: string, tagData: Partial<Omit<Tag, 'id'>>) => void;
    deleteTag: (tagId: string) => void;
    addTagToQuestions: (questionIds: string[], tagId: string) => void;
    removeTagFromQuestions: (questionIds: string[], tagId: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("useData must be used within a DataProvider");
    return context;
};

const isImageKey = (url?: string): url is string => !!url && url.startsWith('idb://');
const isBase64 = (url?: string): url is string => !!url && url.startsWith('data:image');

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
        
        case 'DELETE_EXAM': {
            const examId = action.payload.examId;
            return {
                ...state,
                exams: state.exams.filter(e => e.id !== examId),
                questions: state.questions.filter(q => q.examId !== examId), // Cascade delete
                tags: state.tags.filter(t => t.examId !== examId) // Cascade delete tags
            };
        }
        
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

        case 'REPLACE_DATA':
            return action.payload;

        case 'MERGE_DATA': {
            const { exams: incomingExams, questions: incomingQuestions, tags: incomingTags } = action.payload;

            const existingExamMap = new Map(state.exams.map(e => [e.id, e]));
            incomingExams.forEach(exam => existingExamMap.set(exam.id, { ...(existingExamMap.get(exam.id) || {}), ...exam }));

            const existingQuestionMap = new Map(state.questions.map(q => [q.id, q]));
            incomingQuestions.forEach(question => existingQuestionMap.set(question.id, { ...(existingQuestionMap.get(question.id) || {}), ...question }));

            const existingTagMap = new Map(state.tags.map(t => [t.id, t]));
            (incomingTags || []).forEach(tag => existingTagMap.set(tag.id, { ...(existingTagMap.get(tag.id) || {}), ...tag }));

            return {
                exams: Array.from(existingExamMap.values()),
                questions: Array.from(existingQuestionMap.values()),
                tags: Array.from(existingTagMap.values()),
            };
        }

        case 'ADD_TAG':
            return { ...state, tags: [...state.tags, action.payload] };

        case 'UPDATE_TAG':
            return { ...state, tags: state.tags.map(t => t.id === action.payload.id ? action.payload : t) };

        case 'DELETE_TAG':
            return {
                ...state,
                tags: state.tags.filter(t => t.id !== action.payload.tagId),
                questions: state.questions.map(q => ({
                    ...q,
                    tags: q.tags.filter(tagId => tagId !== action.payload.tagId)
                }))
            };
        
        case 'ADD_TAG_TO_QUESTIONS': {
            const { questionIds, tagId } = action.payload;
            const idSet = new Set(questionIds);
            return {
                ...state,
                questions: state.questions.map(q => {
                    if (idSet.has(q.id) && !q.tags.includes(tagId)) {
                        return { ...q, tags: [...q.tags, tagId], updatedAt: new Date().toISOString() };
                    }
                    return q;
                })
            };
        }

        case 'REMOVE_TAG_FROM_QUESTIONS': {
            const { questionIds, tagId } = action.payload;
            const idSet = new Set(questionIds);
            return {
                ...state,
                questions: state.questions.map(q => {
                    if (idSet.has(q.id) && q.tags.includes(tagId)) {
                        return { ...q, tags: q.tags.filter(id => id !== tagId), updatedAt: new Date().toISOString() };
                    }
                    return q;
                })
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
        const storedQuestionsMeta = localStorage.getItem('questions_meta');
        const storedTags = localStorage.getItem('tags');
        return {
            exams: storedExams ? JSON.parse(storedExams) : [],
            questions: storedQuestionsMeta ? JSON.parse(storedQuestionsMeta) : [],
            tags: storedTags ? JSON.parse(storedTags) : [],
        };
    } catch (error) {
        console.error("Error reading from localStorage", error);
        return { exams: [], questions: [], tags: [] };
    }
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(appReducer, undefined, initializer);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (!isInitialized) return;
        try {
            // Create a version of questions without image data for localStorage
            const questions_meta = state.questions.map(({ imageUrl, answer, ...rest }) => ({
                ...rest,
                // keep imageUrl if it's a key, but not if it's base64
                imageUrl: isImageKey(imageUrl) ? imageUrl : undefined, 
                answer: answer ? {
                    ...answer,
                    imageUrls: answer.imageUrls?.filter(isImageKey)
                } : undefined,
            }));

            localStorage.setItem('exams', JSON.stringify(state.exams));
            localStorage.setItem('questions_meta', JSON.stringify(questions_meta));
            localStorage.setItem('tags', JSON.stringify(state.tags));
        } catch (error) {
            console.error("Error writing to localStorage", error);
        }
    }, [state, isInitialized]);
    
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
    
    const deleteExam = useCallback(async (examId: string) => {
        const questionsToDelete = state.questions.filter(q => q.examId === examId);
        const imageKeysToDelete = questionsToDelete.flatMap(q => [q.imageUrl, ...(q.answer?.imageUrls || [])]).filter(isImageKey);
        if (imageKeysToDelete.length > 0) await imageStore.deleteImages(imageKeysToDelete);
        dispatch({ type: 'DELETE_EXAM', payload: { examId } });
    }, [state.questions]);
    
    const addQuestions = useCallback(async (questionsData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Question[]> => {
        const processedQuestionsData = await Promise.all(
            questionsData.map(async (q) => {
                const processedQ = { ...q };
                if (isBase64(processedQ.imageUrl)) {
                    processedQ.imageUrl = await imageStore.storeImage(processedQ.imageUrl);
                }
                return processedQ;
            })
        );

        const newQuestions: Question[] = processedQuestionsData.map(q => ({
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

    const updateQuestion = useCallback(async (questionId: string, data: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>) => {
        const questionToUpdate = state.questions.find(q => q.id === questionId);
        if (!questionToUpdate) return;
        
        const dataCopy = JSON.parse(JSON.stringify(data)); // Deep copy to avoid mutation
        const imageKeysToDelete: string[] = [];

        // Handle new/updated answer images
        if (dataCopy.answer?.imageUrls) {
            const oldImageUrls = questionToUpdate.answer?.imageUrls?.filter(isImageKey) || [];
            const newImageUrls = dataCopy.answer.imageUrls;

            const newKeys = await Promise.all(
                newImageUrls.map((url: string) => isBase64(url) ? imageStore.storeImage(url) : Promise.resolve(url))
            );
            dataCopy.answer.imageUrls = newKeys;

            const newKeysSet = new Set(newKeys);
            oldImageUrls.forEach(oldKey => {
                if (!newKeysSet.has(oldKey)) {
                    imageKeysToDelete.push(oldKey);
                }
            });
        }
        
        if (imageKeysToDelete.length > 0) {
            await imageStore.deleteImages(imageKeysToDelete);
        }
        
        dispatch({ type: 'UPDATE_QUESTION', payload: { questionId, data: dataCopy } });
    }, [state.questions]);
    
    const deleteQuestion = useCallback(async (questionId: string) => {
        const questionToDelete = state.questions.find(q => q.id === questionId);
        if (!questionToDelete) return;
        const imageKeysToDelete = [questionToDelete.imageUrl, ...(questionToDelete.answer?.imageUrls || [])].filter(isImageKey);
        if (imageKeysToDelete.length > 0) await imageStore.deleteImages(imageKeysToDelete);
        dispatch({ type: 'DELETE_QUESTION', payload: { questionId } });
    }, [state.questions]);

    const deleteQuestions = useCallback(async (questionIds: string[]) => {
        const idSet = new Set(questionIds);
        const questionsToDelete = state.questions.filter(q => idSet.has(q.id));
        const imageKeysToDelete = questionsToDelete.flatMap(q => [q.imageUrl, ...(q.answer?.imageUrls || [])]).filter(isImageKey);
        if (imageKeysToDelete.length > 0) await imageStore.deleteImages(imageKeysToDelete);
        dispatch({ type: 'DELETE_QUESTIONS', payload: { questionIds } });
    }, [state.questions]);
    
    const updateQuestions = useCallback((questionIds: string[], data: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>) => {
        dispatch({ type: 'UPDATE_QUESTIONS', payload: { questionIds, data } });
    }, []);

    const processImportedQuestions = async (questions: Question[]) => {
       return await Promise.all(
            (questions || []).map(async (q) => {
                const newQ = { ...q };
                if (isBase64(newQ.imageUrl)) {
                    newQ.imageUrl = await imageStore.storeImage(newQ.imageUrl);
                }
                if (newQ.answer?.imageUrls) {
                    newQ.answer.imageUrls = await Promise.all(
                        newQ.answer.imageUrls.map(url => isBase64(url) ? imageStore.storeImage(url) : url)
                    );
                }
                return newQ;
            })
        );
    }

    const replaceData = useCallback(async (data: AppState) => {
        // First, delete all existing data and images
        const allImageKeys = state.questions.flatMap(q => [q.imageUrl, ...(q.answer?.imageUrls || [])]).filter(isImageKey);
        if(allImageKeys.length > 0) await imageStore.deleteImages(allImageKeys);

        // Now process and import new data
        const processedQuestions = await processImportedQuestions(data.questions);
        dispatch({ type: 'REPLACE_DATA', payload: { exams: data.exams, questions: processedQuestions, tags: data.tags || [] } });
    }, [state.questions]);

    const mergeData = useCallback(async (data: AppState) => {
        const processedQuestions = await processImportedQuestions(data.questions);
        dispatch({ type: 'MERGE_DATA', payload: { exams: data.exams, questions: processedQuestions, tags: data.tags || [] } });
    }, []);

    const addTag = useCallback((tagData: Omit<Tag, 'id'>) => {
        const newTag: Tag = { id: crypto.randomUUID(), ...tagData };
        dispatch({ type: 'ADD_TAG', payload: newTag });
    }, []);

    const updateTag = useCallback((tagId: string, tagData: Partial<Omit<Tag, 'id'>>) => {
        const tagToUpdate = state.tags.find(t => t.id === tagId);
        if (!tagToUpdate) return;
        const updatedTag: Tag = { ...tagToUpdate, ...tagData };
        dispatch({ type: 'UPDATE_TAG', payload: updatedTag });
    }, [state.tags]);

    const deleteTag = useCallback((tagId: string) => {
        dispatch({ type: 'DELETE_TAG', payload: { tagId } });
    }, []);

    const addTagToQuestions = useCallback((questionIds: string[], tagId: string) => {
        dispatch({ type: 'ADD_TAG_TO_QUESTIONS', payload: { questionIds, tagId } });
    }, []);

    const removeTagFromQuestions = useCallback((questionIds: string[], tagId: string) => {
        dispatch({ type: 'REMOVE_TAG_FROM_QUESTIONS', payload: { questionIds, tagId } });
    }, []);


    const value = {
        exams: state.exams,
        questions: state.questions,
        tags: state.tags,
        isInitialized,
        addExam,
        updateExam,
        deleteExam,
        addQuestions,
        updateQuestion,
        deleteQuestion,
        deleteQuestions,
        updateQuestions,
        replaceData,
        mergeData,
        addTag,
        updateTag,
        deleteTag,
        addTagToQuestions,
        removeTagFromQuestions,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
