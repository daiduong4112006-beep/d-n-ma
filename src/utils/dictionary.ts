// Comprehensive dictionary and instant translation helper for English-Vietnamese terms

const COMMON_DICTIONARY: Record<string, string> = {
  // Computer Hardware & Architecture
  memory: 'bộ nhớ',
  address: 'địa chỉ',
  field: 'trường (địa chỉ / dữ liệu)',
  word: 'từ máy (đơn vị dữ liệu CPU, ví dụ 16-bit, 32-bit, 64-bit)',
  indirect: 'gián tiếp (địa chỉ hóa gián tiếp)',
  direct: 'trực tiếp',
  length: 'độ dài / độ rộng',
  usually: 'thường / thông thường',
  greater: 'lớn hơn',
  unlimiting: 'bỏ giới hạn / không hạn chế',
  unlimited: 'không giới hạn',
  range: 'phạm vi / khoảng',
  check: 'kiểm tra',
  bit: 'bit (đơn vị thông tin nhị phân 0 hoặc 1)',
  bits: 'các bit',
  byte: 'byte (8 bits)',
  bytes: 'các byte',
  kbyte: 'Kilobyte (1024 bytes)',
  mbyte: 'Megabyte',
  gbyte: 'Gigabyte',
  needed: 'cần thiết / được yêu cầu',
  need: 'cần',
  hamming: 'mã Hamming (mã kiểm tra và sửa lỗi)',
  error: 'lỗi',
  correction: 'sự hiệu chỉnh / sửa lỗi',
  code: 'mã / mã nguồn',
  detect: 'phát hiện / phát giác',
  detection: 'sự phát hiện lỗi',
  single: 'đơn / đơn lẻ (1)',
  double: 'kép / đôi (2)',
  data: 'dữ liệu',
  bus: 'tuyến bus truyền dữ liệu',
  cpu: 'Bộ xử lý trung tâm (Central Processing Unit)',
  register: 'thanh ghi (vùng nhớ siêu nhanh trong CPU)',
  cache: 'bộ nhớ đệm (Cache)',
  ram: 'Bộ nhớ truy cập ngẫu nhiên (RAM)',
  rom: 'Bộ nhớ chỉ đọc (ROM)',
  pipeline: 'đường ống xử lý lệnh',
  instruction: 'câu lệnh / chỉ thị máy',
  execution: 'sự thực thi / chạy lệnh',
  execute: 'thực thi / chạy',
  fetch: 'nạp / lấy lệnh',
  decode: 'giải mã',
  operand: 'toán hạng',
  opcode: 'mã thao tác (Operation Code)',
  interrupt: 'ngắt hệ thống',
  io: 'vào/ra (Input/Output)',
  device: 'thiết bị',
  processor: 'bộ vi xử lý',
  logic: 'logic / mạch logic',
  gate: 'cổng logic (AND, OR, NOT...)',
  multiplexer: 'bộ dồn kênh (MUX)',
  flipflop: 'mạch lật (Flip-Flop)',
  clock: 'xung nhịp đồng hồ',
  cycle: 'chu kỳ',
  frequency: 'tần số',
  speed: 'tốc độ',
  bandwidth: 'băng thông',
  latency: 'độ trễ',
  throughput: 'năng suất xử lý / thông lượng',
  protocol: 'giao thức truyền thông',
  network: 'mạng máy tính',
  packet: 'gói tin',
  frame: 'khung dữ liệu',
  router: 'bộ định tuyến',
  switch: 'bộ chuyển mạch',
  ip: 'địa chỉ IP',
  port: 'cổng kết nối',
  client: 'máy khách',
  server: 'máy chủ',

  // Data Structures & Algorithms
  tree: 'cây (cấu trúc dữ liệu dạng phân nhánh)',
  binary: 'nhị phân (2 trạng thái 0 và 1)',
  bst: 'Cây tìm kiếm nhị phân (Binary Search Tree)',
  avl: 'Cây AVL tự cân bằng',
  hash: 'Bảng băm / Hàm băm',
  list: 'danh sách',
  linked: 'liên kết',
  array: 'mảng dữ liệu',
  queue: 'hàng đợi (FIFO)',
  stack: 'ngăn xếp (LIFO)',
  node: 'nút / phần tử',
  root: 'nút gốc',
  leaf: 'nút lá (không có con)',
  height: 'chiều cao',
  depth: 'độ sâu',
  complexity: 'độ phức tạp',
  search: 'tìm kiếm',
  sort: 'sắp xếp',
  linear: 'tuyến tính / theo đường thẳng',
  time: 'thời gian',
  space: 'không gian / bộ nhớ',
  worst: 'xấu nhất / tồi tệ nhất',
  best: 'tốt nhất',
  average: 'trung bình',
  case: 'trường hợp',
  degenerate: 'suy biến / biến dạng',
  element: 'phần tử',
  insert: 'chèn / thêm vào',
  delete: 'xóa',
  update: 'cập nhật',
  order: 'thứ tự',
  sorted: 'đã được sắp xếp',
  unbalanced: 'mất cân bằng',
  balanced: 'cân bằng',
  traversal: 'duyệt (duyệt cây/đồ thị)',
  graph: 'đồ thị',
  vertex: 'đỉnh đồ thị',
  vertices: 'các đỉnh đồ thị',
  edge: 'cạnh đồ thị',
  directed: 'có hướng',
  undirected: 'vô hướng',

  // Database & Software Engineering
  database: 'cơ sở dữ liệu',
  query: 'truy vấn',
  table: 'bảng dữ liệu',
  column: 'cột',
  row: 'hàng / bản ghi',
  key: 'khóa',
  primary: 'chính / khóa chính',
  foreign: 'ngoại / khóa ngoại',
  index: 'chỉ mục',
  transaction: 'giao dịch',
  algorithm: 'thuật toán',
  procedure: 'thủ tục',
  function: 'hàm / chức năng',
  variable: 'biến số',
  parameter: 'tham số',
  argument: 'đối số',
  loop: 'vòng lặp',
  condition: 'điều kiện',
  branch: 'nhánh / rẽ nhánh',
  jump: 'nhảy (lệnh nhảy)',
  class: 'lớp (trong lập trình hướng đối tượng)',
  interface: 'giao diện / lớp giao tiếp',
  inheritance: 'kế thừa',
  polymorphism: 'đa hình',
  encapsulation: 'đóng gói',
  abstraction: 'trừu tượng hóa',
  override: 'ghi đè',
  overload: 'nạp chồng',
  method: 'phương thức',
  property: 'thuộc tính',
  object: 'đối tượng',
  instance: 'thể hiện / bản sao của đối tượng',
  virtual: 'ảo (bộ nhớ ảo, hàm ảo)',
  physical: 'vật lý',
  paging: 'phân trang bộ nhớ',
  segmentation: 'phân đoạn bộ nhớ',
  thread: 'luồng xử lý (Thread)',
  process: 'tiến trình (Process)',
  deadlock: 'tắc nghẽn / khóa chết (Deadlock)',
  synchronization: 'sự đồng bộ hóa',
  asynchronous: 'bất đồng bộ',
  concurrent: 'đồng thời',
  parallel: 'song song',
  system: 'hệ thống',
  operating: 'vận hành / hệ điều hành',
  kernel: 'nhân hệ điều hành',
  file: 'tập tin / file',
  directory: 'thư mục',
  compiler: 'trình biên dịch',
  interpreter: 'trình thông dịch',
  syntax: 'cú pháp',
  value: 'giá trị',
  type: 'kiểu dữ liệu',
  pointer: 'con trỏ bộ nhớ',
  reference: 'tham chiếu',
  buffer: 'vùng đệm',

  // Web & UI
  html: 'Ngôn ngữ đánh dấu siêu văn bản (HyperText Markup Language)',
  css: 'Ngôn ngữ định kiểu trang web (Cascading Style Sheets)',
  javascript: 'Ngôn ngữ kịch bản cho trang web (JS)',
  react: 'Thư viện UI phổ biến của Facebook',
  component: 'thành phần giao diện',
  state: 'trạng thái dữ liệu',
  props: 'thuộc tính truyền vào component',
  string: 'chuỗi ký tự',
  number: 'số',
  boolean: 'kiểu đúng/sai (true/false)',

  // General Quiz Words
  what: 'cái gì / điều gì',
  is: 'là',
  are: 'là / ở',
  the: 'thì / là',
  of: 'của',
  in: 'trong / ở trong',
  a: 'một',
  an: 'một',
  if: 'nếu / giả sử',
  into: 'thành / vào trong',
  maintain: 'duy trì / giữ vững',
  self: 'tự / bản thân',
  or: 'hoặc / hay',
  and: 'và',
  with: 'với / cùng với',
  for: 'cho / đối với',
  by: 'bởi / bằng',
  from: 'từ',
  to: 'đến / để',
  which: 'cái nào / điều mà',
  where: 'nơi mà / ở đâu',
  when: 'khi nào / khi',
  why: 'tại sao',
  how: 'như thế nào / bằng cách nào',
  many: 'nhiều / bao nhiêu',
  following: 'sau đây / dưới đây',
  statement: 'phát biểu / câu tuyên bố',
  true: 'đúng',
  false: 'sai',
  correct: 'chính xác',
  incorrect: 'không chính xác',
  definition: 'định nghĩa',
  example: 'ví dụ',
  result: 'kết quả',
  because: 'bởi vì / do',
  due: 'do / bởi vì',
  than: 'hơn (trong so sánh)',
  less: 'ít hơn',
  more: 'nhiều hơn',
  equal: 'bằng / tương đương',
  same: 'giống nhau / tương tự',
  different: 'khác nhau',
  first: 'đầu tiên / thứ nhất',
  second: 'thứ hai',
  third: 'thứ ba',
  last: 'cuối cùng',
  next: 'tiếp theo',
  previous: 'trước đó',
  main: 'chính / chủ yếu',
  core: 'nòng cốt / cốt lõi',
  basic: 'cơ bản',
  advanced: 'nâng cao',
  use: 'sử dụng',
  used: 'được sử dụng',
  using: 'sử dụng',
  make: 'tạo ra / làm',
  makes: 'tạo ra',
  made: 'được tạo ra',
  call: 'gọi / gọi là',
  called: 'được gọi là',
  know: 'biết',
  known: 'được biết đến',
  show: 'hiển thị / chỉ ra',
  shows: 'hiển thị',
  find: 'tìm thấy',
  found: 'tìm thấy / phát hiện',
  get: 'lấy / nhận',
  got: 'đã lấy',
  set: 'thiết lập / tập hợp',
  put: 'đặt / để',
};

