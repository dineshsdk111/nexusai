import React from 'react';

export default function Sidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onClearAll,
  onOpenSettings,
  isSidebarOpen,
  setIsSidebarOpen
}) {
  return (
    <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`} id="sidebar">
      
      <div className="sidebar-header">
        <div className="logo">
          <span className="material-symbols-outlined logo-icon">blur_on</span>
          <h2>Nexus<span>AI</span></h2>
        </div>
        <button
          className="icon-btn close-sidebar-btn"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close Sidebar"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
      </div>

      <button className="new-chat-btn" onClick={onNewThread}>
        <span className="material-symbols-outlined">add</span>
        <span>New Session</span>
      </button>

      <div className="history-section">
        <h3>Recent Sessions</h3>
        <div className="threads-list" id="threads-list">
          {threads.length === 0 ? (
            <div style={{ padding: '10px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No sessions yet
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                className={`thread-item ${activeThreadId === thread.id ? 'active' : ''}`}
                onClick={() => {
                  onSelectThread(thread.id);
                  // Close sidebar on mobile
                  if (window.innerWidth <= 768) {
                    setIsSidebarOpen(false);
                  }
                }}
              >
                <div className="thread-info">
                  <span className="material-symbols-outlined thread-icon">
                    {thread.mode === 'quiz' ? 'quiz' : thread.mode === 'code' ? 'code' : thread.mode === 'study' ? 'local_library' : 'chat_bubble'}
                  </span>
                  <span className="thread-title">{thread.title || 'Untitled Session'}</span>
                </div>
                <div className="thread-actions">
                  <button
                    className="delete-thread-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteThread(thread.id);
                    }}
                    title="Delete Session"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="footer-action-btn" onClick={onClearAll}>
          <span className="material-symbols-outlined">delete_sweep</span>
          <span>Clear History</span>
        </button>
        <button className="footer-action-btn" onClick={onOpenSettings}>
          <span className="material-symbols-outlined">settings</span>
          <span>API Settings</span>
        </button>
      </div>

    </aside>
  );
}
