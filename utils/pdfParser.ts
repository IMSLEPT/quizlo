
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { Question } from '../types';

// Set worker source to match the API version (5.4.449)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Join with newline to preserve vertical structure
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join('\n'); 
      
    fullText += pageText + '\n';
  }
  
  return fullText;
}

export function parseQuestionsFromText(text: string): Question[] {
  // 1. Normalize text: cleanup encoding artifacts
  const cleanText = text
    .replace(/ð/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/ł/g, 'l')
    .replace(/ŵ/g, 'w')
    .replace(/Ŷ/g, 'Y')
    .replace(/Þ/g, 'b')
    // Remove other common OCR garbage if needed
    .replace(/\r\n/g, '\n');

  const lines = cleanText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const questions: Question[] = [];
  
  let currentQ: Question | null = null;
  
  // State Machine
  // NONE: Initial state
  // Q_EXPLICIT: Just parsed a line starting with "ID Question..."
  // A_EXPLICIT: Just parsed a line starting with "ID Answer..."
  // Q_IMPLICIT: Just parsed a line WITHOUT number, assumed to be a NEW Question
  // A_IMPLICIT: Just parsed a line WITHOUT number, assumed to be Answer to implicit Q
  type ParseState = 'NONE' | 'Q_EXPLICIT' | 'A_EXPLICIT' | 'Q_IMPLICIT' | 'A_IMPLICIT';
  let state: ParseState = 'NONE';

  // Helper: Detect number at start (1., 1), 1-, 1Text)
  const getLineInfo = (str: string) => {
    // Match digits at start, followed by optional separator characters, then the rest
    // We use a regex that captures the number even if fused with text (e.g. "58Quale")
    const match = str.match(/^(\d+)([\.\-\)\s]*)(.*)/);
    if (!match) return null;
    
    return {
        id: parseInt(match[1]),
        separator: match[2],
        content: match[3].trim()
    };
  };

  const isNoise = (line: string) => {
    const upper = line.toUpperCase();
    // Filters common headers/footers found in academic dumps/panieri
    if (upper.startsWith('APPARATO')) return true;
    if (upper.startsWith('SISTEMA')) return true;
    if (upper.startsWith('DOMANDE AGGIUNTE')) return true;
    if (upper.includes('SCARICATO DA')) return true;
    if (upper.includes('PANIERI')) return true;
    if (upper.includes('START OF OCR')) return true;
    if (upper.includes('SCREENSHOT FOR PAGE')) return true;
    if (line.match(/^(Pagina|pag\.)\s*\d+/i)) return true;
    if (line.match(/^\d+\s*$/)) return true; // Just a lonely number often means page number
    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isNoise(line)) continue;

    const lineInfo = getLineInfo(line);

    // --- SCENARIO 1: LINE STARTS WITH A NUMBER ---
    if (lineInfo) {
        const { id, content } = lineInfo;
        
        if (!content) continue;

        // Check if it's an Answer to the current question
        // Rule: If we have a current question, and this line's ID matches current ID
        if (currentQ && currentQ.id === id) {
            // It is the Answer line
            if (state === 'A_EXPLICIT') {
                 // Already had an answer line? Append.
                 currentQ.answer += " " + content;
            } else {
                 // First answer line
                 currentQ.answer = content;
                 state = 'A_EXPLICIT';
            }
            continue;
        }

        // Otherwise, it is a NEW Explicit Question
        // Push the previous one
        if (currentQ && currentQ.question) {
            questions.push(currentQ);
        }

        // Start new Question
        currentQ = {
            id: id,
            question: content,
            answer: "", 
            options: []
        };
        state = 'Q_EXPLICIT';
        continue;
    }

    // --- SCENARIO 2: LINE DOES NOT START WITH A NUMBER ---
    
    // If we haven't started anything, skip
    if (!currentQ) continue;

    // Logic depends on previous state
    if (state === 'Q_EXPLICIT') {
        // We were in a numbered question. This line is likely continuation of question text.
        // UNLESS: It looks like an implicit answer? (Hard to detect)
        // For Panieri, usually questions are 1 line. If we see text here, it might be the answer if the number was missing.
        // Heuristic: If question ends with '?' and this line starts with Capital? 
        // Safer default: Append to Question.
        currentQ.question += " " + line;
    } 
    else if (state === 'A_EXPLICIT') {
        // CRITICAL FIX:
        // We just finished a Numbered Answer (e.g. "4 Clavicola...").
        // Now we see a line with NO number (e.g. "Da cosa è formata...").
        // In this dataset, this usually means it's a NEW QUESTION that lost its number (Question 5).
        // So we Force-Create a new "Implicit" Question.
        
        // Push old Q
        questions.push(currentQ);

        // Create new Implicit Q
        // We auto-increment ID for UI consistency
        const newId = currentQ.id + 1;
        currentQ = {
            id: newId,
            question: line,
            answer: "",
            options: []
        };
        state = 'Q_IMPLICIT';
    }
    else if (state === 'Q_IMPLICIT') {
        // We are inside a question we guessed (e.g. "Da cosa è formata...").
        // Now we see another unnumbered line (e.g. "Processo zigomatico...").
        // This is likely the ANSWER to our implicit question.
        
        // However, check lookahead: if next line is Numbered, then this is definitely the Answer.
        // If next line is also unnumbered, we might be splitting a long question.
        // HEURISTIC: In this format, assume alternating Q / A for implicit blocks.
        
        currentQ.answer = line;
        state = 'A_IMPLICIT';
    }
    else if (state === 'A_IMPLICIT') {
        // We are in an implicit answer. Now another unnumbered line.
        // Likely a NEW implicit question.
        // e.g. Q (implicit) -> A (implicit) -> Q (implicit)...
        
        questions.push(currentQ);
        
        const newId = currentQ.id + 1;
        currentQ = {
            id: newId,
            question: line,
            answer: "",
            options: []
        };
        state = 'Q_IMPLICIT';
    }
  }

  // Push the very last question found
  if (currentQ && currentQ.question) {
    questions.push(currentQ);
  }

  return questions;
}