/**
 * Normalizes a word and returns its Vietnamese definition or smart breakdown
 */
export function lookupWordDefinition(word: string): string | null {
  const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean) return null;

  // Direct match
  if (COMMON_DICTIONARY[clean]) {
    return COMMON_DICTIONARY[clean];
  }

  // Stemming checks
  // 1. Plural -s or -es
  if (clean.endsWith('s') && clean.length > 3) {
    const stem = clean.slice(0, -1);
    if (COMMON_DICTIONARY[stem]) return COMMON_DICTIONARY[stem];
    if (clean.endsWith('es') && clean.length > 4) {
      const stemEs = clean.slice(0, -2);
      if (COMMON_DICTIONARY[stemEs]) return COMMON_DICTIONARY[stemEs];
    }
    if (clean.endsWith('ies') && clean.length > 4) {
      const stemY = clean.slice(0, -3) + 'y';
      if (COMMON_DICTIONARY[stemY]) return COMMON_DICTIONARY[stemY];
    }
  }

  // 2. Past tense -ed
  if (clean.endsWith('ed') && clean.length > 4) {
    const stemEd = clean.slice(0, -2);
    if (COMMON_DICTIONARY[stemEd]) return COMMON_DICTIONARY[stemEd];
    const stemE = clean.slice(0, -1);
    if (COMMON_DICTIONARY[stemE]) return COMMON_DICTIONARY[stemE];
  }

  // 3. Continuous -ing
  if (clean.endsWith('ing') && clean.length > 5) {
    const stemIng = clean.slice(0, -3);
    if (COMMON_DICTIONARY[stemIng]) return COMMON_DICTIONARY[stemIng];
    const stemIngE = clean.slice(0, -3) + 'e';
    if (COMMON_DICTIONARY[stemIngE]) return COMMON_DICTIONARY[stemIngE];
  }

  // 4. Adverb -ly
  if (clean.endsWith('ly') && clean.length > 4) {
    const stemLy = clean.slice(0, -2);
    if (COMMON_DICTIONARY[stemLy]) return COMMON_DICTIONARY[stemLy];
  }

  return null;
}

