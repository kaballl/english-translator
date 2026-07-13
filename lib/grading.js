function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  const normalized = normalize(text);
  return normalized ? normalized.split(" ") : [];
}

function wordFrequency(words) {
  const freq = new Map();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  return freq;
}

function gradeTranslation(modelText, studentText) {
  const modelWords = tokenize(modelText);
  const studentWords = tokenize(studentText);

  if (modelWords.length === 0) {
    return {
      score: studentWords.length === 0 ? 100 : 0,
      missing: [],
      extra: studentWords,
    };
  }

  const modelFreq = wordFrequency(modelWords);
  const studentFreq = wordFrequency(studentWords);

  const missing = [];
  const extra = [];
  let matched = 0;

  for (const [word, count] of modelFreq) {
    const studentCount = studentFreq.get(word) || 0;
    const matchCount = Math.min(count, studentCount);
    matched += matchCount;
    for (let i = 0; i < count - matchCount; i++) {
      missing.push(word);
    }
  }

  for (const [word, count] of studentFreq) {
    const modelCount = modelFreq.get(word) || 0;
    for (let i = 0; i < count - Math.min(count, modelCount); i++) {
      extra.push(word);
    }
  }

  const score = Math.round((matched / modelWords.length) * 100);
  return { score, missing, extra };
}

function getTier(score) {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

const TIER_LABELS = {
  excellent: {
    badge: "Excellent",
    title: "Outstanding work!",
    message: "Your translation closely matches the model answer.",
  },
  good: {
    badge: "Good",
    title: "Well done!",
    message: "Most key words are correct. Review the missing ones below.",
  },
  fair: {
    badge: "Fair",
    title: "Keep practicing!",
    message: "You got some words right, but several are still missing.",
  },
  poor: {
    badge: "Needs work",
    title: "Don't give up!",
    message: "Compare your answer with the model and try again.",
  },
};

module.exports = {
  normalize,
  gradeTranslation,
  getTier,
  TIER_LABELS,
};
