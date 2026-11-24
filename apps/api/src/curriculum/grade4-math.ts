import type { CurriculumDef } from './types.js';

// Grade 4 math topic tree, our own short names for the topic areas listed in the Ministry of
// Education's published grade 4 math curriculum (old curriculum, pages 75-95 of the
// grades 1-6 document). No text or examples are copied.
//
// Scope: numbers to a million, number line, arithmetic operations and simple fractions.
// Not covered yet: data and probability, shapes and solids, symmetry, measurement.
//
// The document lists topics, not an order of learning. The `prerequisites` links are OUR
// pedagogical judgment, not something the Ministry specifies.
export const grade4Math: CurriculumDef = {
  subject: { slug: 'math', nameHe: 'חשבון' },
  topics: [
    // Natural numbers up to one million
    { slug: 'numbers', nameHe: 'מספרים טבעיים עד מיליון', grade: 4 },
    { slug: 'numbers-read-write', nameHe: 'קריאה וכתיבה של מספרים', grade: 4, parent: 'numbers' },
    { slug: 'place-value', nameHe: 'המבנה העשרוני וערך המקום', grade: 4, parent: 'numbers', prerequisites: ['numbers-read-write'] },
    // Optional, culturally specific topic from the curriculum (letters as numbers).
    { slug: 'hebrew-numerals', nameHe: 'שיטת האלף-בית (גימטרייה)', grade: 4, parent: 'numbers', prerequisites: ['numbers-read-write'] },

    // Number line (its own area in the curriculum)
    { slug: 'number-line', nameHe: 'ישר המספרים', grade: 4, prerequisites: ['place-value'] },

    // Arithmetic operations
    { slug: 'operations', nameHe: 'פעולות החשבון', grade: 4 },
    { slug: 'addition-subtraction', nameHe: 'חיבור וחיסור במאונך', grade: 4, parent: 'operations', prerequisites: ['place-value'] },
    // Assumed knowledge from grade 3, not a grade 4 topic, but long division and multiplication build on it.
    { slug: 'multiplication-tables', nameHe: 'לוח הכפל', grade: 4, parent: 'operations' },
    { slug: 'multiplication', nameHe: 'כפל במאונך', grade: 4, parent: 'operations', prerequisites: ['multiplication-tables', 'place-value'] },
    { slug: 'long-division', nameHe: 'חילוק ארוך', grade: 4, parent: 'operations', prerequisites: ['multiplication-tables', 'multiplication'] },
    { slug: 'estimation', nameHe: 'אומדן ופיתוח תובנה מספרית', grade: 4, parent: 'operations', prerequisites: ['addition-subtraction', 'multiplication'] },
    { slug: 'order-of-operations', nameHe: 'סדר הפעולות והשימוש בסוגריים', grade: 4, parent: 'operations', prerequisites: ['addition-subtraction', 'multiplication'] },
    { slug: 'properties-zero-one', nameHe: 'תכונות ה-0 וה-1', grade: 4, parent: 'operations', prerequisites: ['addition-subtraction'] },
    { slug: 'primes-composites', nameHe: 'מספרים ראשוניים ופריקים', grade: 4, parent: 'operations', prerequisites: ['multiplication-tables'] },
    { slug: 'divisibility-rules', nameHe: 'סימני התחלקות ב-3, ב-6 וב-9', grade: 4, parent: 'operations', prerequisites: ['primes-composites', 'long-division'] },
    { slug: 'powers', nameHe: 'חזקות', grade: 4, parent: 'operations', prerequisites: ['multiplication'] },
    { slug: 'word-problems', nameHe: 'שאלות כוללות (בעיות מילוליות)', grade: 4, parent: 'operations', prerequisites: ['addition-subtraction', 'multiplication', 'long-division', 'order-of-operations'] },

    // Simple fractions
    { slug: 'fractions', nameHe: 'השבר הפשוט', grade: 4 },
    { slug: 'fractions-concept', nameHe: 'הכרת השבר הפשוט', grade: 4, parent: 'fractions' },
    { slug: 'fractions-different-names', nameHe: 'שמות שונים לשבר', grade: 4, parent: 'fractions', prerequisites: ['fractions-concept'] },
    { slug: 'fractions-improper-mixed', nameHe: 'שבר גדול מ-1 ומספר מעורב', grade: 4, parent: 'fractions', prerequisites: ['fractions-concept'] },
    { slug: 'fractions-compare', nameHe: 'השוואת שברים', grade: 4, parent: 'fractions', prerequisites: ['fractions-concept'] },
    { slug: 'fractions-number-line', nameHe: 'שברים על ישר המספרים', grade: 4, parent: 'fractions', prerequisites: ['fractions-concept', 'number-line'] },
    { slug: 'fractions-add-subtract', nameHe: 'חיבור וחיסור שברים (מכנים שווים או קרובים)', grade: 4, parent: 'fractions', prerequisites: ['fractions-concept', 'fractions-different-names', 'addition-subtraction'] },
    { slug: 'mixed-add-subtract', nameHe: 'חיבור וחיסור מספרים מעורבים', grade: 4, parent: 'fractions', prerequisites: ['fractions-add-subtract', 'fractions-improper-mixed'] },
    { slug: 'whole-times-fraction', nameHe: 'כפל שלם בשבר', grade: 4, parent: 'fractions', prerequisites: ['fractions-add-subtract', 'multiplication'] },
    { slug: 'fractions-word-problems', nameHe: 'שאלות מילוליות בשברים', grade: 4, parent: 'fractions', prerequisites: ['fractions-concept', 'fractions-add-subtract'] },
  ],
};