/**
 * Async online translation fallback for unknown English words
 */
export async function translateWordOnline(word: string): Promise<string> {
  const clean = word.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean) return 'Không tìm thấy từ';

  // Try local dictionary first
  const local = lookupWordDefinition(clean);
  if (local) {
    return local;
  }

  // Try Google Translate free client
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(clean)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        const trans = data[0][0][0].trim();
        if (trans && trans.toLowerCase() !== clean.toLowerCase()) {
          return trans.toLowerCase();
        }
      }
    }
  } catch (err) {
    // ignore
  }

  // Try MyMemory free translation API
  try {
    const url2 = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=en|vi`;
    const res2 = await fetch(url2);
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.responseData && data2.responseData.translatedText) {
        const trans2 = data2.responseData.translatedText.trim();
        if (trans2 && trans2.toLowerCase() !== clean.toLowerCase()) {
          return trans2.toLowerCase();
        }
      }
    }
  } catch (err) {
    // ignore
  }

  return `Từ tiếng Anh: "${clean}"`;
}

/**
 * Async online sentence translation for full questions or options
 */
export async function translateSentenceOnline(text: string): Promise<string> {
  const clean = text.trim();
  if (!clean) return '';

  // Try Google Translate free endpoint
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(clean)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        const segments = data[0].map((part: any) => part && part[0]).filter(Boolean);
        if (segments.length > 0) {
          return segments.join('');
        }
      }
    }
  } catch (err) {
    // ignore
  }

  // Try MyMemory free translation API
  try {
    const url2 = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=en|vi`;
    const res2 = await fetch(url2);
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.responseData && data2.responseData.translatedText) {
        return data2.responseData.translatedText;
      }
    }
  } catch (err) {
    // ignore
  }

  return 'Không thể tự động dịch câu này. Vui lòng kiểm tra kết nối mạng.';
}

