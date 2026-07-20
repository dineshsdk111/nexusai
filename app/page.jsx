'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../src/components/Sidebar';
import ChatArea from '../src/components/ChatArea';
import StudyDesk from '../src/components/StudyDesk';
import SettingsModal from '../src/components/SettingsModal';
import { queryGemini } from '../src/utils/gemini';
import './globals.css';

const createDefaultThread = () => ({
  id: 'thread-' + Date.now(),
  title: 'General Chat',
  messages: [],
  mode: 'general',
  searchGrounding: false
});

export default function Home() {
  const [threads, setThreads] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('nexus_threads') : null;
    return saved ? JSON.parse(saved) : [createDefaultThread()];
  });

  const [activeThreadId, setActiveThreadId] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('nexus_active_thread_id') : null;
    return saved || (threads[0]?.id || '');
  });

  const [settings, setSettings] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('nexus_settings') : null;
    return saved ? JSON.parse(saved) : {
      provider: 'gemini',
      apiKey: '',
      model: 'gemini-3.1-flash-lite',
      customPrompt: '',
      saveHistory: true
    };
  });

  const [flashcards, setFlashcards] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('nexus_flashcards') : null;
    return saved ? JSON.parse(saved) : [];
  });

  const [notes, setNotes] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('nexus_notes') : null;
    return saved || '';
  });

  const [quizStats, setQuizStats] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('nexus_quiz_stats') : null;
    return saved ? JSON.parse(saved) : {
      correct: 0,
      incorrect: 0,
      answered: 0,
      xp: 0,
      isActive: false
    };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStudyDeskOpen, setIsStudyDeskOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (settings.saveHistory) {
      localStorage.setItem('nexus_threads', JSON.stringify(threads));
    } else {
      localStorage.removeItem('nexus_threads');
    }
  }, [threads, settings.saveHistory, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('nexus_active_thread_id', activeThreadId);
  }, [activeThreadId, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('nexus_settings', JSON.stringify(settings));
  }, [settings, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('nexus_flashcards', JSON.stringify(flashcards));
  }, [flashcards, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('nexus_notes', notes);
  }, [notes, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('nexus_quiz_stats', JSON.stringify(quizStats));
  }, [quizStats, mounted]);

  useEffect(() => {
    if (threads.length > 0 && !threads.find(t => t.id === activeThreadId)) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  const handleSelectThread = (id) => {
    setActiveThreadId(id);
  };

  const handleNewThread = () => {
    const newT = createDefaultThread();
    setThreads(prev => [newT, ...prev]);
    setActiveThreadId(newT.id);
  };

  const handleDeleteThread = (id) => {
    const filtered = threads.filter(t => t.id !== id);
    if (filtered.length === 0) {
      setThreads([createDefaultThread()]);
    } else {
      setThreads(filtered);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to delete ALL chat sessions? This cannot be undone.")) {
      const defaultT = createDefaultThread();
      setThreads([defaultT]);
      setActiveThreadId(defaultT.id);
    }
  };

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    if (newSettings.apiKey) {
      console.log("Gemini API key saved successfully.");
    }
  };

  const handleToggleSearchGrounding = (val) => {
    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return { ...t, searchGrounding: val };
      }
      return t;
    }));
  };

  const handleSelectMode = (mode) => {
    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return { ...t, mode: mode };
      }
      return t;
    }));

    if (mode === 'quiz') {
      setQuizStats(prev => ({ ...prev, isActive: true }));
    }
  };

  const handleAttachFile = (fileObj) => {
    setAttachedFile(fileObj);
  };

  const handleClearFile = () => {
    setAttachedFile(null);
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() && !attachedFile) return;
    if (!settings.apiKey) {
      setIsSettingsOpen(true);
      alert("Please enter your Google Gemini API Key in settings first!");
      return;
    }

    const activeT = threads.find(t => t.id === activeThreadId);
    if (!activeT) return;

    let userText = text;
    if (attachedFile) {
      userText = `${text}\n\n[Context from attached file '${attachedFile.name}']:\n${attachedFile.text}`;
    }

    const userMsg = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...activeT.messages, userMsg];

    let newTitle = activeT.title;
    if (activeT.messages.length === 0) {
      newTitle = text.trim().substring(0, 30) + (text.trim().length > 30 ? '...' : '');
    }

    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          title: newTitle,
          messages: updatedMessages
        };
      }
      return t;
    }));

    setIsPending(true);

    try {
      const response = await queryGemini({
        provider: settings.provider || 'gemini',
        apiKey: settings.apiKey,
        model: settings.model,
        chatHistory: updatedMessages,
        mode: activeT.mode || 'general',
        customPrompt: settings.customPrompt,
        fileContext: attachedFile ? attachedFile.text : '',
        enableSearch: activeT.searchGrounding || false
      });

      const botMsg = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'bot',
        text: response.text,
        searchQueries: response.searchQueries,
        searchSources: response.searchSources,
        webSearchContext: response.webSearchContext,
        timestamp: new Date().toISOString()
      };

      setThreads(prev => prev.map(t => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            messages: [...updatedMessages, botMsg]
          };
        }
        return t;
      }));

      if (activeT.mode === 'quiz') {
        const textToEvaluate = response.text;
        const isCorrect = /correct/i.test(textToEvaluate) && !/incorrect/i.test(textToEvaluate);
        const isIncorrect = /incorrect|wrong|false/i.test(textToEvaluate);

        if (isCorrect || isIncorrect) {
          setQuizStats(prev => {
            const nextCorrect = isCorrect ? prev.correct + 1 : prev.correct;
            const nextIncorrect = isIncorrect ? prev.incorrect + 1 : prev.incorrect;
            const nextAnswered = prev.answered + 1;
            const nextXp = isCorrect ? prev.xp + 10 : prev.xp;
            return {
              ...prev,
              correct: nextCorrect,
              incorrect: nextIncorrect,
              answered: nextAnswered,
              xp: nextXp,
              isActive: true
            };
          });
        }
      }

      setAttachedFile(null);

    } catch (err) {
      console.error(err);
      alert(`API Error: ${err.message || 'Something went wrong.'}`);
    } finally {
      setIsPending(false);
    }
  };

  const handleStartQuizSession = () => {
    handleSelectMode('quiz');
    setQuizStats({
      correct: 0,
      incorrect: 0,
      answered: 0,
      xp: 0,
      isActive: true
    });
    handleSendMessage("Start a 5-question study quiz on general knowledge for my studies. Ask one question at a time.");
  };

  const handleAddFlashcard = (newCard) => {
    setFlashcards(prev => [...prev, newCard]);
  };

  const activeThread = threads.find(t => t.id === activeThreadId) || threads[0];

  return (
    <div className="app-container">
      <Sidebar
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={handleSelectThread}
        onNewThread={handleNewThread}
        onDeleteThread={handleDeleteThread}
        onClearAll={handleClearHistory}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <ChatArea
        activeThread={activeThread}
        onSendMessage={handleSendMessage}
        onToggleSearchGrounding={handleToggleSearchGrounding}
        onToggleStudyDesk={() => setIsStudyDeskOpen(!isStudyDeskOpen)}
        isStudyDeskOpen={isStudyDeskOpen}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onSelectMode={handleSelectMode}
        onAttachFile={handleAttachFile}
        attachedFile={attachedFile}
        onClearFile={handleClearFile}
        isPending={isPending}
        onAddFlashcard={handleAddFlashcard}
      />

      <StudyDesk
        isOpen={isStudyDeskOpen}
        onClose={() => setIsStudyDeskOpen(false)}
        messages={activeThread?.messages || []}
        flashcards={flashcards}
        onSetFlashcards={setFlashcards}
        notes={notes}
        onSetNotes={setNotes}
        quizStats={quizStats}
        onSetQuizStats={setQuizStats}
        onStartQuizSession={handleStartQuizSession}
        provider={settings.provider || 'gemini'}
        apiKey={settings.apiKey}
        model={settings.model}
        customPrompt={settings.customPrompt}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
