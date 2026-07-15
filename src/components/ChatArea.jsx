import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false
});

export default function ChatArea({
  activeThread,
  onSendMessage,
  onToggleSearchGrounding,
  onToggleStudyDesk,
  isStudyDeskOpen,
  onOpenSidebar,
  onSelectMode,
  onAttachFile,
  attachedFile,
  onClearFile,
  isPending,
  onAddFlashcard
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Scroll to bottom when messages change or pending changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages?.length, isPending]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  if (!activeThread) {
    return (
      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Select or start a new session to begin.
      </div>
    );
  }

  const handleSend = () => {
    if (!inputText.trim() && !isPending) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      onAttachFile({
        name: file.name,
        text: event.target.result
      });
    };
    reader.readAsText(file);
    // Reset file input value so same file can be uploaded again
    e.target.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleQuickPromptClick = (promptText) => {
    setInputText(promptText);
    textareaRef.current?.focus();
  };

  const handleExtractFlashcard = (msg) => {
    // Basic heuristics to extract question/answer from bot message
    const lines = msg.text.split('\n').filter(l => l.trim().length > 0);
    let question = "Summarize this concept:";
    let answer = msg.text;

    // Look for definitions or headers
    const boldMatch = msg.text.match(/\*\*(.*?)\*\*/);
    if (boldMatch) {
      question = `Explain: ${boldMatch[1]}`;
    } else if (lines.length > 0) {
      question = lines[0].replace(/[#*]/g, '').trim();
      if (lines.length > 1) {
        answer = lines.slice(1).join('\n');
      }
    }

    onAddFlashcard({
      question: question.substring(0, 100),
      answer: answer.substring(0, 300),
      mastered: false
    });
    alert("Flashcard created! You can view and edit it in the Study Desk.");
  };

  return (
    <main className="main-content">
      
      {/* HEADER */}
      <header className="main-header">
        <div className="header-left">
          <button className="icon-btn menu-btn" onClick={onOpenSidebar} aria-label="Open Menu">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1>{activeThread.title || "General Chat"}</h1>
        </div>

        <div className="header-actions">
          {/* Web Search Toggle (DuckDuckGo — Free, No API Key) */}
          <div className="toggle-container" title="Enable DuckDuckGo web search context (free, no API key required)">
            <span className="material-symbols-outlined toggle-icon">language</span>
            <span className="toggle-label">Web Search</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={activeThread.searchGrounding || false}
                onChange={(e) => onToggleSearchGrounding(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* Study Panel Toggle */}
          <button
            className={`header-btn ${isStudyDeskOpen ? 'active' : ''}`}
            onClick={onToggleStudyDesk}
            title="Toggle Study Tools Panel"
          >
            <span className="material-symbols-outlined">menu_book</span>
            <span>Study Desk</span>
          </button>
        </div>
      </header>

      {/* CHAT AREA */}
      <div className="chat-viewport">
        
        {/* Messages List */}
        <div className="messages-container" id="messages-container">
          {activeThread.messages.length === 0 ? (
            <div className="welcome-screen" id="welcome-screen">
              <div className="welcome-icon-container">
                <span className="material-symbols-outlined welcome-icon">school</span>
              </div>
              <h2>Welcome to NexusAI</h2>
              <p>Your personalized AI assistant optimized for studies, research, and general knowledge. Ask questions, analyze papers, or test your memory.</p>

              <div className="quick-prompts-grid">
                <div
                  className="quick-prompt-card"
                  onClick={() => handleQuickPromptClick("Create a summary and 5 study flashcards about Photosynthesis and Light Reactions.")}
                >
                  <span className="material-symbols-outlined prompt-card-icon">style</span>
                  <h4>Create Flashcards</h4>
                  <p>"Create flashcards about Photosynthesis and Light Reactions"</p>
                </div>
                <div
                  className="quick-prompt-card"
                  onClick={() => handleQuickPromptClick("Explain the difference between SQL and NoSQL databases in simple terms with analogies.")}
                >
                  <span className="material-symbols-outlined prompt-card-icon">lightbulb</span>
                  <h4>Explain Simply</h4>
                  <p>"Explain the difference between SQL and NoSQL in simple terms"</p>
                </div>
                <div
                  className="quick-prompt-card"
                  onClick={() => handleQuickPromptClick("Start a 5-question quiz on general knowledge about modern history. Ask one question at a time.")}
                >
                  <span className="material-symbols-outlined prompt-card-icon">quiz</span>
                  <h4>Start a Quiz</h4>
                  <p>"Start a 5-question quiz on modern world history"</p>
                </div>
                <div
                  className="quick-prompt-card"
                  onClick={() => handleQuickPromptClick("Write a Python script to scrape a website and explain how the packages work.")}
                >
                  <span className="material-symbols-outlined prompt-card-icon">code</span>
                  <h4>Explain & Write Code</h4>
                  <p>"Write a Python scraper script and explain how it works"</p>
                </div>
              </div>
            </div>
          ) : (
            activeThread.messages.map((msg) => (
              <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
                <div className="message-sender">
                  {msg.sender === 'user' ? 'You' : 'Assistant'}
                </div>
                <div className="message-bubble">
                  {/* Message Markdown Content */}
                  <div
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(msg.text)
                    }}
                  />

                  {/* Search Grounding Details */}
                  {msg.sender === 'bot' && msg.searchQueries && msg.searchQueries.length > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--accent-color)' }}>search</span>
                      <span>Searched for: <em>{msg.searchQueries.join(', ')}</em></span>
                    </div>
                  )}

                  {msg.sender === 'bot' && msg.searchSources && msg.searchSources.length > 0 && (
                    <div className="grounding-section">
                      <div className="grounding-header">
                        <span className="material-symbols-outlined grounding-icon">language</span>
                        <span>Google Search Sources</span>
                      </div>
                      <div className="sources-grid">
                        {msg.searchSources.map((src, i) => (
                          <a
                            key={i}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="source-card"
                            title={src.title}
                          >
                            <span className="source-number">{src.number}</span>
                            <span className="source-title">{src.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Action Bar (bot only) */}
                  {msg.sender === 'bot' && (
                    <div className="message-actions">
                      <button
                        className="message-action-btn"
                        onClick={() => handleExtractFlashcard(msg)}
                        title="Create a custom study flashcard from this response"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>style</span>
                        <span>Create Flashcard</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {isPending && (
            <div className="message-wrapper bot">
              <div className="message-sender">Assistant</div>
              <div className="message-bubble">
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Bar */}
        <div className="chat-input-bar">
          
          <div className="input-utilities">
            {/* Mode selection tabs */}
            <div className="mode-tabs" id="mode-tabs">
              {[
                { id: 'general', label: 'General', icon: 'chat_bubble' },
                { id: 'study', label: 'Study', icon: 'local_library' },
                { id: 'code', label: 'Code', icon: 'code' },
                { id: 'quiz', label: 'Quiz', icon: 'quiz' }
              ].map(modeOpt => (
                <button
                  key={modeOpt.id}
                  className={`mode-tab ${activeThread.mode === modeOpt.id ? 'active' : ''}`}
                  onClick={() => onSelectMode(modeOpt.id)}
                  title={`${modeOpt.label} Mode`}
                >
                  <span className="material-symbols-outlined">{modeOpt.icon}</span>
                  <span>{modeOpt.label}</span>
                </button>
              ))}
            </div>

            {/* File Attachment */}
            <div className="file-uploader">
              <input
                type="file"
                id="file-input"
                accept=".txt,.md,.json"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                className="utility-btn"
                onClick={triggerFileInput}
                title="Attach context file (.txt, .md, .json)"
              >
                <span className="material-symbols-outlined">attach_file</span>
                <span>{attachedFile ? attachedFile.name : "Attach File"}</span>
              </button>
              {attachedFile && (
                <button className="clear-file-btn" onClick={onClearFile} title="Remove file">
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>
          </div>

          <div className="input-row">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, paste study notes, or start a quiz..."
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={isPending || (!inputText.trim() && !attachedFile)}
              aria-label="Send message"
            >
              <span className="material-symbols-outlined">arrow_upward</span>
            </button>
          </div>

          <div className="chat-disclaimer">
            Powered by Google Gemini. Active Mode: <span style={{ textTransform: 'capitalize' }}>{activeThread.mode || 'General'}</span>.
          </div>
        </div>

      </div>
    </main>
  );
}
