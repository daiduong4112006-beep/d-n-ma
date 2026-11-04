const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const Module = require('node:module');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '../..');
const filename = path.join(root, 'src/utils/feExamMatrix.ts');
const compiled = esbuild.transformSync(fs.readFileSync(filename, 'utf8'), {loader:'ts', format:'cjs'}).code;
const mod = new Module(filename, module);
mod._compile(compiled, filename);
const {sampleExam, FE_MATRIX, feCategory, feLesson, eligibleFeQuestion, feReadingBlocks} = mod.exports;
const pool = JSON.parse(fs.readFileSync(path.join(root, 'src/data/jpd123ExamBank.json'), 'utf8')).questions;
let seed = 4711;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const tests = [];
function test(name, run) { run(); tests.push(name); console.log('PASS ' + name); }
test('500 real-bank exams follow the 30-question blueprint without duplicates', () => {
  const signatures = new Set();
  for (let i=0; i<500; i++) {
    const exam = sampleExam(pool, 30, random);
    assert.equal(exam.length, 30);
    assert.equal(new Set(exam.map(q => q.id)).size, 30);
    for (const {category, count} of FE_MATRIX) assert.equal(exam.filter(q => feCategory(q) === category).length, count, category);
    assert.ok(exam.every(eligibleFeQuestion));
    const byLesson={};
    for(const q of exam.filter(q=>['Ngữ pháp','Trợ từ','Hội thoại'].includes(feCategory(q)))) byLesson[feLesson(q)]=(byLesson[feLesson(q)]||0)+1;
    assert.deepEqual(byLesson,{0:1,4:2,5:4,6:4,7:3});
    const reading = exam.slice(-3);
    assert.ok(feReadingBlocks(pool.filter(eligibleFeQuestion)).some(b => b.length === 3 && b.every((q,j) => q.id === reading[j].id)));
    signatures.add(exam.map(q => q.id).join(','));
  }
  assert.equal(signatures.size, 500);
});
test('Question content corrects legacy odd-one-out labels', () => {
  assert.equal(feCategory(pool.find(q => q.id === 'JPD-0557')), 'Từ khác nhóm');
});
test('PT-only, unsure, missing-answer and unclassified questions are excluded', () => {
  const base = pool.find(q => feCategory(q) === 'Ngữ pháp');
  assert.equal(eligibleFeQuestion({...base, sources:[{file:'JPD123_PT_SP26.html',page:1}]}), false);
  assert.equal(eligibleFeQuestion({...base, answer:{key:'A',unsure:true}}), false);
  assert.equal(eligibleFeQuestion({...base, answer:{}}), false);
  assert.equal(eligibleFeQuestion({...base, category:'Cần xem lại / nhiều câu'}), false);
  assert.equal(eligibleFeQuestion({...base, sources:[{file:'JPD123_PT_SP26.html',page:1},{file:'JPD123_SU26_De_1.html',page:1}]}), true);
});
test('Insufficient categories and missing passage fail explicitly; never silently distort quotas', () => {
  assert.throws(() => sampleExam(pool.filter(q => feCategory(q) !== 'Đọc hiểu')), /đọc hiểu/);
  assert.throws(() => sampleExam(pool.filter(q => feCategory(q) !== 'Ngữ pháp')), /ma trận/);
  assert.throws(() => sampleExam([], 30), /đọc hiểu/);
  assert.throws(() => sampleExam(pool, 50), /30 câu/);
});
test('Sampling does not mutate bank data or reading order', () => {
  const before = JSON.stringify(pool);
  sampleExam(pool, 30, random);
  assert.equal(JSON.stringify(pool), before);
});
const categories = Object.fromEntries(FE_MATRIX.map(m => [m.category, pool.filter(q => eligibleFeQuestion(q) && feCategory(q) === m.category).length]));
const example = sampleExam(pool, 30, random);
const lessons = {};
for (const q of example.filter(q => ['Ngữ pháp','Trợ từ','Hội thoại'].includes(feCategory(q)))) lessons[feLesson(q)] = (lessons[feLesson(q)] || 0) + 1;
console.log(JSON.stringify({available: categories, exampleLessons: lessons}));
fs.mkdirSync(path.join(root, 'test-results'), {recursive:true});
fs.writeFileSync(path.join(root, 'test-results/fe-matrix.json'), JSON.stringify({tests, generatedExams:500, categories, exampleLessons: lessons}, null, 2));
