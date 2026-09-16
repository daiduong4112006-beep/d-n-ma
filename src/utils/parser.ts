import { Question, Difficulty, Quiz } from '../types/quiz';

export interface ParsedQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  correctAnswers: number[];
  explanation: string;
  note?: string;
  difficulty: Difficulty;
  imageUrl?: string;
  valid: boolean;
  error?: string;
}

export const parseAnswerIndices = (rawAnsMarker: string, options: string[]): { primary: number; all: number[] } => {
  if (!rawAnsMarker || !rawAnsMarker.trim()) {
    return { primary: 0, all: [0] };
  }

  const clean = rawAnsMarker.trim();

  // Split by common delimiters: comma, semicolon, plus, slash, ampersand, or whitespace
  // e.g., "c,d", "a, b", "C; D", "A, B, C", "1,2", "c d"
  const rawTokens = clean
    .split(/[,;&+\/\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const matchedIndices: number[] = [];

  const charToIdx = (token: string): number | null => {
    const c = token.toUpperCase().replace(/^(ĐÁP ÁN|CÂU|OPTION|CHOICE)\s*/i, '').trim();
    if (c.length === 1 && c >= 'A' && c <= 'Z') {
      return c.charCodeAt(0) - 65;
    }
    const num = parseInt(c, 10);
    if (!isNaN(num)) {
      if (num >= 1 && num <= 26) return num - 1;
      if (num === 0) return 0;
    }
    return null;
  };

  for (const token of rawTokens) {
    const idx = charToIdx(token);
    if (idx !== null && idx >= 0 && idx < options.length) {
      if (!matchedIndices.includes(idx)) {
        matchedIndices.push(idx);
      }
      continue;
    }

    // Try matching option text
    const matchedOptIdx = options.findIndex((opt) => {
      const oLower = opt.toLowerCase().trim();
      const tLower = token.toLowerCase().trim();
      return oLower === tLower || (tLower.length >= 2 && oLower.includes(tLower));
    });

    if (matchedOptIdx !== -1 && !matchedIndices.includes(matchedOptIdx)) {
      matchedIndices.push(matchedOptIdx);
    }
  }

  if (matchedIndices.length === 0) {
    // Fallback: search letters A-Z in clean
    const upper = clean.toUpperCase();
    for (let i = 0; i < Math.min(options.length, 26); i++) {
      const letter = String.fromCharCode(65 + i);
      if (upper.includes(letter) && !matchedIndices.includes(i)) {
        matchedIndices.push(i);
      }
    }
  }

  if (matchedIndices.length === 0) {
    matchedIndices.push(0);
  }

  return {
    primary: matchedIndices[0],
    all: matchedIndices,
  };
};

export const parseTextFormat = (rawText: string): ParsedQuestion[] => {
  if (!rawText.trim()) return [];

  const results: ParsedQuestion[] = [];

  // Determine block splitting strategy
  let blocks: string[] = [];
  
  // Check for standalone exclamation mark line e.g., "\n!\n" or "^!"
  const hasStandaloneExclamation = /(?:^|\r?\n)\s*!\s*(?:\r?\n|$)/.test(rawText);
  
  if (hasStandaloneExclamation) {
    blocks = rawText
      .split(/(?:^|\r?\n)\s*!\s*(?:\r?\n|$)/)
      .map((b) => b.trim())
      .filter((b) => b.length > 0 && b !== '!');
  } else if (/\r?\n\s*\r?\n/.test(rawText)) {
    // Split by double blank lines
    blocks = rawText
      .split(/\r?\n\s*\r?\n+/)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
  } else {
    // Single block
    blocks = [rawText.trim()];
  }

  for (const block of blocks) {
    const rawLines = block.split(/\r?\n/);
    if (rawLines.length === 0) continue;

    let questionLines: string[] = [];
    let options: string[] = [];
    let explanationLines: string[] = [];
    let noteLines: string[] = [];
    let difficulty: Difficulty = 'Medium';
    let imageUrl: string | undefined = undefined;
    let rawAnsMarker = '';

    let currentSection: 'question' | 'options' | 'answer' | 'explanation' | 'note' = 'question';
    let inCodeBlock = false;

    for (let i = 0; i < rawLines.length; i++) {
      const rawLine = rawLines[i];
      const trimmedLine = rawLine.trim();

      // Check code block fence toggle (e.g. ```python, ```, ~~~)
      if (/^```|^~~~/.test(trimmedLine)) {
        inCodeBlock = !inCodeBlock;
        if (currentSection === 'question') {
          questionLines.push(rawLine);
        } else if (currentSection === 'explanation') {
          explanationLines.push(rawLine);
        } else if (currentSection === 'note') {
          noteLines.push(rawLine);
        } else if (currentSection === 'options' && options.length > 0) {
          options[options.length - 1] += `\n${rawLine}`;
        }
        continue;
      }

      // If we are inside a code block, preserve indentation and do not interpret #, @, $, A. as section markers!
      if (inCodeBlock) {
        if (currentSection === 'question') {
          questionLines.push(rawLine);
        } else if (currentSection === 'explanation') {
          explanationLines.push(rawLine);
        } else if (currentSection === 'note') {
          noteLines.push(rawLine);
        } else if (currentSection === 'options' && options.length > 0) {
          options[options.length - 1] += `\n${rawLine}`;
        }
        continue;
      }

      // If line is empty
      if (!trimmedLine) {
        if (currentSection === 'question' && questionLines.length > 0) {
          questionLines.push('');
        } else if (currentSection === 'explanation' && explanationLines.length > 0) {
          explanationLines.push('');
        } else if (currentSection === 'note' && noteLines.length > 0) {
          noteLines.push('');
        }
        continue;
      }

      // Skip standalone '!' line
      if (trimmedLine === '!') continue;

      // Check for image URL marker e.g., "[Image: https://...]", "Image: https://...", "Ảnh: https://...", or data:image
      if (/^(?:\[?(?:Image|Ảnh|Hình ảnh|Img)\s*[:.]?\s*|https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|svg)|data:image\/)/i.test(trimmedLine)) {
        const cleanUrl = trimmedLine
          .replace(/^\[?\s*(?:Image|Ảnh|Hình ảnh|Img)\s*[:.]?\s*/i, '')
          .replace(/\]$/, '')
          .trim();
        if (cleanUrl) {
          imageUrl = cleanUrl;
          continue;
        }
      }

      // Check for answer marker beginning with @ or "Đáp án:", "Answer:", "Key:"
      if (/^@/i.test(trimmedLine) || /^(Answer|Đáp án|Correct|Key)\s*[:.]/i.test(trimmedLine)) {
        currentSection = 'answer';
        const marker = trimmedLine
          .replace(/^@\s*/, '')
          .replace(/^(Answer|Đáp án|Correct|Key)\s*[:.]?\s*/i, '')
          .trim();
        if (marker) {
          rawAnsMarker = rawAnsMarker ? `${rawAnsMarker}, ${marker}` : marker;
        }
        continue;
      }

      // Check for note line starting with $ or "Ghi chú" / "Note" / "Kiến thức cần lưu ý"
      if (
        /^\$/i.test(trimmedLine) ||
        /^(Note|Ghi chú ghi nhớ|Ghi chú|Kiến thức cần lưu ý|Kiến thức lưu ý|Lưu ý|Knowledge)\s*[:.]?/i.test(trimmedLine)
      ) {
        currentSection = 'note';
        let noteContent = trimmedLine
          .replace(/^\$\s*/, '')
          .replace(/^(ghi chú ghi nhớ|ghi chú|kiến thức cần lưu ý|kiến thức lưu ý|lưu ý|knowledge|note)\s*[:.]?\s*/i, '')
          .trim();
        if (noteContent) {
          noteLines.push(noteContent);
        }
        continue;
      }

      // Check for explanation line starting with # or "Giải thích" / "Explanation" / "Hướng dẫn giải" / "Lời giải"
      if (
        /^#/i.test(trimmedLine) ||
        /^(Explanation|Giải thích chi tiết|Giải thích|Hướng dẫn giải|Lời giải|Đáp án chi tiết)\s*[:.]?/i.test(trimmedLine)
      ) {
        currentSection = 'explanation';
        let expContent = trimmedLine
          .replace(/^#\s*/, '')
          .replace(/^(explanation|giải thích chi tiết|giải thích|hướng dẫn giải|lời giải|đáp án chi tiết)\s*[:.]?\s*/i, '')
          .trim();
        if (expContent) {
          explanationLines.push(expContent);
        }
        continue;
      }

      // Check for difficulty line
      if (/^(Difficulty|Độ khó)\s*[:.]/i.test(trimmedLine)) {
        const diffVal = trimmedLine.replace(/^(Difficulty|Độ khó)\s*[:.]/i, '').trim();
        if (/easy|dễ/i.test(diffVal)) difficulty = 'Easy';
        else if (/hard|khó/i.test(diffVal)) difficulty = 'Hard';
        else difficulty = 'Medium';
        continue;
      }

      // Check for question header like "Câu 1:", "Question 1:", "Q1.", etc.
      if (/^(?:Question|Câu hỏi|Q|Câu\s*\d+|Câu)\s*[:.]/i.test(trimmedLine) && currentSection === 'question' && questionLines.length === 0) {
        const qContent = trimmedLine.replace(/^(?:Question|Câu hỏi|Q|Câu\s*\d+|Câu)\s*[:.]\s*/i, '').trim();
        if (qContent) {
          questionLines.push(qContent);
        }
        continue;
      }

      // ONLY match options if currentSection is 'question' or 'options'
      if (currentSection === 'question' || currentSection === 'options') {
        const optionPrefixMatch = trimmedLine.match(/^(?:Option|Choice|Lựa chọn)?\s*([A-Z]|[1-9]\d?)\s*[:\.\)]\s*(.*)/i);
        if (optionPrefixMatch) {
          currentSection = 'options';
          let optText = optionPrefixMatch[2].trim();
          
          // If line is just "A." without text on same line, check if next line is the option value
          if (!optText && i + 1 < rawLines.length) {
            const nextL = rawLines[i + 1].trim();
            if (
              !/^[@#!\$]/.test(nextL) &&
              !/^(?:Option|Choice|Lựa chọn)?\s*([A-Z]|[1-9]\d?)\s*[:\.\)]/i.test(nextL) &&
              !/^(Question|Câu|Giải thích|Ghi chú|Answer|Đáp án|Note|Explanation|Kiến thức)/i.test(nextL)
            ) {
              optText = nextL;
              i++;
            }
          }
          options.push(optText || trimmedLine);
          continue;
        }

        // Single letter standalone option line like "A", "B", "C" on its own line
        if (/^[A-Z]$/i.test(trimmedLine) && i + 1 < rawLines.length) {
          const nextL = rawLines[i + 1].trim();
          if (
            !/^[@#!\$]/.test(nextL) &&
            !/^(?:Option|Choice|Lựa chọn)?\s*([A-Z]|[1-9]\d?)\s*[:\.\)]/i.test(nextL) &&
            !/^(Question|Câu|Giải thích|Ghi chú|Answer|Đáp án|Note|Explanation|Kiến thức)/i.test(nextL)
          ) {
            currentSection = 'options';
            options.push(nextL);
            i++;
            continue;
          }
        }
      }

      // Plain line without section marker prefix -> dependent on currentSection:
      if (currentSection === 'explanation') {
        explanationLines.push(rawLine);
      } else if (currentSection === 'note') {
        noteLines.push(rawLine);
      } else if (currentSection === 'answer') {
        rawAnsMarker = rawAnsMarker ? `${rawAnsMarker}, ${trimmedLine}` : trimmedLine;
      } else if (currentSection === 'options') {
        if (options.length > 0) {
          options[options.length - 1] += `\n${rawLine}`;
        } else {
          options.push(trimmedLine);
        }
      } else {
        // currentSection is 'question'
        questionLines.push(rawLine);
      }
    }

    let questionText = questionLines.join('\n').trim();
    const explanation = explanationLines.join('\n').trim();
    const note = noteLines.join('\n').trim();

    // Discard conversational AI preamble / postamble blocks that have NO options and NO answer markers
    if (options.length === 0 && !rawAnsMarker) {
      if (
        /^(tôi đã|tôi trích xuất|dưới đây là|danh sách câu hỏi|sau đây là|chào bạn|hello|here is|here are|summary|tổng hợp|các câu hỏi)/i.test(questionText) ||
        questionText.includes('trích xuất tất cả các câu hỏi') ||
        questionText.includes('tổng hợp thành danh sách') ||
        (questionText.length < 30 && !/\?/.test(questionText))
      ) {
        // Skip AI preamble chatter
        continue;
      }
    }

    // Clean up questionText: strip leading "Câu X.", "Câu X:", "Question X:" if any remained
    questionText = questionText.replace(/^(?:Question|Câu\s*hỏi|Câu\s*\d+|Q\d+)\s*[:\.]?\s*/i, '').trim();

    // Validation
    let valid = true;
    let error: string | undefined = undefined;

    if (!questionText) {
      valid = false;
      error = 'Thiếu nội dung câu hỏi';
    } else if (options.length < 2) {
      valid = false;
      error = 'Cần ít nhất 2 đáp án lựa chọn';
    }

    // If options is empty for fallback, add True and False
    if (options.length === 0) {
      options = ['True', 'False'];
    }

    // Determine correct answer index and all correct answers from rawAnsMarker
    if (!rawAnsMarker || !rawAnsMarker.trim()) {
      const noteExp = `${note} ${explanation}`;
      const comboMatch = noteExp.match(/(?:chọn|đáp án|đáp án đúng|gồm)\s*[:.]?\s*([A-Z](?:\s*(?:và|với|&|,|;|\+)\s*[A-Z])+)/i);
      if (comboMatch) {
        rawAnsMarker = comboMatch[1];
      }
    }

    const parsedAns = parseAnswerIndices(rawAnsMarker, options);
    const correctAnswer = parsedAns.primary;
    const correctAnswers = parsedAns.all;

    results.push({
      question: questionText || 'Untitled Question',
      options: options,
      correctAnswer,
      correctAnswers,
      explanation: explanation || 'Không có giải thích thêm.',
      note,
      difficulty,
      imageUrl,
      valid,
      error,
    });
  }

  return results;
};

export const parseJSONFormat = (jsonString: string): ParsedQuestion[] => {
  try {
    const data = JSON.parse(jsonString);
    let items: any[] = [];

    if (Array.isArray(data)) {
      items = data;
    } else if (data && Array.isArray(data.questions)) {
      items = data.questions;
    } else if (data && typeof data === 'object') {
      items = [data];
    }

    return items.map((item, idx) => {
      const question = item.question || `Question ${idx + 1}`;
      const opts = Array.isArray(item.options) ? item.options.map(String) : [];
      if (opts.length < 2) {
        while (opts.length < 2) opts.push(`Option ${opts.length + 1}`);
      }

      let rawMarker = '';
      if (item.correctAnswers && Array.isArray(item.correctAnswers)) {
        rawMarker = item.correctAnswers.join(',');
      } else if (item.correctAnswer !== undefined) {
        rawMarker = String(item.correctAnswer);
      }

      const parsedAns = parseAnswerIndices(rawMarker, opts);

      let diff: Difficulty = 'Medium';
      if (/easy/i.test(item.difficulty)) diff = 'Easy';
      else if (/hard/i.test(item.difficulty)) diff = 'Hard';

      const img = item.imageUrl || item.image || item.img || undefined;

      return {
        question,
        options: opts,
        correctAnswer: parsedAns.primary,
        correctAnswers: parsedAns.all,
        explanation: item.explanation || 'No explanation provided.',
        note: item.note || '',
        difficulty: diff,
        imageUrl: img,
        valid: Boolean(question && opts.length >= 2),
      };
    });
  } catch (e: any) {
    return [
      {
        question: 'Invalid JSON',
        options: ['A', 'B'],
        correctAnswer: 0,
        correctAnswers: [0],
        explanation: '',
        difficulty: 'Medium',
        valid: false,
        error: `JSON syntax error: ${e.message}`,
      },
    ];
  }
};

export const parseCSVFormat = (csvString: string): ParsedQuestion[] => {
  const lines = csvString.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const results: ParsedQuestion[] = [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (row.length < 2) continue;

    const qIdx = headers.findIndex((h) => h.includes('question') || h.includes('câu hỏi'));
    const ansIdx = headers.findIndex((h) => h.includes('correct') || h.includes('answer') || h.includes('đáp án'));
    const expIdx = headers.findIndex((h) => h.includes('explanation') || h.includes('giải thích'));
    const noteIdx = headers.findIndex((h) => h.includes('note') || h.includes('ghi chú'));
    const diffIdx = headers.findIndex((h) => h.includes('difficulty') || h.includes('độ khó'));
    const imgIdx = headers.findIndex((h) => h.includes('image') || h.includes('ảnh') || h.includes('img'));

    const questionText = qIdx >= 0 ? row[qIdx] : row[0] || '';

    // Collect options dynamically from Option A, B, C, D, E, etc.
    const opts: string[] = [];
    headers.forEach((h, hIdx) => {
      if (h.startsWith('option') || h.startsWith('lựa chọn') || h.startsWith('phương án')) {
        if (row[hIdx] && row[hIdx].trim()) {
          opts.push(row[hIdx].trim());
        }
      }
    });

    if (opts.length < 2) {
      // Fallback: check columns 1, 2, 3, 4
      const optA = row[1] || '';
      const optB = row[2] || '';
      const optC = row[3] || '';
      const optD = row[4] || '';
      [optA, optB, optC, optD].forEach((o) => {
        if (o && o.trim()) opts.push(o.trim());
      });
    }

    if (opts.length < 2) {
      opts.push('Option A', 'Option B');
    }

    const ansVal = ansIdx >= 0 ? row[ansIdx] : row[5] || '0';
    const parsedAns = parseAnswerIndices(ansVal, opts);

    const explanation = expIdx >= 0 ? row[expIdx] : row[6] || '';
    const note = noteIdx >= 0 ? row[noteIdx] : row[7] || '';
    let difficulty: Difficulty = 'Medium';
    const diffRaw = diffIdx >= 0 ? row[diffIdx] : 'Medium';
    if (/easy|dễ/i.test(diffRaw)) difficulty = 'Easy';
    else if (/hard|khó/i.test(diffRaw)) difficulty = 'Hard';

    const imgVal = imgIdx >= 0 ? row[imgIdx] : undefined;

    results.push({
      question: questionText,
      options: opts,
      correctAnswer: parsedAns.primary,
      correctAnswers: parsedAns.all,
      explanation: explanation || 'No explanation provided.',
      note,
      difficulty,
      imageUrl: imgVal,
      valid: Boolean(questionText),
    });
  }

  return results;
};

export const exportToJSON = (quiz: Quiz): void => {
  const jsonStr = JSON.stringify(quiz, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${quiz.title.toLowerCase().replace(/\s+/g, '_')}_quiz.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToCSV = (quiz: Quiz): void => {
  const headers = ['Question', 'Options', 'Correct Answer', 'Explanation', 'Note', 'Difficulty'];
  const rows = quiz.questions.map((q) => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const correctList = q.correctAnswers || [q.correctAnswer];
    const ansText = correctList.map((i) => letters[i] || i + 1).join(', ');
    return [
      `"${q.question.replace(/"/g, '""')}"`,
      `"${q.options.map((o, i) => `${letters[i] || i + 1}. ${o}`).join(' | ').replace(/"/g, '""')}"`,
      `"${ansText}"`,
      `"${(q.explanation || '').replace(/"/g, '""')}"`,
      `"${(q.note || '').replace(/"/g, '""')}"`,
      q.difficulty,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${quiz.title.toLowerCase().replace(/\s+/g, '_')}_quiz.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
