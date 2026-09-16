import React, { useState, useMemo } from 'react';
import { X, Check, FileText } from 'lucide-react';
import { JapaneseVocabCard } from '../../types/japanese';

interface JapaneseBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCards: (cards: JapaneseVocabCard[]) => void;
}

export const JapaneseBulkImportModal: React.FC<JapaneseBulkImportModalProps> = ({
  isOpen,
  onClose,
  onImportCards,
}) => {
  const [rawText, setRawText] = useState(
    `電車 (でんしゃ)\tTàu điện\n駅 (えき)\tNhà ga\n本 (ほん)\tSách\n学校 (がっこう)\tTrường học`
  );
  const [termDefSeparator, setTermDefSeparator] = useState<'tab' | 'comma' | 'custom'>('tab');
  const [customTermDefSep, setCustomTermDefSep] = useState('-');

  const [cardSeparator, setCardSeparator] = useState<'newline' | 'semicolon' | 'custom'>('newline');
  const [customCardSep, setCustomCardSep] = useState(';');

  // Parse cards based on current settings
  const parsedCards = useMemo(() => {
    if (!rawText.trim()) return [];

    let cardSplitter = '\n';
    if (cardSeparator === 'semicolon') cardSplitter = ';';
    else if (cardSeparator === 'custom') cardSplitter = customCardSep || '\n';

    const rawCardBlocks = rawText
      .split(cardSplitter)
      .map((b) => b.trim())
      .filter(Boolean);

    const cards: JapaneseVocabCard[] = [];

    rawCardBlocks.forEach((block, index) => {
      let parts: string[] = [];
      if (termDefSeparator === 'tab') {
        parts = block.split('\t');
        if (parts.length === 1 && block.includes('  ')) {
          parts = block.split(/ {2,}/); // Fallback to multiple spaces if copied from web
        }
      } else if (termDefSeparator === 'comma') {
        parts = block.split(',');
      } else {
        parts = block.split(customTermDefSep || '-');
      }

      const termRaw = (parts[0] || '').trim();
      const defRaw = (parts.slice(1).join(' - ') || '').trim();

      if (termRaw || defRaw) {
        // Parse reading if format is: Kanji (reading) or Kanji [reading]
        let term = termRaw;
        let reading = '';
        const match = termRaw.match(/^(.*?)[(\[（](.*?)[)\]）]$/);
        if (match) {
          term = match[1].trim();
          reading = match[2].trim();
        }

        cards.push({
          id: `jp-card-bulk-${Date.now()}-${index}`,
          term: term || termRaw,
          reading: reading || undefined,
          definition: defRaw || 'Chưa nhập nghĩa',
          example: '',
          mastered: false,
        });
      }
    });

    return cards;
  }, [rawText, termDefSeparator, customTermDefSep, cardSeparator, customCardSep]);

  if (!isOpen) return null;

  const handleImport = () => {
    if (parsedCards.length === 0) return;
    onImportCards(parsedCards);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>Nhập dữ liệu</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Chép và dán dữ liệu ở đây (từ Word, Excel, Google Docs, Anki, Quizlet v.v.)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Main Text Area */}
          <div className="space-y-1.5">
            <textarea
              rows={7}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Từ 1	Định nghĩa 1&#10;Từ 2	Định nghĩa 2&#10;Từ 3	Định nghĩa 3"
              className="w-full p-4 bg-slate-950/90 border border-slate-700/90 rounded-2xl text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-y"
            />
          </div>

          {/* Delimiters Config Row (Matches Screenshot 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
            {/* Giữa thuật ngữ và định nghĩa */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-300 block">
                Giữa thuật ngữ và định nghĩa
              </span>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="termDefSep"
                    checked={termDefSeparator === 'tab'}
                    onChange={() => setTermDefSeparator('tab')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Tab (Mặc định khi copy từ Excel, Docs)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="termDefSep"
                    checked={termDefSeparator === 'comma'}
                    onChange={() => setTermDefSeparator('comma')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Phẩy ( , )</span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer shrink-0">
                    <input
                      type="radio"
                      name="termDefSep"
                      checked={termDefSeparator === 'custom'}
                      onChange={() => setTermDefSeparator('custom')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Tùy chỉnh:</span>
                  </label>
                  <input
                    type="text"
                    value={customTermDefSep}
                    onChange={(e) => {
                      setCustomTermDefSep(e.target.value);
                      setTermDefSeparator('custom');
                    }}
                    placeholder="ví dụ: -"
                    className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Giữa các thẻ */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-300 block">
                Giữa các thẻ
              </span>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="cardSep"
                    checked={cardSeparator === 'newline'}
                    onChange={() => setCardSeparator('newline')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Dòng mới (Mỗi dòng là 1 thẻ)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="cardSep"
                    checked={cardSeparator === 'semicolon'}
                    onChange={() => setCardSeparator('semicolon')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Chấm phẩy ( ; )</span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer shrink-0">
                    <input
                      type="radio"
                      name="cardSep"
                      checked={cardSeparator === 'custom'}
                      onChange={() => setCardSeparator('custom')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Tùy chỉnh:</span>
                  </label>
                  <input
                    type="text"
                    value={customCardSep}
                    onChange={(e) => {
                      setCustomCardSep(e.target.value);
                      setCardSeparator('custom');
                    }}
                    placeholder="ví dụ: ///"
                    className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                Xem trước {parsedCards.length} thẻ
              </h3>
              {parsedCards.length === 0 && (
                <span className="text-xs text-amber-400">Không có nội dung để xem trước</span>
              )}
            </div>

            {parsedCards.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {parsedCards.slice(0, 10).map((c, i) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-slate-500 font-bold">{i + 1}</span>
                      <div>
                        <span className="font-bold text-white">{c.term}</span>
                        {c.reading && (
                          <span className="ml-2 text-[11px] text-cyan-400">({c.reading})</span>
                        )}
                      </div>
                    </div>
                    <span className="text-slate-300 font-medium">{c.definition}</span>
                  </div>
                ))}
                {parsedCards.length > 10 && (
                  <p className="text-center text-[11px] text-slate-400 py-1">
                    ...và {parsedCards.length - 10} thẻ khác nữa
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={parsedCards.length === 0}
            onClick={handleImport}
            className="px-5 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            <Check className="w-4 h-4" />
            <span>Nhập {parsedCards.length} thẻ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
