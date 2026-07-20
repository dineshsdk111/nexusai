'use client';
import React, { useState, useEffect } from 'react';

export default function SettingsModal({ isOpen, onClose, settings, onSave }) {
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState('gemini-3.1-flash-lite');
  const [customPrompt, setCustomPrompt] = useState('');
  const [saveHistory, setSaveHistory] = useState(true);

  // Sync state with settings prop when modal opens
  useEffect(() => {
    if (isOpen && settings) {
      setProvider(settings.provider || 'gemini');
      setApiKey(settings.apiKey || '');
      setModel(settings.model || 'gemini-3.1-flash-lite');
      setCustomPrompt(settings.customPrompt || '');
      setSaveHistory(settings.saveHistory !== false);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      provider,
      apiKey,
      model,
      customPrompt,
      saveHistory
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header">
          <h2>API Settings</h2>
          <button className="close-modal-btn" onClick={onClose} aria-label="Close settings">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            
            <div className="form-group">
              <label htmlFor="settings-provider">API Provider</label>
              <select
                id="settings-provider"
                value={provider}
                onChange={(e) => {
                  const val = e.target.value;
                  setProvider(val);
                  // Auto-set default model for selected provider
                  if (val === 'openrouter') {
                    setModel('openrouter/free');
                  } else {
                    setModel('gemini-3.1-flash-lite');
                  }
                }}
              >
                <option value="gemini">Google Gemini (Direct)</option>
                <option value="openrouter">OpenRouter (Free Tier Models)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="settings-api-key">
                {provider === 'openrouter' ? 'OpenRouter API Key' : 'Gemini API Key'}
              </label>
              <div className="input-password-wrapper">
                <input
                  type={showKey ? "text" : "password"}
                  id="settings-api-key"
                  placeholder={provider === 'openrouter' ? "sk-or-v1-..." : "AIzaSy..."}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowKey(!showKey)}
                  title={showKey ? "Hide API Key" : "Show API Key"}
                >
                  <span className="material-symbols-outlined">
                    {showKey ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              <p className="form-help-text">
                Your key is stored only in your local browser and connects directly to the provider.
                {provider === 'openrouter' ? (
                  <> Get a free API Key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">OpenRouter Keys</a>.</>
                ) : (
                  <> Don't have one? Get a free API Key from <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">Google AI Studio</a>.</>
                )}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="settings-model">Model Selection</label>
              {provider === 'openrouter' ? (
                <select
                  id="settings-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="openrouter/free">Auto Free Model Router (Recommended)</option>
                  <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B Instruct (Free)</option>
                  <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B Instruct (Free)</option>
                  <option value="qwen/qwen-2.5-72b-instruct:free">Qwen 2.5 72B Instruct (Free)</option>
                  <option value="mistralai/mistral-7b-instruct:free">Mistral 7B Instruct (Free)</option>
                </select>
              ) : (
                <select
                  id="settings-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Recommended - Ultra-Fast & Cost-Efficient)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & Search support)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Powerful reasoning, slower)</option>
                </select>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="settings-custom-prompt">Custom Base System Prompt (Optional)</label>
              <textarea
                id="settings-custom-prompt"
                placeholder="Provide extra background or personal preferences for your assistant..."
                rows={3}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </div>

            <div className="form-group-checkbox">
              <label className="switch-container">
                <input
                  type="checkbox"
                  id="settings-save-history"
                  checked={saveHistory}
                  onChange={(e) => setSaveHistory(e.target.checked)}
                />
                <span className="switch-custom-label">Auto-save chat sessions locally</span>
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-save">Save Configurations</button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
