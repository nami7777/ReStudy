
export enum Difficulty {
  Normal = 'normal',
  Hard = 'hard',
  NightBefore = 'night-before',
}

export enum Status {
  New = 'new',
  Seen = 'seen',
  InProgress = 'in-progress',
  Mastered = 'mastered',
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Answer {
  text?: string;
  imageUrls?: string[];
}

export interface Question {
  id: string;
  examId: string;
  type: 'image' | 'text';
  imageUrl?: string;
  text?: string;
  tags: string[];
  difficulty: Difficulty;
  status: Status;
  notes?: string;
  answer?: Answer;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
}

export interface Exam {
  id: string;
  name: string;
  subject?: string;
  examDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
    exams: Exam[];
    questions: Question[];
    tags: Tag[];
}

export type View = 'home' | 'exam-detail' | 'study-mode';