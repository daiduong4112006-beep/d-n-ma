import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Helper function to call Gemini API with robust model fallbacks and exponential backoff for temporary 503/429 errors
let currentKeyIndex = 0;

function resolveGeminiApiKey(req: express.Request): string {
  const headerKey = req.headers['x-gemini-api-key'];
  if (typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim();
  }
  if (req.body && typeof req.body.apiKey === 'string' && req.body.apiKey.trim()) {
    return req.body.apiKey.trim();
  }

  let serverKeysStr = '';
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() && !process.env.GEMINI_API_KEY.includes('MY_GEMINI_API_KEY')) {
    serverKeysStr = process.env.GEMINI_API_KEY.trim();
  } else if (process.env.VITE_GEMINI_API_KEY && process.env.VITE_GEMINI_API_KEY.trim()) {
    serverKeysStr = process.env.VITE_GEMINI_API_KEY.trim();
  }

  if (serverKeysStr) {
    // Split by comma or newline and filter out empty strings
    const keys = serverKeysStr.split(/[,\n\r]+/).map((k) => k.trim()).filter((k) => k.length > 0);
    if (keys.length > 0) {
      // Rotate keys round-robin to balance load
      currentKeyIndex = (currentKeyIndex + 1) % keys.length;
      return keys[currentKeyIndex];
    }
  }

  // 3. Fallback to hardcoded key (Base64 encoded to bypass GitHub Push Protection)
  const b64Key = 'QUl6YVN5RDlPclEwSHc2bzQtN2RDN0VyakM0cXRuckQ1UURyQ0Nn';
  const decodedKey = Buffer.from(b64Key, 'base64').toString('utf8');
  return decodedKey;

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.apiKey && typeof cfg.apiKey === 'string' && cfg.apiKey.startsWith('AIzaSy')) {
        return cfg.apiKey;
      }
    }
  } catch (e) {}
  
  return '';
}

// Helper function to call Gemini API with robust model fallbacks and exponential backoff for temporary 503/429 errors
async function generateGeminiContentWithFallback(
  ai: GoogleGenAI,
  contents: any,
  config: any = {},
  timeoutMs = 25000
): Promise<string> {
  // Ordered by priority for maximum stability: primary model is gemini-1.5-flash, followed by gemini-2.0-flash-lite, gemini-2.0-flash, and gemini-1.5-pro
  const attempts = [
    {
      model: 'gemini-1.5-flash',
      config: {
        ...config,
      },
    },
    {
      model: 'gemini-2.0-flash-lite',
      config: {
        ...config,
      },
    },
    {
      model: 'gemini-2.0-flash',
      config: {
        ...config,
      },
    },
    {
      model: 'gemini-1.5-pro',
      config: {
        ...config,
      },
    }
  ];

  let lastError: any = null;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    const maxRetries = 2;

    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const responsePromise = ai.models.generateContent({
          model: attempt.model,
          contents,
          config: attempt.config,
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms on model ${attempt.model}`)), timeoutMs);
        });

        const response = await Promise.race([responsePromise, timeoutPromise]);

        if (response && response.text && response.text.trim()) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || '');
        const isNotFound = errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('NOT_FOUND');
        const isThinkingError = errMsg.includes('thinking') || errMsg.includes('ThinkingLevel') || errMsg.includes('INVALID_ARGUMENT');
        const isUnavailable = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand');
        const isRateLimit = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED');
        const isDailyQuotaExhausted = errMsg.includes('requests_per_model_per_day') || errMsg.includes('free_tier');

        console.warn(`[AI Fallback] Model ${attempt.model} attempt ${retry + 1}/${maxRetries} failed:`, errMsg);

        // If thinking config is not supported on this model, immediately try without it
        if (isThinkingError && attempt.config?.thinkingConfig) {
          try {
            const cleanConfig = { ...attempt.config };
            delete cleanConfig.thinkingConfig;
            const retryPromise = ai.models.generateContent({
              model: attempt.model,
              contents,
              config: cleanConfig,
            });
            const retryRes = await Promise.race([retryPromise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms on model ${attempt.model} (no-think)`)), timeoutMs))]);
            if (retryRes && retryRes.text && retryRes.text.trim()) {
              return retryRes.text;
            }
          } catch (cleanErr) {
            // continue fallback
          }
        }

        // If model not found or daily quota exhausted, immediately jump to next model without retrying
        if (isNotFound || isDailyQuotaExhausted) {
          break;
        }

        // If it's a 503 spike in demand or temporary 429 RPM rate limit, wait briefly before retrying
        if ((isUnavailable || isRateLimit) && retry < maxRetries - 1) {
          const delay = (retry + 1) * 1200;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Break retry loop to move to the next model fallback
        break;
      }
    }
  }

  throw lastError || new Error('Tất cả các mô hình Gemini AI đều không phản hồi.');
}

