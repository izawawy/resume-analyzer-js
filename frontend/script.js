document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("analyzer-form");
    const button = document.getElementById("analyze-button");
    const resultsContainer = document.getElementById("results-container");
    const errorContainer = document.getElementById("error-container");
    const scoreDiv = document.getElementById("score");
    const matchedKeywordsDiv = document.getElementById("matched-keywords");
    const missingKeywordsDiv = document.getElementById("missing-keywords");
    const errorMessageP = document.getElementById("error-message");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        
        const jd_text = document.getElementById("jd_text").value;
        const resume_file = document.getElementById("resume_file").files[0];

        if (!jd_text.trim() || !resume_file) {
            showError("Please provide both a job description and a resume file.");
            return;
        }

        // Disable button and show loading state
        button.disabled = true;
        button.textContent = "Analyzing...";
        hideError();
        resultsContainer.classList.add("hidden");

        try {
            const resume_data = await readFileAsDataURL(resume_file);
            
            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jd_text,
                    resume_data,
                    resume_filename: resume_file.name,
                }),
            });

            if (!response.ok) {
                // Try to parse a structured JSON error, but gracefully fall back to text
                let errorMsg = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error) errorMsg = errorData.error;
                } catch (e) {
                    // Body wasn't valid JSON — use the plain text body if available
                    try {
                        const text = await response.text();
                        if (text) errorMsg = text;
                    } catch (e2) {
                        // ignore — we'll fall back to the generic message
                    }
                }
                throw new Error(errorMsg);
            }

            const results = await response.json();
            displayResults(results);

        } catch (error) {
            showError(error.message);
        } finally {
            // Re-enable button
            button.disabled = false;
            button.textContent = "Analyze";
        }
    });

    function displayResults(results) {
        scoreDiv.innerHTML = `<strong>Keyword Match Score:</strong> ${results.score}%`;
        matchedKeywordsDiv.innerHTML = `<strong>Matched Keywords:</strong> ${results.matched_keywords.join(", ")}`;
        missingKeywordsDiv.innerHTML = `<strong>Missing Keywords:</strong> ${results.missing_keywords.join(", ")}`;
        resultsContainer.classList.remove("hidden");
    }

    function showError(message) {
        errorMessageP.textContent = message;
        errorContainer.classList.remove("hidden");
    }

    function hideError() {
        errorContainer.classList.add("hidden");
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }
});
