# NexusAI - Personal AI Study Companion & Chat Bot

NexusAI is a premium, high-performance study companion and general knowledge chatbot application built using **React** and **Vite**. It integrates directly with Google's **Gemini API** and features real-time **Google Search Grounding** to provide accurate, up-to-date responses.

---

## Key Features

1. **Up-To-Date General Knowledge**: Powered by Gemini API with Google Search Grounding. When enabled, the model searches Google in real-time, displaying actual search queries and source citations below the response.
2. **Dedicated Study desk**:
   - **Flashcards Deck**: Auto-extract key definitions and questions from the active conversation or create them manually. Study them using interactive flip animations and track card mastery.
   - **Text Notebook**: Import summaries directly from your chat with a single click. Review, edit, and download your accumulated notes as a Markdown file.
   - **Interactive Quiz Hub**: Track your performance metrics (accuracy, answer count) and earn **XP points** for answering quiz questions correctly.
3. **Optimized Conversation Modes**:
   - **General**: Friendly, structured personal assistant.
   - **Study**: Academic tutor using analogies, highlights, and final study summaries.
   - **Code**: Developer expert focusing on commenting, explanations, and optimized blocks.
   - **Quiz**: examiner testing you on any topic, asking one question at a time.
4. **File Attachments**: Attach custom `.txt`, `.md`, or `.json` study documents to feed directly into the chat prompt context.
5. **Secure API config**: Save your API key locally in your browser's `localStorage`. No server backend holds your credentials.

---

## Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### Installation & Run

1. Open your terminal in this project directory (`c:\Users\dines\Desktop\ai chat bot`).
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Start the Vite local development server:
   ```bash
   npm run dev
   ```
4. Open the link displayed in your terminal (typically [http://localhost:5173](http://localhost:5173)) in your web browser.

---

## Configuration

To use NexusAI, you need a Gemini API Key:
1. Obtain a free API Key from [Google AI Studio](https://aistudio.google.com/).
2. Open the application, click **API Settings** in the bottom left, and paste your API key.
3. Choose your preferred model (e.g., `gemini-2.5-flash` for fast responses and web search support).
4. Click **Save Configurations** and start chatting!
