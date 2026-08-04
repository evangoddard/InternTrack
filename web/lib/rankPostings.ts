// -----------------------------------------------------------------------
// Résumé-to-posting matcher: TF-IDF + cosine similarity.
//
// This is the standard information-retrieval technique for "rank a corpus
// of documents against a query document" -- the same family of algorithm
// search engines and early resume-screening tools have used for decades.
// It's deliberately NOT an embedding/neural model: no API call, no model
// weights, nothing leaves the browser, and it runs in well under a
// millisecond for a few hundred postings. A semantic embedding model can
// replace the body of rankPostings() later without touching any caller --
// the function signature and RankedPosting shape are the contract.
//
// HONEST LIMITATION: no source provides a real job description -- postings
// only carry a title, company, category ("Software", "Hardware",
// "AI/ML/Data", ...), and preferred degree level(s). postingDocument() below
// matches against exactly those short fields; there's no longer text to
// fall back to.
//
// How it works, briefly:
//   1. Tokenize the résumé and every posting's text into unigrams and
//      bigrams (single words and adjacent word-pairs, so phrases like
//      "machine learning" count as a real signal, not just two
//      independent common words).
//   2. Compute IDF (inverse document frequency) for every term across the
//      posting corpus -- terms that appear in most postings ("intern",
//      "engineer") are downweighted automatically; rare, distinctive terms
//      ("kubernetes", "fpga", "quantitative") are upweighted. This is what
//      keeps the score meaningful without a hand-maintained skills list.
//   3. Build a TF-IDF vector for the résumé and for each posting, then
//      score by cosine similarity (the angle between the two vectors,
//      independent of document length -- a two-page résumé isn't
//      penalized against a five-word title).
// -----------------------------------------------------------------------

import type { Posting } from "./types";

export interface RankedPosting {
  posting: Posting;
  score: number; // 0-100
}

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
  "have", "he", "her", "his", "i", "in", "is", "it", "its", "of", "on",
  "or", "our", "she", "that", "the", "their", "this", "to", "was", "we",
  "were", "will", "with", "you", "your", "about", "into", "over", "also",
  "than", "then", "them", "they", "but", "not", "can", "may", "us",
]);

// Keeps letters, digits, and a few characters common in tech terms
// (c++, c#, node.js, machine-learning) so they don't get shredded into
// meaningless fragments.
function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[.\-]+|[.\-]+$/g, "")) // trim stray edge punctuation
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));

  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]}_${words[i + 1]}`);
  }

  return [...words, ...bigrams];
}

function termFrequencies(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  return tf;
}

function magnitude(vector: Map<string, number>): number {
  let sumSquares = 0;
  for (const weight of vector.values()) sumSquares += weight * weight;
  return Math.sqrt(sumSquares);
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  // Iterate the smaller map for the dot product -- only shared keys matter.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, weight] of small) {
    const other = large.get(term);
    if (other) dot += weight * other;
  }

  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;

  return dot / (magA * magB);
}

// The text actually available to match against -- see the HONEST LIMITATION
// note above.
function postingDocument(posting: Posting): string {
  return [
    posting.title,
    posting.company,
    posting.category,
    posting.season,
    ...posting.degrees,
  ].join(" ");
}

export function rankPostings(resumeText: string, postings: Posting[]): RankedPosting[] {
  const resumeTokens = tokenize(resumeText);

  if (resumeTokens.length === 0 || postings.length === 0) {
    // Nothing to score against -- return in the given order at 0 rather
    // than dividing by zero or producing an arbitrary ranking.
    return postings.map((posting) => ({ posting, score: 0 }));
  }

  const postingTokenLists = postings.map((posting) => tokenize(postingDocument(posting)));

  // Document frequency: how many postings each term appears in at least
  // once. This is what makes IDF work -- computed over the posting corpus,
  // since that's the fixed collection being searched (the résumé is the
  // query, not part of the collection).
  const documentFrequency = new Map<string, number>();
  for (const tokens of postingTokenLists) {
    for (const term of new Set(tokens)) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const corpusSize = postings.length;
  const idf = (term: string): number => {
    const df = documentFrequency.get(term) ?? 0;
    // Smoothed IDF (the scikit-learn convention): keeps the value finite
    // and positive even for a term the résumé has that no posting does.
    return Math.log((corpusSize + 1) / (df + 1)) + 1;
  };

  const tfidfVector = (tokens: string[]): Map<string, number> => {
    const tf = termFrequencies(tokens);
    const vector = new Map<string, number>();
    for (const [term, count] of tf) {
      vector.set(term, count * idf(term));
    }
    return vector;
  };

  const resumeVector = tfidfVector(resumeTokens);

  const ranked = postings.map((posting, i) => {
    const postingVector = tfidfVector(postingTokenLists[i]);
    const similarity = cosineSimilarity(resumeVector, postingVector);
    return { posting, score: Math.round(similarity * 100) };
  });

  ranked.sort((a, b) => b.score - a.score);

  return ranked;
}
