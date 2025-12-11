export interface Question {
  id: number;
  question: string;
  answer: string;
  options?: string[]; // Optional: if parsed from PDF
}

export enum AppMode {
  QUIZ = 'QUIZ',
  LIST = 'LIST',
  EXAM = 'EXAM',
  EXAM_RESULT = 'EXAM_RESULT'
}

export interface ExamConfig {
  questionCount: number;
  durationMinutes: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}