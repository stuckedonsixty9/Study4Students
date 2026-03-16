/**
 * Procedural Content Generators for Infinite Learning
 * Supports Maths and Reasoning with Seeded Randomness
 */

// Simple Seeded Random (Lcg)
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }
  pick(array) {
    return array[this.nextInt(0, array.length)];
  }
  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

const defaultRandom = {
  nextInt: (min, max) => Math.floor(Math.random() * (max - min)) + min,
  pick: (array) => array[Math.floor(Math.random() * array.length)],
  shuffle: (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
};

// --- MATHS GENERATORS ---

const generateMathQuestion = (rng = defaultRandom) => {
  const types = ['percentage', 'profit_loss', 'arithmetic', 'ratio'];
  const type = rng.pick(types);
  
  let question, options, answer, explanation;
  const stamp = Date.now();
  const id = `gen_ma_${stamp}_${Math.floor(Math.random() * 1000)}`;

  if (type === 'percentage') {
    const num = rng.nextInt(100, 1000);
    const perc = rng.nextInt(5, 50);
    const result = (num * perc) / 100;
    
    question = `What is ${perc}% of ${num}?`;
    answer = result.toString();
    explanation = `Step 1: Formula is (Percentage * Number) / 100. Step 2: (${perc} * ${num}) / 100 = ${perc * num} / 100 = ${result}.`;
    options = rng.shuffle([answer, (result + 5).toString(), (result - 2).toString(), (result * 1.5).toString()]);
  } else if (type === 'profit_loss') {
    const cp = rng.nextInt(100, 1100);
    const profitPerc = rng.nextInt(5, 35);
    const sp = cp + (cp * profitPerc) / 100;
    
    question = `A man buys an item for ₹${cp} and sells it at a ${profitPerc}% profit. What is the selling price?`;
    answer = `₹${sp}`;
    explanation = `Step 1: Profit = ${profitPerc}% of ${cp} = ${ (cp * profitPerc) / 100 }. Step 2: Selling Price = CP + Profit = ${cp} + ${(cp * profitPerc) / 100} = ${sp}.`;
    options = rng.shuffle([answer, `₹${sp + 20}`, `₹${sp - 15}`, `₹${cp + 10}`]);
  } else if (type === 'ratio') {
    const a = rng.nextInt(1, 11);
    const b = rng.nextInt(1, 11);
    const total = (a + b) * rng.nextInt(10, 60);
    const partA = (total / (a + b)) * a;
    
    question = `Divide ${total} in the ratio ${a}:${b}. What is the value of the first part?`;
    answer = partA.toString();
    explanation = `Step 1: Sum of ratios = ${a} + ${b} = ${a + b}. Step 2: First part = (${a} / ${a + b}) * ${total} = ${partA}.`;
    options = rng.shuffle([answer, (partA + 10).toString(), (partA - 5).toString(), (total / 2).toString()]);
  } else {
    // Arithmetic
    const n1 = rng.nextInt(1, 101);
    const n2 = rng.nextInt(1, 101);
    const op = rng.pick(['+', '-', '*']);
    let res;
    if (op === '+') res = n1 + n2;
    if (op === '-') res = n1 - n2;
    if (op === '*') res = n1 * n2;
    
    question = `Solve: ${n1} ${op} ${n2} = ?`;
    answer = res.toString();
    explanation = `Direct calculation: ${n1} ${op} ${n2} = ${res}.`;
    options = rng.shuffle([answer, (res + 1).toString(), (res - 1).toString(), (res + 10).toString()]);
  }

  return { id, question, options, answer, explanation };
};

// --- REASONING GENERATORS ---

const generateReasoningQuestion = (rng = defaultRandom) => {
  const types = ['number_series', 'alphabet_series'];
  const type = rng.pick(types);
  
  let question, options, answer, explanation;
  const stamp = Date.now();
  const id = `gen_re_${stamp}_${Math.floor(Math.random() * 1000)}`;

  if (type === 'number_series') {
    const start = rng.nextInt(1, 11);
    const diff = rng.nextInt(2, 12);
    const series = [start, start + diff, start + 2 * diff, start + 3 * diff, start + 4 * diff];
    
    question = `Find the next number in the series: ${series.join(', ')}, ?`;
    answer = (series[4] + diff).toString();
    explanation = `Step 1: Observe the difference between terms. ${series[1]} - ${series[0]} = ${diff}. Step 2: The pattern is adding ${diff} each time. Step 3: ${series[4]} + ${diff} = ${answer}.`;
    options = rng.shuffle([answer, (series[4] + diff + 1).toString(), (series[4] + diff - 1).toString(), (series[4] + diff + 5).toString()]);
  } else {
    // Alphabet
    const alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const startIdx = rng.nextInt(0, 11);
    const step = rng.nextInt(1, 4);
    const series = [
      alphabets[startIdx],
      alphabets[startIdx + step],
      alphabets[startIdx + 2 * step],
      alphabets[startIdx + 3 * step]
    ];
    
    question = `Find the next letter: ${series.join(', ')}, ?`;
    answer = alphabets[startIdx + 4 * step];
    explanation = `Step 1: Map letters to numbers (A=1, B=2...). Step 2: The step is ${step}. Step 3: ${series[3]} + ${step} positions = ${answer}.`;
    options = rng.shuffle([answer, alphabets[startIdx + 4 * step + 1] || 'Z', alphabets[startIdx + 4 * step - 1] || 'A', 'X']);
  }

  return { id, question, options, answer, explanation };
};

export const getInfiniteQuestions = (subject, count = 10, seed = null) => {
  const rng = seed !== null ? new SeededRandom(seed) : defaultRandom;
  const questions = [];
  for (let i = 0; i < count; i++) {
    if (subject === 'Maths') questions.push(generateMathQuestion(rng));
    else if (subject === 'Reasoning') questions.push(generateReasoningQuestion(rng));
  }
  return questions;
};