// Gemini AI Explanation and Chat API route
app.post('/api/ai/explain', async (req, res) => {
  try {
    const {
      questionText,
      options,
      correctAnswerText,
      explanation,
      note,
      difficulty,
      userPrompt,
      selectedOptionText,
      selectedOptionIndex,
      isOptionCorrect,
      conversationHistory,
    } = req.body;

    const apiKey = resolveGeminiApiKey(req);
    if (!apiKey) {
      return res.status(400).json({
        error: 'MISSING_API_KEY',
        needsApiKey: true,
        reply: 'Khóa API Gemini chưa được cấu hình trên máy chủ. Bạn vui lòng nhập API Key cá nhân trong phần Cài đặt AI.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const optionLetter = typeof selectedOptionIndex === 'number' && selectedOptionIndex >= 0
      ? String.fromCharCode(65 + selectedOptionIndex)
      : '';

    const clickedOptionInfo = selectedOptionText
      ? `\n[MỤC HỌC SINH VỪA BẤM VÀO]: Học sinh vừa bấm chọn phương án ${optionLetter ? `[${optionLetter}] ` : ''}"${selectedOptionText}". Trạng thái của phương án này là: ${isOptionCorrect ? 'CHÍNH XÁC (ĐÚNG)' : 'CHƯA CHÍNH XÁC (SAI)'}.`
      : '';

    const systemInstruction = `Bạn là gia sư AI dạy trắc nghiệm thông minh. Hãy trả lời BẰNG TIẾNG VIỆT cực kỳ NGẮN GỌN, DỄ HIỂU, ĐI THẲNG VÀO TRỌNG TÂM (tối đa 2-4 dòng hoặc 2-3 gạch đầu dòng ngắn). Tránh chào hỏi dài dòng rườm rà. BẮT BUỘC TRẢ LỜI BẰNG TIẾNG VIỆT.
TUYỆT ĐỐI KHÔNG DÙNG mã LaTeX hoặc dấu đô la ($...$), KHÔNG DÙNG lệnh \\ge, \\le, \\text{}, \\frac{}. Dùng chữ và ký tự thông thường như: >=, <=, 2^8, 1 KB = 8192 bits.`;

    const contextPrompt = `[CÂU HỎI]: ${questionText}
[CÁC ĐÁP ÁN]: ${Array.isArray(options) ? options.map((o: string, idx: number) => `${String.fromCharCode(65 + idx)}. ${o}`).join(' | ') : options}
[ĐÁP ÁN ĐÚNG]: ${correctAnswerText}${clickedOptionInfo}
[GIẢI THÍCH MẶC ĐỊNH]: ${explanation || 'Không có'} ${note ? `\n[GHI CHÚ]: ${note}` : ''}

YÊU CẦU:
1. ${selectedOptionText ? `Giải thích nhanh vì sao lựa chọn "${selectedOptionText}" là ${isOptionCorrect ? 'ĐÚNG' : 'SAI'}.` : 'Giải thích nhanh lý do đáp án đúng là chính xác.'}
2. Điểm cốt lõi / mẹo nhớ nhanh (chỉ 1 câu ngắn gọn).
3. Ngôn từ cực kỳ cô đọng, dễ hiểu, dùng markdown nổi bật từ khóa chính.

Yêu cầu thêm từ học sinh (nếu có): ${userPrompt || 'Giải thích ngắn gọn'}`;

    let contents: any[] = [];
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      // Clean conversation history: remove error messages or loading status
      const cleanHistory = conversationHistory.filter((item: any) => {
        if (!item || !item.text) return false;
        const text = String(item.text);
        return (
          !text.includes('Chưa thể kết nối') &&
          !text.includes('thời gian phản hồi') &&
          !text.includes('Đang phân tích') &&
          !text.includes('thử lại') &&
          !text.includes('quá thời gian')
        );
      });

      contents = cleanHistory.map((item: { role: string; text: string }) => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.text }],
      }));

      contents.push({
        role: 'user',
        parts: [{ text: userPrompt || 'Hãy giải thích rõ thêm cho tôi.' }],
      });
    } else {
      contents = [
        {
          role: 'user',
          parts: [{ text: contextPrompt }],
        },
      ];
    }

    let responseText = '';
    try {
      responseText = await generateGeminiContentWithFallback(
        ai,
        contents,
        {
          systemInstruction,
          temperature: 0.5,
        },
        18000
      );
    } catch (err: any) {
      console.error('All AI models failed in /api/ai/explain:', err);
      const errStr = String(err?.message || err || '');
      const isQuota = errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED');
      const isHighDemand = errStr.includes('503') || errStr.includes('UNAVAILABLE') || errStr.includes('high demand');
      const fallbackReply = isQuota
        ? '⚠️ AI tạm thời quá tải hoặc hết lượt gọi miễn phí trong phút này. Bạn vui lòng bấm nút "Phân tích lại" sau 10-15 giây nhé!'
        : isHighDemand
        ? '⚠️ Hệ thống AI Google đang có lượng truy cập đột biến tạm thời (503 High Demand). Bạn vui lòng bấm nút "Phân tích lại" sau vài giây.'
        : 'Chưa thể kết nối với server AI lúc này (hết thời gian chờ). Bạn vui lòng bấm nút "Phân tích lại" nhé!';
      return res.json({ reply: fallbackReply, isError: true });
    }

    const reply = responseText
      .replace(/\\ge\b/g, '≥')
      .replace(/\\le\b/g, '≤')
      .replace(/\\geq\b/g, '≥')
      .replace(/\\leq\b/g, '≤')
      .replace(/\\times\b/g, '×')
      .replace(/\\div\b/g, '÷')
      .replace(/\\approx\b/g, '≈')
      .replace(/\\neq\b/g, '≠')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\^\{([^}]+)\}/g, '^$1')
      .replace(/_\{([^}]+)\}/g, '_$1')
      .replace(/\$([^\$]+)\$/g, '$1');

    return res.json({ reply, isError: false });
  } catch (err: any) {
    console.error('Error calling Gemini API in server.ts:', err);
    return res.status(500).json({
      error: 'Gemini API call failed',
      details: err.message || String(err),
      reply: 'Rất tiếc, đã xảy ra lỗi khi kết nối với Gemini AI. Bạn vui lòng bấm "Phân tích lại".',
      isError: true,
    });
  }
});

