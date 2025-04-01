const natural = require('natural');

const title1 = "Mumbai Port DCP Sudhakar Pathare Dies in Accident - Pune Mirror";
const title2 = "Top Mumbai cop Sudhakar Pathare dies in road accident - India Today";

// Tokenize and preprocess the text
const tokenizer = new natural.WordTokenizer();
const words1 = tokenizer.tokenize(title1.toLowerCase());
const words2 = tokenizer.tokenize(title2.toLowerCase());

// Create a combined word set for vectorization
const wordSet = new Set([...words1, ...words2]);

// Convert each title into a word frequency vector
function getVector(words, wordSet) {
    return Array.from(wordSet).map(word => words.filter(w => w === word).length);
}

const vector1 = getVector(words1, wordSet);
const vector2 = getVector(words2, wordSet);

// Compute cosine similarity
function cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        normA += vec1[i] * vec1[i];
        normB += vec2[i] * vec2[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    return normA && normB ? dotProduct / (normA * normB) : 0; // Avoid divide-by-zero
}

const similarityScore = cosineSimilarity(vector1, vector2);
console.log(`Cosine Similarity: ${similarityScore.toFixed(2)}`);

if (similarityScore > 0.7) { // Threshold for duplicate detection
    console.log("✅ These articles are duplicates.");
} else {
    console.log("❌ These articles are NOT duplicates.");
}
