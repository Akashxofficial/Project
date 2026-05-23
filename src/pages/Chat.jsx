import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Sparkles, User } from 'lucide-react';
import { generateAIContent, generateDoubtPrompt } from '../lib/ai';
import { limiter } from '../lib/rateLimiter';
import ReactMarkdown from 'react-markdown';

export default function Chat() {
  // ═════════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'ai',
      text: "Hello! I am your personal AI teacher. What doubt can I solve for you today? You can ask in English or Hindi!"
    }
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // ═════════════════════════════════════════════════════════════════════════
  // AUTO-SCROLL TO BOTTOM
  // ═════════════════════════════════════════════════════════════════════════

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, error]);

  // ═════════════════════════════════════════════════════════════════════════
  // HANDLE SEND MESSAGE WITH RATE LIMITING
  // ═════════════════════════════════════════════════════════════════════════

  const handleSend = async (e) => {
    e.preventDefault();

    // Validate input
    if (!input.trim()) {
      return;
    }

    // ✅ STEP 1: Check rate limit FIRST
    if (!limiter.isAllowed()) {
      const waitSeconds = limiter.getRetryAfter();
      setError(`⏳ Please wait ${waitSeconds} seconds before asking another question.`);

      // Auto-clear error after 5 seconds
      setTimeout(() => setError(''), 5000);
      return;
    }

    // Clear any previous errors
    setError('');
    setLoading(true);
    setIsTyping(true);

    try {
      // ✅ STEP 2: Save user message to chat
      const userMessage = {
        id: Date.now(),
        role: 'user',
        text: input
      };

      setMessages(prev => [...prev, userMessage]);
      const currentInput = input;
      setInput(''); // Clear input immediately

      // ✅ STEP 3: Generate the prompt for AI
      const prompt = generateDoubtPrompt(currentInput);

      // ✅ STEP 4: Call AI (with automatic caching + retry logic)
      const generatedText = await generateAIContent(prompt);

      // ✅ STEP 5: Check if response is an error message
      if (generatedText.startsWith('⚠️')) {
        // It's an error message from the API
        setError(generatedText);
        setTimeout(() => setError(''), 5000);
      } else {
        // It's a valid response - add to messages
        const aiMessage = {
          id: Date.now() + 1,
          role: 'ai',
          text: generatedText
        };

        setMessages(prev => [...prev, aiMessage]);
      }

    } catch (err) {
      // Handle unexpected errors
      console.error('Error in handleSend:', err);
      setError('⚠️ An unexpected error occurred. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // JSX RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="chat-container">
      {/* MESSAGES AREA */}
      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="avatar">
              {msg.role === 'ai' ? (
                <Sparkles size={18} />
              ) : (
                <User size={18} />
              )}
            </div>

            <div
              className="message-content generated-content"
              style={{
                margin: 0,
                padding: '1rem 1.5rem',
                width: '100%',
                overflowX: 'auto'
              }}
            >
              {msg.role === 'ai' ? (
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              ) : (
                <span>{msg.text}</span>
              )}
            </div>
          </div>
        ))}

        {/* TYPING INDICATOR */}
        {isTyping && (
          <div className="message ai">
            <div className="avatar">
              <Sparkles size={18} />
            </div>
            <div
              className="message-content"
              style={{
                opacity: 0.7,
                padding: '1rem 1.5rem'
              }}
            >
              <span>Thinking...</span>
            </div>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="message ai">
            <div className="avatar">
              <Sparkles size={18} />
            </div>
            <div
              className="message-content"
              style={{
                opacity: 0.8,
                color: error.includes('wait') ? '#ff9800' : '#f44336',
                padding: '1rem 1.5rem'
              }}
            >
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* SCROLL ANCHOR */}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className="chat-input-area">
        <form onSubmit={handleSend} className="chat-input-wrapper">
          {/* IMAGE UPLOAD BUTTON (Coming soon) */}
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              position: 'absolute',
              left: '0.5rem',
              width: '2.5rem',
              height: '2.5rem',
              padding: 0,
              borderRadius: '50%',
              border: 'none',
              cursor: 'not-allowed',
              opacity: 0.5
            }}
            title="Upload image feature coming soon"
            disabled
          >
            <ImageIcon size={20} />
          </button>

          {/* TEXT INPUT */}
          <input
            type="text"
            className="chat-input"
            style={{
              paddingLeft: '3.5rem',
              opacity: isTyping || error.includes('wait') ? 0.6 : 1
            }}
            placeholder="Type your doubt here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping || error.includes('wait')}
            autoFocus
          />

          {/* SEND BUTTON */}
          <button
            type="submit"
            className="chat-submit"
            disabled={
              !input.trim() ||
              isTyping ||
              loading ||
              error.includes('wait')
            }
            title={
              !input.trim()
                ? 'Type a message first'
                : isTyping
                  ? 'Waiting for response...'
                  : error.includes('wait')
                    ? 'Please wait before sending another message'
                    : 'Send message'
            }
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// FEATURES INCLUDED:
// ═════════════════════════════════════════════════════════════════════════════
// ✅ Rate limiting (5 messages per minute max)
// ✅ Automatic caching (same question = instant answer)
// ✅ Error handling (shows rate limit & API errors)
// ✅ Loading states (typing indicator, disabled button)
// ✅ Auto-scroll (chat scrolls to latest message)
// ✅ Markdown support (AI responses rendered nicely)
// ✅ Auto-focus (input field focused on load)
// ✅ Clear error messages (helpful feedback to user)
// ═════════════════════════════════════════════════════════════════════════════
