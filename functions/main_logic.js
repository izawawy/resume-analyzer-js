const pdf = require('pdf-parse');
const { Document, Packer, Paragraph } = require('docx');
const natural = require('natural');
const FuzzySearch = require('fuzzy-search');

async function extractTextFromPdf(fileBuffer) {
    const data = await pdf(fileBuffer);
    return data.text;
}

async function extractTextFromDocx(fileBuffer) {
    const doc = new Document();
    const content = await doc.load(fileBuffer);
    const text = [];
    for (const p of content.paragraphs) {
        text.push(p.text);
    }
    return text.join('\n');
}

function extractTextFromTxt(fileBuffer) {
    return fileBuffer.toString('utf-8');
}

async function extractText(filename, fileBuffer) {
    const name = filename.toLowerCase();
    if (name.endsWith('.pdf')) {
        return await extractTextFromPdf(fileBuffer);
    } else if (name.endsWith('.docx')) {
        return await extractTextFromDocx(fileBuffer);
    } else if (name.endsWith('.txt')) {
        return extractTextFromTxt(fileBuffer);
    } else {
        try {
            return fileBuffer.toString('utf-8');
        } catch (e) {
            throw new Error(`Unsupported file type: ${name}. Could not decode as UTF-8 text.`);
        }
    }
}

function cleanAndTokenize(text) {
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text);
    const stopWords = new Set(natural.stopwords);
    
    // Simple heuristic for proper nouns: capitalized words
    const properNouns = tokens.filter(token => {
        return /^[A-Z]/.test(token) && !stopWords.has(token.toLowerCase());
    });

    return properNouns;
}

function extractKeywordsFromJd(jdText, topK = 40) {
    const tokens = cleanAndTokenize(jdText);
    if (tokens.length === 0) {
        return [];
    }

    const frequency = tokens.reduce((acc, token) => {
        acc[token] = (acc[token] || 0) + 1;
        return acc;
    }, {});

    const sortedWords = Object.keys(frequency).sort((a, b) => frequency[a] - frequency[b]);
    const leastCommon = sortedWords.slice(0, Math.min(topK, sortedWords.length));
    
    return leastCommon;
}

function computeMatch(resumeText, jdKeywords) {
    const resumeLower = resumeText.toLowerCase();
    const matched = [];
    const missing = [];

    const searcher = new FuzzySearch([resumeLower], [], { caseSensitive: false, sort: true });

    for (const kw of jdKeywords) {
        const result = searcher.search(kw);
        if (result.length > 0) {
            matched.push(kw);
        } else {
            missing.push(kw);
        }
    }

    let score = 0.0;
    if (jdKeywords.length > 0) {
        score = Math.round(100.0 * matched.length / jdKeywords.length, 1);
    }

    return { score, matched, missing };
}

module.exports = {
    extractText,
    extractKeywordsFromJd,
    computeMatch
};
