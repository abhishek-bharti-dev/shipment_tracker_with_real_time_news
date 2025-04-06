const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiApiService {
    constructor() {
        // Initialize the Gemini API with your API key
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async generateSummary(text) {
        try {
            const prompt = `Summarize the following text in 2-3 words: ${text}`;
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Error generating summary with Gemini:', error);
            return text.substring(0, 50) + '...'; // Fallback to first 50 characters if API fails
        }
    }
}

module.exports = new GeminiApiService(); 