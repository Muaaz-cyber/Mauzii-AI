import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CopyButton = React.memo(({ text }) => {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button className="copy-btn" onClick={handleCopy} type="button">
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  );
});

function LoadingBubble() {
  return (
    <div className="message-wrapper assistant">
      <div className="message-badges">
        <span className="source-badge auto">Mauzii AI</span>
      </div>
      <div className="loading-indicator">
        <div className="loading-dot" />
        <div className="loading-dot" />
        <div className="loading-dot" />
      </div>
    </div>
  );
}

const ChatMessage = React.memo(({ message }) => {
  if (!message) return null;
  if (message.isLoading) return <LoadingBubble />;

  const isUser = message.role === 'user';

  return (
    <div className={`message-wrapper ${isUser ? 'user' : 'assistant'}`}>
      {/* AI badge */}
      {!isUser && (
        <div className="message-badges">
          {message.isConsensus ? (
            <span className="source-badge consensus">🔵 Ultra Mode</span>
          ) : (
            <span className="source-badge auto">
              {message.autoSelected ? '⚡ ' : ''}Mauzii AI
            </span>
          )}
        </div>
      )}

      <div className={`message-bubble ${message.isError ? 'error' : ''}`}>
        {isUser ? (
          <span className="user-text">{message.content}</span>
        ) : (
          <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline: islnline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  if (!islnline && match) {
                    return (
                      <div className="code-block-wrapper">
                        <div className="code-block-header">
                          <span className="code-lang">{match[1]}</span>
                          <CopyButton text={codeString} />
                        </div>
                        <SyntaxHighlighter
                          style={tomorrow}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderRadius: '0 0 8px 8px',
                            fontSize: '0.85rem',
                            background: '#1d1f21'
                          }}
                          {...props}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }
                  return <code className="inline-code" {...props}>{children}</code>;
                },
                p: ({ children }) => <p className="md-p">{children}</p>,
                ul: ({ children }) => <ul className="md-ul">{children}</ul>,
                ol: ({ children }) => <ol className="md-ol">{children}</ol>,
                li: ({ children }) => <li className="md-li">{children}</li>,
                strong: ({ children }) => <strong className="md-strong">{children}</strong>,
                h1: ({ children }) => <h1 className="md-h1">{children}</h1>,
                h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
                h3: ({ children }) => <h3 className="md-h3">{children}</h3>,
                blockquote: ({ children }) => <blockquote className="md-blockquote">{children}</blockquote>,
                table: ({ children }) => (
                  <div className="md-table-wrapper">
                    <table className="md-table">{children}</table>
                  </div>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="md-link">
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
            {!message.isError && message.content === '' && (
              <span className="typing-cursor">▋</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.message.content === next.message.content &&
    prev.message.isLoading === next.message.isLoading &&
    prev.message.isError === next.message.isError
  );
});

export default ChatMessage;
