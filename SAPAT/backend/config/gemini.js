import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

// Use the Standard SDK class
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define the model outside the function for better performance
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

async function getGeminiResponse(req, res) {
  try {
    const { question } = req.body;
    console.log("Received question for Gemini:", question);
    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

    // The standard SDK uses a simpler call structure
    const result = await model.generateContent(question);
    const response = await result.response;
    const text = response.text();

    return res.json({ answer: text }); 

  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ 
      error: "AI failed to respond",
      details: error.message 
    });
  }
}

export { getGeminiResponse };