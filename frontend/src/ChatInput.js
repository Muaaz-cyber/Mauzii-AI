import React, { useState, useRef, useEffect } from 'react';

const MAX_CHARS = 5000;

const PLACEHOLDERS = {
  auto: 'Ask anything...',
  fast: 'Quick question...',
  smart: 'Ask something...',
  deep: 'Ask for a detailed explanation...',
  ultra: 'Ask for the best possible answer...',
};

function ChatInput({ onSendMessage, isLoading, selectedModel, isLimitReached }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [text]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || isLimitReached) return;
    onSendMessage(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isOverLimit = text.length > MAX_CHARS;
  const canSend = text.trim().length > 0 && !isLoading && !isLimitReached && !isOverLimit;
  const placeholder = isLimitReached
    ? 'Daily limit reached. Upgrade for more messages!'
    : PLACEHOLDERS[selectedModel] || 'Ask anything...';

  return (
    <div className="input-area">
      {/* Limit warning */}
      {isLimitReached && (
        <div style={{
          padding: '8px 12px',
          marginBottom: '8px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '8px',
          fontSize: '0.78rem',
          color: '#ef4444',
          textAlign: 'center',
          fontWeight: '600'
        }}>
          ⚠️ Daily limit reached! Upgrade to Basic (₹149) or Pro (₹299) for more.
        </div>
      )}

      <div className={`input-container ${isLoading ? 'loading' : ''}`}>
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || isLimitReached}
          rows={1}
          aria-label="Message input"
        />

        <button
          className="send-button"
          onClick={handleSubmit}
          disabled={!canSend}
          aria-label="Send message"
          style={{
            background: canSend ? '#4F8CFF' : undefined,
            transform: canSend ? 'scale(1)' : undefined,
          }}
        >
          {isLoading ? (
            <span className="loading-spinner" />
          ) : (
            <svg className="send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>

      <div className="input-footer">
        {isOverLimit ? (
          <span className="char-count">{text.length}/{MAX_CHARS} — Too long!</span>
        ) : (
          <span />
        )}
        <span className="input-hint">
          {isLoading ? '⏳ Mauzii AI is thinking...' : 'Enter to send • Shift+Enter for new line'}
        </span>
      </div>
    </div>
  );
}

export default ChatInput;