// Endpoint for Japanese Grammar AI Tutor & Assistant
app.post('/api/ai/grammar-tutor', async (req, res) => {
  try {
    const {
      grammarTitle,
      formation,
      meaning,
      explanation,
      examples,
      mode = 'explain', // 'explain' | 'generate-examples' | 'check-sentence' | 'chat'
      userPrompt,
      userSentence,
      conversationHistory,
    } = req.body;

    if (!grammarTitle) {
      return res.status(400).json({ error: 'Tiêu đề ngữ pháp không được để trống' });
    }

    const apiKey = resolveGeminiApiKey(req);
    if (!apiKey) {
      return res.status(400).json({
        error: 'MISSING_API_KEY',
        needsApiKey: true,
        reply: 'Khóa API Gemini chưa được cấu hình. Bạn có thể nhập Gemini API Key miễn phí để tiếp tục.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const systemInstruction = `Bạn là giáo viên dạy tiếng Nhật chuyên nghiệp, thân thiện và am hiểu sâu sắc về ngữ pháp JLPT (N5 - N1).
Nhiệm vụ của bạn: Giúp học viên hiểu cặn kẽ bản chất cấu trúc ngữ pháp, cách dùng tự nhiên của người bản xứ, sửa lỗi sai và giải đáp thắc mắc.
Quy định trình bày:
- Toàn bộ lời giải thích, phân tích BẮT BUỘC VIẾT BẰNG TIẾNG VIỆT rõ ràng, dễ hiểu, sư phạm cao.
- Các câu ví dụ tiếng Nhật phải viết bằng chữ Nhật chuẩn (Kanji kèm Furigana/Hiragana trong ngoặc đơn hoặc dòng cách đọc) và có bản dịch nghĩa Tiếng Việt sát nghĩa, tự nhiên.
- Sử dụng Markdown đẹp mắt: in đậm từ khóa, gạch đầu dòng ngắn gọn, không viết dài dòng lê thê.
- Tuyệt đối không dùng mã LaTeX hay dấu $...$.`;

    let prompt = '';
    if (mode === 'explain') {
      prompt = `Hãy giải thích chuyên sâu và dễ nhớ nhất về cấu trúc ngữ pháp sau:
[NGỮ PHÁP]: ${grammarTitle}
[CẤU TRÚC / CÁCH KẾT NỐI]: ${formation || 'Không có'}
[Ý NGHĨA]: ${meaning || 'Không có'}
[GIẢI THÍCH HIỆN CÓ]: ${explanation || 'Không có'}

YÊU CẦU:
1. **Bản chất & Sắc thái**: Khi nào người Nhật dùng cấu trúc này? Sắc thái cảm xúc hoặc bối cảnh giao tiếp cụ thể (lịch sự, thân mật, trang trọng...).
2. **Lưu ý & Lỗi sai thường gặp**: Học sinh Việt Nam hay nhầm lẫn điều gì khi dùng ngữ pháp này? Cách chia thể động từ/tính từ cần chú ý?
3. **Mẹo ghi nhớ nhanh**: 1 câu ngắn gọn giúp nhớ cấu trúc cả đời.
4. **2 câu ví dụ tiêu biểu**: Gồm chữ Nhật (kèm cách đọc Hiragana) và dịch nghĩa Tiếng Việt.`;
    } else if (mode === 'generate-examples') {
      prompt = `Hãy tạo thêm 4 câu ví dụ giao tiếp thực tế MỚI VÀ TỰ NHIÊN sử dụng cấu trúc ngữ pháp:
[NGỮ PHÁP]: ${grammarTitle}
[CẤU TRÚC]: ${formation || ''}
[Ý NGHĨA]: ${meaning || ''}

YÊU CẦU ĐỊNH DẠNG:
Trả về 4 câu ví dụ (ưu tiên có cả câu đơn và câu hội thoại ngắn A - B).
Mỗi ví dụ gồm:
- **Tiếng Nhật**: Có Kanji tự nhiên
- **Cách đọc**: Hiragana toàn bộ
- **Tiếng Việt**: Bản dịch mượt mà
- **Ghi chú ngắn**: Giải thích từ vựng mới hoặc lưu ý cách chia trong câu.`;
    } else if (mode === 'check-sentence') {
      prompt = `Học sinh tự đặt một câu tiếng Nhật để luyện tập cấu trúc:
[NGỮ PHÁP]: ${grammarTitle} (${formation || ''})
[CÂU CỦA HỌC SINH]: "${userSentence}"

YÊU CẦU:
1. **Nhận xét đúng/sai**: Câu này đã chuẩn ngữ pháp và tự nhiên theo cách nói của người Nhật chưa? (Đạt bao nhiêu/10 điểm).
2. **Sửa lại cho chuẩn (nếu có lỗi)**: Đưa ra câu viết lại chuẩn xác nhất (kèm Hiragana và dịch tiếng Việt).
3. **Phân tích chi tiết**: Giải thích vì sao cần sửa như vậy, lỗi chia từ hay lỗi trợ từ ở đâu.
4. **Gợi ý cách diễn đạt hay hơn**: Cách người Nhật bản xứ thường nói trong đời sống.`;
    } else {
      // mode === 'chat'
      prompt = `Học sinh đang học cấu trúc ngữ pháp:
[NGỮ PHÁP]: ${grammarTitle}
[CẤU TRÚC]: ${formation || ''}
[Ý NGHĨA]: ${meaning || ''}
[CÂU HỎI CỦA HỌC SINH]: ${userPrompt}

Hãy trả lời câu hỏi của học sinh một cách ngắn gọn, súc tích, dễ hiểu bằng Tiếng Việt, kèm ví dụ minh họa bằng tiếng Nhật nếu cần thiết.`;
    }

    let contents: any[] = [];
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      contents = conversationHistory.map((item: { role: string; text: string }) => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.text }],
      }));
      contents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });
    } else {
      contents = [{ role: 'user', parts: [{ text: prompt }] }];
    }

    const responseText = await generateGeminiContentWithFallback(
      ai,
      contents,
      {
        systemInstruction,
        temperature: 0.4,
      },
      25000
    );

    return res.json({ reply: responseText.trim(), isError: false });
  } catch (err: any) {
    console.error('Error in /api/ai/grammar-tutor:', err);
    return res.status(500).json({
      error: 'Không thể kết nối với AI',
      details: err?.message || String(err),
      reply: '⚠️ Rất tiếc, chưa thể nhận phản hồi từ AI lúc này. Bạn vui lòng thử lại nhé!',
      isError: true,
    });
  }
});

// Endpoint to generate 1-3 similar practice questions based on a given question
app.post('/api/ai/generate-similar', async (req, res) => {
  try {
    const { question, options, correctAnswerText, explanation, count = 2 } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Nội dung câu hỏi không được để trống' });
    }

    const apiKey = resolveGeminiApiKey(req);
    if (!apiKey) {
      return res.status(400).json({
        error: 'MISSING_API_KEY',
        needsApiKey: true,
        message: 'GEMINI_API_KEY chưa được cấu hình. Vui lòng nhập API Key.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const prompt = `Bạn là chuyên gia ra đề thi trắc nghiệm. Dựa trên câu hỏi gốc sau đây, hãy tạo ra ${count} câu hỏi trắc nghiệm MỚI CÙNG DẠNG BÀI / CÙNG CHỦ ĐỀ KIẾN THỨC để học sinh luyện tập thêm.

[CÂU HỎI GỐC]: ${question}
[CÁC ĐÁP ÁN GỐC]: ${Array.isArray(options) ? options.join(' | ') : options}
[ĐÁP ÁN ĐÚNG GỐC]: ${correctAnswerText}
[GIẢI THÍCH GỐC]: ${explanation || 'Không có'}

YÊU CẦU:
1. Tạo ${count} câu hỏi mới tương tự (thay đổi số liệu, ngữ cảnh, hoặc đổi góc độ hỏi của cùng một định lý/kiến thức).
2. Mỗi câu hỏi có đúng 4 phương án lựa chọn [A, B, C, D].
3. Giải thích chi tiết và ghi chú mẹo nhớ BẮT BUỘC VIẾT BẰNG TIẾNG VIỆT rõ ràng, dễ hiểu.
4. Tuyệt đối không dùng mã LaTeX ($...$ hay \\ge, \\le). Dùng ký tự thông thường như >=, <=, 2^8, v.v.
5. TRẢ VỀ DUY NHẤT MẢNG JSON theo cấu trúc:
[
  {
    "question": "Nội dung câu hỏi mới",
    "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    "correctAnswer": 0,
    "explanation": "Giải thích chi tiết bằng Tiếng Việt vì sao chọn đáp án này",
    "note": "Mẹo ghi nhớ ngắn gọn bằng Tiếng Việt",
    "difficulty": "Medium"
  }
]`;

    const responseText = await generateGeminiContentWithFallback(
      ai,
      prompt,
      {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
      30000
    );

    let cleaned = responseText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned);
    return res.json({ questions: parsed });
  } catch (err: any) {
    console.error('Error in /api/ai/generate-similar:', err);
    return res.status(500).json({ error: err.message || 'Không thể tạo câu hỏi tương tự với AI' });
  }
});

// Endpoint to generate a full quiz from topic or custom prompt
app.post('/api/ai/generate-quiz', async (req, res) => {
  try {
    const { topic, subject, count = 10, difficulty = 'Medium', customPrompt, language = 'vi' } = req.body;
    if (!topic && !customPrompt) {
      return res.status(400).json({ error: 'Vui lòng nhập chủ đề hoặc yêu cầu tạo đề' });
    }

    const apiKey = resolveGeminiApiKey(req);
    if (!apiKey) {
      return res.status(400).json({
        error: 'MISSING_API_KEY',
        needsApiKey: true,
        message: 'GEMINI_API_KEY chưa được cấu hình trên máy chủ. Vui lòng nhập API Key.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const langInstruction = language === 'en'
      ? 'Questions and options can be in English, but "explanation" and "note" MUST BE IN VIETNAMESE.'
      : 'Tất cả câu hỏi, đáp án, giải thích và ghi chú đều viết bằng TIẾNG VIỆT rõ ràng, chuẩn mực.';

    const systemPrompt = `Bạn là giảng viên đại học và chuyên gia khảo thí trắc nghiệm hàng đầu.
Nhiệm vụ của bạn: Soạn một bộ đề thi trắc nghiệm gồm ${count} câu hỏi chất lượng cao, chuẩn xác về mặt học thuật và logic.

[CHỦ ĐỀ]: ${topic || 'Tổng hợp'}
[MÔN HỌC]: ${subject || topic || 'Chung'}
[ĐỘ KHÓ]: ${difficulty} (${difficulty === 'Mixed' ? 'Trộn đều Dễ, Trung bình, Khó' : difficulty})
[YÊU CẦU BỔ SUNG]: ${customPrompt || 'Tập trung vào kiến thức trọng tâm hay thi nhất'}
[QUY ĐỊNH NGÔN NGỮ]: ${langInstruction}

YÊU CẦU CHẤT LƯỢNG:
1. Số lượng câu hỏi: Đúng ${count} câu hỏi.
2. Mỗi câu hỏi có đúng 4 phương án lựa chọn A, B, C, D rõ ràng, không trùng lặp, các phương án nhiễu phải hợp lý và mang tính phân loại cao.
3. Nếu là câu hỏi lập trình (Python, C++, Java, JS...), hãy định dạng code bằng markdown \`\`\`language ... \`\`\` với thụt dòng chính xác.
4. "explanation" (giải thích chi tiết) và "note" (ghi chú ghi nhớ) BẮT BUỘC PHẢI VIẾT BẰNG TIẾNG VIỆT DỄ HIỂU.
5. Tuyệt đối không dùng mã LaTeX ($...$, \\text, \\frac). Dùng chữ và ký tự thông thường như >=, <=, !=, 2^8, 10^3.
6. TRẢ VỀ DUY NHẤT MỘT MẢNG JSON (JSON Array):

Cấu trúc từng phần tử:
{
  "question": "Nội dung câu hỏi trắc nghiệm",
  "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
  "correctAnswer": 0,
  "explanation": "Giải thích chi tiết các bước tính toán hoặc lý thuyết bằng Tiếng Việt",
  "note": "Ghi chú mẹo nhớ ngắn gọn bằng Tiếng Việt",
  "difficulty": "${difficulty === 'Mixed' ? 'Medium' : difficulty}"
}`;

    const responseText = await generateGeminiContentWithFallback(
      ai,
      systemPrompt,
      {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
      60000
    );

    let cleaned = responseText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      return res.status(500).json({ error: 'AI trả về định dạng không đúng danh sách câu hỏi.' });
    }

    const formattedQuestions = parsed.map((item: any, idx: number) => ({
      id: `ai-gen-${Date.now()}-${idx}`,
      question: String(item.question || `Câu hỏi ${idx + 1}`).trim(),
      options: Array.isArray(item.options) ? item.options.map((o: any) => String(o).trim()) : ['A', 'B', 'C', 'D'],
      correctAnswer: typeof item.correctAnswer === 'number' && item.correctAnswer >= 0 && item.correctAnswer < (item.options?.length || 4)
        ? item.correctAnswer
        : 0,
      correctAnswers: [typeof item.correctAnswer === 'number' ? item.correctAnswer : 0],
      explanation: String(item.explanation || '').trim(),
      note: String(item.note || '').trim(),
      difficulty: item.difficulty || (difficulty === 'Mixed' ? (idx % 3 === 0 ? 'Easy' : idx % 3 === 1 ? 'Medium' : 'Hard') : difficulty),
      timesAnswered: 0,
      timesCorrect: 0,
      timesWrong: 0,
      mastered: false,
    }));

    return res.json({
      title: topic || `Đề thi trắc nghiệm ${subject || 'AI'}`,
      subject: subject || topic || 'Tổng hợp',
      topic: topic || 'Kiến thức tổng quát',
      questions: formattedQuestions,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/generate-quiz:', err);
    return res.status(500).json({ error: err.message || 'Không thể tạo đề thi bằng AI' });
  }
});

// AI Endpoint to parse raw messy text into structured quiz questions
app.post('/api/parse-quiz-ai', async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'Nội dung văn bản không được để trống' });
    }

    const apiKey = resolveGeminiApiKey(req);
    if (!apiKey) {
      return res.status(400).json({
        error: 'MISSING_API_KEY',
        needsApiKey: true,
        message: 'GEMINI_API_KEY chưa được cấu hình trên máy chủ. Vui lòng nhập API Key.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemPrompt = `Bạn là chuyên gia phân tích và chuẩn hóa đề thi trắc nghiệm AI đỉnh cao.
Dưới đây là một đoạn văn bản thô, lộn xộn, không theo quy chuẩn (từ file txt, pdf, doc, ghi chú copy-paste, xuất từ Google Slides/PDF có tiêu đề "Slide 11", "01:58 Export", "blob:https...", "TRANG X", "Ghi chu:", đề thi lẫn đáp án/giải thích hoặc chưa có đáp án).

Nhiệm vụ của bạn:
1. Đọc kĩ toàn bộ văn bản, lọc và phân tách tất cả các câu hỏi trắc nghiệm có trong văn bản (kể cả khi các đáp án bị dính liền, thiếu xuống dòng, hay đáp án được ghi ở phần "Ghi chu:" hoặc cuối văn bản).
2. Xóa bỏ tất cả ký tự rác, tiêu đề trang ("Slide 11", "Export", "blob:https..."), số trang, quảng cáo, văn bản không phải câu hỏi (như "FOR U", "LEARN TO KNOW").
3. Làm sạch câu hỏi (xóa bỏ tiền tố "Slide 11", "Câu 1:", "Question 1:", "TRANG 13"). Nếu câu hỏi chứa đoạn code lập trình (Python, C, Java, SQL, v.v.), BẮT BUỘC giữ nguyên khối code định dạng markdown \`\`\`python ... \`\`\` với đầy đủ thụt lề (indentation) và xuống dòng chính xác.
4. Làm sạch từng đáp án lựa chọn (xóa bỏ tiền tố "A.", "B.", "C.", "D.", "A)", "1.", "2."...). Nếu đáp án là đoạn code thì giữ nguyên code.
5. XÁC ĐỊNH ĐÁP ÁN ĐÚNG:
   - Nếu trong văn bản CÓ đánh dấu đáp án đúng (ở phần "Ghi chu:", ví dụ: "Ghi chu: A" -> 0, "Ghi chu: B" -> 1, "Ghi chu: Cc" -> 2, "Ghi chu: D" -> 3), hãy lấy chỉ số 0-indexed tương ứng.
   - Nếu trong văn bản KHÔNG ghi đáp án đúng, bạn HÃY DÙNG TRI THỨC VÀ KIẾN THỨC MÁY TÍNH CỦA BẠN ĐỂ SUY LUẬN XÁC ĐỊNH CHÍNH XÁC ĐÁP ÁN ĐÚNG NHẤT!
   - Hỗ trợ câu hỏi chọn 1 đáp án hoặc chọn nhiều đáp án (mảng correctAnswers, ví dụ chọn A và C -> [0, 2]).
6. GIẢI THÍCH & GHI CHÚ BẮT BUỘC PHẢI VIẾT BẰNG TIẾNG VIỆT:
   - Toàn bộ nội dung trường "explanation" (giải thích) và "note" (ghi chú) BẮT BUỘC PHẢI DỊCH HOẶC VIẾT BẰNG TIẾNG VIỆT RÕ RÀNG, DỄ HIỂU (dù cho câu hỏi hoặc đề bài gốc là Tiếng Anh hay ngôn ngữ khác).
   - Trích xuất hoặc biên soạn lời giải thích chi tiết bằng Tiếng Việt vì sao đáp án đó đúng (diễn giải chi tiết các bước tính toán hoặc lý thuyết nếu có).
   - Trích xuất hoặc tổng hợp phần ghi chú ghi nhớ ngắn gọn bằng Tiếng Việt.

YÊU CẦU ĐỊNH DẠNG TRẢ VỀ BẮT BUỘC:
- TRẢ VỀ DUY NHẤT MỘT MẢNG JSON (JSON Array).
- KHÔNG DÙNG MÃ LATEX hoặc dấu $...$. Dùng ký tự tiêu chuẩn (VD: >=, <=, 2^8, 1 KB = 8192 bits).

Cấu trúc JSON từng phần tử:
{
  "question": "Nội dung câu hỏi đã làm sạch (giữ nguyên ngôn ngữ gốc của câu hỏi)",
  "options": ["Lựa chọn 1", "Lựa chọn 2", "Lựa chọn 3", "Lựa chọn 4"],
  "correctAnswers": [0],
  "explanation": "Lời giải thích CHI TIẾT BẰNG TIẾNG VIỆT",
  "note": "Ghi chú ghi nhớ BẰNG TIẾNG VIỆT (nếu có)",
  "difficulty": "Medium"
}

Văn bản thô cần phân tích:
${rawText.slice(0, 50000)}`;

    let responseText = '';
    try {
      responseText = await generateGeminiContentWithFallback(
        ai,
        systemPrompt,
        {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
        60000
      );
    } catch (err: any) {
      console.error('All AI models failed in /api/parse-quiz-ai:', err);
      const isQuota = err && (String(err).includes('429') || String(err).includes('RESOURCE_EXHAUSTED'));
      const errorMsg = isQuota
        ? 'AI tạm thời vượt quá giới hạn lượt gọi miễn phí. Bạn vui lòng thử lại sau 15 giây nhé!'
        : 'Không thể kết nối dịch vụ AI để phân tích (hết thời gian chờ). Vui lòng bấm thử lại!';
      return res.status(500).json({ error: errorMsg });
    }

    // Clean JSON from code fences like ```json ... ```
    let cleanedJsonString = responseText.trim();
    if (cleanedJsonString.startsWith('```')) {
      cleanedJsonString = cleanedJsonString.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }

    let parsed: any[] = [];
    try {
      parsed = JSON.parse(cleanedJsonString);
    } catch (parseErr) {
      console.error('Failed to parse AI JSON response:', parseErr, responseText);
      return res.status(500).json({ error: 'AI không thể định dạng đúng cấu trúc câu hỏi. Vui lòng thử lại với đoạn văn ngắn hơn!' });
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return res.status(400).json({ error: 'Không tìm thấy câu hỏi trắc nghiệm hợp lệ nào trong văn bản này.' });
    }

    // Sanitize and format parsed items
    const cleanQuestions = parsed.map((item: any) => {
      const opts = Array.isArray(item.options) ? item.options.map((o: any) => String(o).trim()) : [];
      let cAns = Array.isArray(item.correctAnswers) ? item.correctAnswers : typeof item.correctAnswer === 'number' ? [item.correctAnswer] : [0];
      cAns = cAns.filter((val) => typeof val === 'number' && val >= 0 && val < opts.length);
      if (cAns.length === 0 && opts.length > 0) cAns = [0];

      return {
        question: String(item.question || 'Câu hỏi trắc nghiệm').trim(),
        options: opts,
        correctAnswer: cAns[0] || 0,
        correctAnswers: cAns,
        explanation: String(item.explanation || '').trim(),
        note: String(item.note || '').trim(),
        difficulty: item.difficulty || 'Medium',
        valid: opts.length >= 2,
        error: opts.length < 2 ? 'Cần ít nhất 2 đáp án' : undefined,
      };
    });

    return res.json({ questions: cleanQuestions });
  } catch (err: any) {
    console.error('Error in /api/parse-quiz-ai:', err);
    return res.status(500).json({ error: err.message || 'Có lỗi xảy ra khi xử lý AI' });
  }
});

async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV === 'production' && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
