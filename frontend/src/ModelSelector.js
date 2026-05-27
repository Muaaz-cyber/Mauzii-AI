import React, { useState, useRef, useEffect } from 'react';

const MODELS = [
  { 
    key: 'auto', 
    label: 'Auto', 
    description: 'Smartly picks best AI for your question', 
    emoji: '⚡',
    color: '#3b82f6'
  },
  { 
    key: 'fast', 
    label: 'Fast', 
    description: 'Quick answers, instant responses', 
    emoji: '🚀',
    color: '#10a37f'
  },
  { 
    key: 'smart', 
    label: 'Smart', 
    description: 'Balanced quality and speed', 
    emoji: '🧠',
    color: '#9333ea'
  },
  { 
    key: 'deep', 
    label: 'Deep', 
    description: 'Detailed, thoughtful answers', 
    emoji: '🔍',
    color: '#d97706'
  },
  { 
    key: 'ultra', 
    label: 'Ultra Mode', 
    description: 'Multiple AIs combined for best answer', 
    emoji: '🔵',
    color: '#ec4899',
    isPremium: true
  },
];

function ModelSelector({ selectedModel, onModelChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const activeModel = MODELS.find(m => m.key === selectedModel) || MODELS[0];

  return (
    <div className="model-selector-container" ref={containerRef}>
      <button
        className={`select-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span style={{ 
          width: '8px', height: '8px', borderRadius: '50%', 
          background: activeModel.color, flexShrink: 0 
        }} />
        <span>{activeModel.emoji} {activeModel.label}</span>
        <span className="chevron">▾</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu" role="listbox">
          <div style={{ 
            padding: '6px 10px 4px', 
            fontSize: '0.68rem', 
            fontWeight: '700',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}>
            Select Mode
          </div>

          {MODELS.map((model) => (
            <div
              key={model.key}
              className={`dropdown-item ${selectedModel === model.key ? 'selected' : ''} ${model.key === 'ultra' ? 'consensus-item' : ''}`}
              role="option"
              aria-selected={selectedModel === model.key}
              onClick={() => {
                onModelChange(model.key);
                setIsOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onModelChange(model.key);
                  setIsOpen(false);
                }
              }}
              tabIndex={0}
            >
              <span style={{ 
                width: '8px', height: '8px', borderRadius: '50%', 
                background: model.color, flexShrink: 0 
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 600 }}>{model.emoji} {model.label}</span>
                  {model.isPremium && (
                    <span style={{
                      fontSize: '0.6rem',
                      background: 'linear-gradient(135deg, #ec4899, #9333ea)',
                      color: 'white',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontWeight: '700',
                      letterSpacing: '0.03em'
                    }}>
                      PRO
                    </span>
                  )}
                </div>
                <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.6, marginTop: '2px' }}>
                  {model.description}
                </span>
              </div>
              {selectedModel === model.key && (
                <span style={{ color: model.color, fontSize: '0.8rem' }}>✓</span>
              )}
            </div>
          ))}

          <div style={{
            margin: '6px 8px 4px',
            padding: '8px 10px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.4'
          }}>
            🔒 Your conversations are not permanently stored on our servers
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(ModelSelector);
