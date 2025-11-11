
const { extractText, extractKeywordsFromJd, computeMatch } = require('./main_logic');

exports.handler = async function(event, context) {
    console.log(`Received event: ${JSON.stringify(event)}`);

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    try {
        console.log('Parsing request body...');
        const body = JSON.parse(event.body || '{}');
        const { jd_text, resume_data } = body;

        if (!jd_text || !resume_data) {
            console.log("Missing 'jd_text' or 'resume_data'");
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing 'jd_text' or 'resume_data'" }),
            };
        }

        console.log('Decoding resume data...');
        const fileContentB64 = resume_data.split(',')[1];
        const fileName = body.resume_filename || 'resume.txt';
        const fileBuffer = Buffer.from(fileContentB64, 'base64');

        console.log('Starting core analysis logic...');
        console.log('Extracting text from resume...');
        const resumeText = await extractText(fileName, fileBuffer);
        console.log('Extracting keywords from job description...');
        const jdKeywords = extractKeywordsFromJd(jd_text);
        console.log('Computing match score...');
        const { score, matched, missing } = computeMatch(resumeText, jdKeywords);
        console.log('Analysis complete.');

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                score: score,
                matched_keywords: matched,
                missing_keywords: missing,
            }),
        };
    } catch (e) {
        console.error(`ERROR: ${e}`);
        console.error(e.stack);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `An internal error occurred: ${e.message}` }),
        };
    }
};
