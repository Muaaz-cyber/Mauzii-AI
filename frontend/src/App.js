import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import ModelSelector from './ModelSelector';

const MAX_FREE_MESSAGES = 20;

function App() {
  const [messages, setMessages] = useState([]);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const chatAreaRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleClearChat = () => setMessages([]);

  const userMessages = messages.filter(m => m.role === 'user').length;
  const isLimitReached = userMessages >= MAX_FREE_MESSAGES;

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    if (isLimitReached) {
      alert('Daily limit reached! Upgrade to Basic or Pro for more messages.');
      return;
    }

    const userMessage = { role: 'user', content: text, source: 'user' };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    const placeholderIndex = updatedMessages.length;
    setMessages(prev => [...prev, { role: 'assistant', content: '', isLoading: true }]);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: updatedMessages,
            model: selectedModel
          })
        }
      );

      if (!response.ok) throw new Error('Network error');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finished = false;
      let aiContent = '';
      let metaData = null;

      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') { finished = true; break; }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.meta) {
                metaData = parsed.meta;
              } else if (parsed.token) {
                aiContent += parsed.token;
                setMessages(prev => {
                  const copy = [...prev];
                  copy[placeholderIndex] = {
                    role: 'assistant',
                    content: aiContent,
                    isLoading: false,
                    source: metaData?.source || 'Mauzii AI',
                    autoSelected: metaData?.autoSelected || false,
                    isConsensus: metaData?.isConsensus || false
                  };
                  return copy;
                });
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      setMessages(prev => {
        const copy = [...prev];
        copy[placeholderIndex] = {
          role: 'assistant',
          content: `⚠️ ${error.message || 'Something went wrong. Please try again.'}`,
          isLoading: false,
          isError: true
        };
        return copy;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const progressPercent = Math.min((userMessages / MAX_FREE_MESSAGES) * 100, 100);

  return (
    <div className="app-container">

      {/* Sidebar Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-header">
          <div className="brand-logo">M</div>
          <div>
            <div className="brand-name">Mauzii AI</div>
            <div className="brand-sub">Why use one AI when you can have all?</div>
          </div>
        </div>

        <div className="sidebar-menu">
          <div className="sidebar-label">AI Mode</div>
          <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />

          <div className="sidebar-label" style={{ marginTop: '8px' }}>About</div>
          <div className="cost-indicator">
            <div className="cost-title">Mode Guide</div>
            <div className="cost-items">
              <div className="cost-item free">⚡ Auto — Smart routing</div>
              <div className="cost-item free">🚀 Fast — Quick answers</div>
              <div className="cost-item low">🧠 Smart — Balanced</div>
              <div className="cost-item mid">🔍 Deep — Detailed</div>
              <div className="cost-item high">🔵 Ultra — All AIs combined</div>
            </div>
          </div>

          <div style={{
            padding: '10px 12px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.5',
            border: '1px solid var(--border-color)'
          }}>
            🔒 Your conversations are not permanently stored on our servers
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-tier">Free Plan</div>
          <div className="message-count">
            {userMessages} / {MAX_FREE_MESSAGES} messages used today
          </div>
          <div className="message-bar">
            <div
              className="message-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {isLimitReached && (
            <div style={{
              fontSize: '11px',
              color: '#ef4444',
              fontWeight: '600',
              marginTop: '4px'
            }}>
              Daily limit reached! Upgrade for more.
            </div>
          )}
        </div>
      </div>

      {/* Main workspace */}
      <div className="chat-workspace">

        {/* Desktop header */}
        <div className="header">
          <div className="header-left">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(prev => !prev)}
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            <span className="header-subtitle">
              Smarter answers. Cheaper than ChatGPT.
            </span>
          </div>
          <div className="header-controls">
            <button
              className="theme-toggle"
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button
              className="clear-btn"
              onClick={handleClearChat}
              disabled={messages.length === 0 || isLoading}
              aria-label="Clear chat"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className="chat-area" ref={chatAreaRef}>
          {messages.length === 0 ? (
            <div className="welcome-message">
              <span className="welcome-icon">✨</span>
              <h2>Welcome to Mauzii AI</h2>
              <p>Why use one AI when you can have all?</p>
              <div className="cost-items">
  <div className="cost-item free">⚡ Auto — <span style={{fontSize:'0.65rem'}}>🟢 Gemini 🔵 GPT 🟣 Claude</span></div>
  <div className="cost-item free">🚀 Fast — <span style={{fontSize:'0.65rem'}}>🟢 Gemini 🔴 Llama</span></div>
  <div className="cost-item low">🧠 Smart — <span style={{fontSize:'0.65rem'}}>🔵 GPT 🟡 Perplexity</span></div>
  <div className="cost-item mid">🔍 Deep — <span style={{fontSize:'0.65rem'}}>🟣 Claude 🟡 DeepSeek 🟠 Mixtral</span></div>
  <div className="cost-item high">🔵 Ultra — <span style={{fontSize:'0.65rem'}}>🟢🔵🟣🟡🔴🟠 All AIs</span></div>
</div>
              <p className="welcome-hint">
                Ask anything — from homework help to complex coding. 
                Ultra Mode combines multiple AIs for the best possible answer!
              </p>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginTop: '4px',
                padding: '8px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: '20px',
                border: '1px solid var(--border-color)'
              }}>
                🔒 Your conversations are not permanently stored on our servers
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} />
            ))
          )}
        </div>

        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          selectedModel={selectedModel}
          isLimitReached={isLimitReached}
        />
      </div>
    </div>
  );
}

export default App;