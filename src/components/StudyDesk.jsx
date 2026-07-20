'use client';
import React, { useState, useEffect } from 'react';
import { queryGemini } from '../utils/gemini';

export default function StudyDesk({
  isOpen,
  onClose,
  messages,
  flashcards,
  onSetFlashcards,
  notes,
  onSetNotes,
  quizStats,
  onSetQuizStats,
  onStartQuizSession,
  provider = 'gemini',
  apiKey,
  model,
  customPrompt
}) {
  const [activeTab, setActiveTab] = useState('flashcards');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);

  // If flashcards count changes or active deck changes, reset index
  useEffect(() => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
  }, [flashcards.length]);

  if (!isOpen) return null;

  // Auto-generate flashcards from chat history
  const handleGenerateCards = async () => {
    if (messages.length === 0) {
      alert("Please start a chat session first so we have content to generate flashcards from!");
      return;
    }
    if (!apiKey) {
      alert("Please configure your Gemini API Key in Settings first!");
      return;
    }

    setIsGeneratingCards(true);
    try {
      const threadContent = messages
        .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
        .join('\n');

      const cardPrompt = `Based on the following conversation history, extract up to 5 high-quality flashcards for learning. 
Each flashcard should test a key concept. Return ONLY a JSON array, with no other text, comments or code block markdown wrappers.
The JSON format must be exactly like this:
[
  {"question": "What is the key term?", "answer": "The explanation of the term"}
]

Conversation history:
${threadContent}`;

      // Call Gemini directly with history
      const response = await queryGemini({
        provider,
        apiKey,
        model,
        chatHistory: [{ sender: 'user', text: cardPrompt }],
        mode: 'general',
        customPrompt: 'Output raw JSON array only. No markdown formatting. No ```json. Just raw array.'
      });

      // Attempt to clean JSON in case markdown block is returned
      let cleanedText = response.text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.substring(7);
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.substring(3);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      }
      cleanedText = cleanedText.trim();

      const newCards = JSON.parse(cleanedText);
      if (Array.isArray(newCards)) {
        const formattedCards = newCards.map(c => ({
          question: c.question,
          answer: c.answer,
          mastered: false
        }));
        onSetFlashcards([...flashcards, ...formattedCards]);
        alert(`Successfully generated ${formattedCards.length} flashcards!`);
      } else {
        throw new Error("Response was not a valid array");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to auto-generate flashcards. Ensure your chat has educational content, or try again.");
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const handleClearCards = () => {
    if (window.confirm("Are you sure you want to clear this deck of cards?")) {
      onSetFlashcards([]);
    }
  };

  const handleDownloadNotes = () => {
    if (!notes.trim()) {
      alert("Notes are empty. Type some notes first!");
      return;
    }
    const element = document.createElement("a");
    const file = new Blob([notes], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = "NexusAI_StudyNotes.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleImportSummary = () => {
    if (messages.length === 0) {
      alert("No messages to import!");
      return;
    }
    
    // Compile a beautiful summary
    const summaryHeader = `\n\n## Chat Summary - ${new Date().toLocaleDateString()}\n`;
    const summaries = messages
      .filter(m => m.sender === 'bot')
      .map(m => m.text)
      .join('\n\n---\n\n');

    onSetNotes(notes + summaryHeader + summaries);
  };

  // Flashcards mastery handling
  const handleMarkMastery = (mastered) => {
    const updatedCards = [...flashcards];
    updatedCards[currentCardIndex].mastered = mastered;
    onSetFlashcards(updatedCards);
    
    // Auto advance to next card if available
    if (currentCardIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentCardIndex(prev => prev + 1);
      }, 300);
    } else {
      alert("You've reviewed all cards in this deck! Feel free to review them again or generate more.");
    }
  };

  const activeCard = flashcards[currentCardIndex];

  return (
    <aside className="study-panel" id="study-panel">
      
      <div className="study-panel-header">
        <h2>Study Desk</h2>
        <button className="icon-btn close-panel-btn" onClick={onClose} aria-label="Close Study Desk">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="study-tabs">
        <button
          className={`study-tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`}
          onClick={() => setActiveTab('flashcards')}
        >
          <span className="material-symbols-outlined">style</span>
          <span>Flashcards</span>
        </button>
        <button
          className={`study-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <span className="material-symbols-outlined">edit_note</span>
          <span>Notes</span>
        </button>
        <button
          className={`study-tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveTab('quiz')}
        >
          <span className="material-symbols-outlined">stars</span>
          <span>Quiz stats</span>
        </button>
      </div>

      <div className="study-tab-content">
        
        {/* FLASHCARDS TAB */}
        {activeTab === 'flashcards' && (
          <div className="study-pane active" id="pane-flashcards">
            
            <div className="flashcards-controls">
              <button
                className="action-btn-secondary"
                onClick={handleGenerateCards}
                disabled={isGeneratingCards}
                title="Generate flashcards from the current chat thread content"
              >
                <span className="material-symbols-outlined">auto_awesome</span>
                <span>{isGeneratingCards ? "Generating..." : "Auto-Generate"}</span>
              </button>
              <button className="action-btn-secondary" onClick={handleClearCards} title="Delete all cards">
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>

            <div className="flashcard-container">
              {flashcards.length === 0 ? (
                <div className="empty-flashcards">
                  <span className="material-symbols-outlined">style</span>
                  <h3>No flashcards yet</h3>
                  <p>Click "Auto-Generate" or ask the assistant to create flashcards for you. They will appear here for study review.</p>
                </div>
              ) : (
                <div className="flashcard-card-wrapper" onClick={() => setIsFlipped(!isFlipped)}>
                  <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
                    
                    {/* Front */}
                    <div className="flashcard-face flashcard-front">
                      <div className="card-badge">Question</div>
                      <div className="card-text">{activeCard?.question}</div>
                      <div className="card-hint">Click card to reveal answer</div>
                    </div>

                    {/* Back */}
                    <div className="flashcard-face flashcard-back">
                      <div className="card-badge">Answer</div>
                      <div className="card-text">{activeCard?.answer}</div>
                      <div className="card-hint">Click card to show question</div>
                    </div>

                  </div>
                </div>
              )}
            </div>

            {flashcards.length > 0 && (
              <>
                <div className="flashcard-navigation">
                  <button
                    className="nav-arrow-btn"
                    disabled={currentCardIndex === 0}
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentCardIndex(prev => prev - 1);
                    }}
                    aria-label="Previous Card"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <div className="card-index-indicator">
                    {currentCardIndex + 1} / {flashcards.length}
                  </div>
                  <button
                    className="nav-arrow-btn"
                    disabled={currentCardIndex === flashcards.length - 1}
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentCardIndex(prev => prev + 1);
                    }}
                    aria-label="Next Card"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>

                <div className="flashcard-mastery-actions">
                  <button className="mastery-btn state-retry" onClick={() => handleMarkMastery(false)}>
                    <span className="material-symbols-outlined">replay</span>
                    <span>Still Learning</span>
                  </button>
                  <button className="mastery-btn state-mastered" onClick={() => handleMarkMastery(true)}>
                    <span className="material-symbols-outlined">check_circle</span>
                    <span>Mastered</span>
                  </button>
                </div>
              </>
            )}

          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="study-pane active" id="pane-notes">
            <div className="notes-controls">
              <button className="action-btn-secondary" onClick={handleImportSummary} title="Import assistant responses into notes">
                <span className="material-symbols-outlined">add_to_photos</span>
                <span>Import Chat</span>
              </button>
              <button className="action-btn-secondary" onClick={handleDownloadNotes} title="Download notes as markdown">
                <span className="material-symbols-outlined">download</span>
              </button>
            </div>
            <textarea
              id="notes-textarea"
              value={notes}
              onChange={(e) => onSetNotes(e.target.value)}
              placeholder="Compile your study notes here. You can manually type, import summaries, or edit them. Content is saved automatically..."
            />
          </div>
        )}

        {/* QUIZ STATS TAB */}
        {activeTab === 'quiz' && (
          <div className="study-pane active" id="pane-quiz">
            <div className="quiz-status-card">
              <h3>Quiz Session Status</h3>
              <div className="quiz-stat-row">
                <span className="stat-label">Active Mode</span>
                <span className={`stat-value ${quizStats.isActive ? 'text-highlight' : ''}`}>
                  {quizStats.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="quiz-stat-row">
                <span className="stat-label">Questions Answered</span>
                <span className="stat-value">{quizStats.answered}</span>
              </div>
              <div className="quiz-stat-row">
                <span className="stat-label">Correct Answers</span>
                <span className="stat-value text-success">{quizStats.correct}</span>
              </div>
              <div className="quiz-stat-row">
                <span className="stat-label">Accuracy Score</span>
                <span className="stat-value">
                  {quizStats.answered > 0 ? Math.round((quizStats.correct / quizStats.answered) * 100) : 0}%
                </span>
              </div>
              <div className="quiz-stat-row">
                <span className="stat-label">XP Earned</span>
                <span className="stat-value text-highlight-yellow">{quizStats.xp} XP</span>
              </div>
              <div className="quiz-progress-bar-container">
                <div
                  className="quiz-progress-bar"
                  style={{
                    width: `${quizStats.answered > 0 ? Math.min((quizStats.correct / quizStats.answered) * 100, 100) : 0}%`
                  }}
                />
              </div>
            </div>

            <div className="quiz-actions-container">
              <button className="action-btn-primary" onClick={onStartQuizSession}>
                <span className="material-symbols-outlined">play_arrow</span>
                <span>Start New Quiz Session</span>
              </button>
              <button
                className="action-btn-secondary"
                onClick={() => onSetQuizStats({ correct: 0, incorrect: 0, answered: 0, xp: 0, isActive: false })}
              >
                <span className="material-symbols-outlined">restart_alt</span>
                <span>Reset Stats</span>
              </button>
            </div>

            <div className="quiz-tips">
              <h4>How to Quiz:</h4>
              <p>1. Switch the chat mode input to <strong>Quiz</strong>.</p>
              <p>2. Ask the assistant to start a quiz on any topic (e.g., "Quiz me on space exploration").</p>
              <p>3. The assistant will ask questions one-by-one. Answer them in the chat.</p>
              <p>4. The app tracks your performance, counts correct answers, and awards study XP points!</p>
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}
