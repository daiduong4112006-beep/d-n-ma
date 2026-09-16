import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Lightbulb } from 'lucide-react';
import { cleanLatexText } from '../utils/textCleaner';

interface ExplanationBoxProps {
  explanation: string;
  className?: string;
}

export const ExplanationBox: React.FC<ExplanationBoxProps> = ({ explanation, className = '' }) => {
  if (!explanation) return null;

  return (
    <div
      className={`p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-indigo-950 dark:text-indigo-200 transition-all ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div className="space-y-1 flex-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Giải thích chi tiết
          </h4>
          <div className="markdown-content text-sm leading-relaxed">
            <ReactMarkdown>{cleanLatexText(explanation)}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
