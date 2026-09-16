export function cleanLatexText(text: string): string {
  if (!text) return '';
  return text
    // Replace LaTeX command symbols with clean unicode
    .replace(/\\ge\b/g, '≥')
    .replace(/\\le\b/g, '≤')
    .replace(/\\geq\b/g, '≥')
    .replace(/\\leq\b/g, '≤')
    .replace(/\\times\b/g, '×')
    .replace(/\\div\b/g, '÷')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\neq\b/g, '≠')
    .replace(/\\infty\b/g, '∞')
    .replace(/\\to\b/g, '→')
    .replace(/\\rightarrow\b/g, '→')

    // Remove \text{...} wrappers
    .replace(/\\text\{([^}]+)\}/g, '$1')

    // Clean braces in powers/subscripts like 2^{13} -> 2^13
    .replace(/\^\{([^}]+)\}/g, '^$1')
    .replace(/_\{([^}]+)\}/g, '_$1')

    // Remove LaTeX dollar sign delimiters around math expressions ($m$ -> m, $r = 14$ -> r = 14)
    .replace(/\$([^\$]+)\$/g, '$1')

    // Clean any remaining standalone backslashes
    .replace(/\\([a-zA-Z]+)/g, '$1');
}
