import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Sparkles, User } from 'lucide-react';
import { generateAIContent, generateDoubtPrompt } from '../lib/ai';
import ReactMarkdown from 'react-markdown';

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'ai',
      text: "Hello! I am your personal AI teacher. What doubt can I solve for you today? You can ask in English or Hindi!"
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    const prompt = generateDoubtPrompt(currentInput);
    const generatedText = await generateAIContent(prompt);
    
    const aiMessage = {
      id: Date.now() + 1,
      role: 'ai',
      text: generatedText
    };
    
    setMessages(prev => [...prev, aiMessage]);
    setIsTyping(false);
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="avatar">
              {msg.role === 'ai' ? <Sparkles size={18} /> : <User size={18} />}
            </div>
            <div className="message-content generated-content" style={{ margin: 0, padding: '1rem 1.5rem', width: '100%', overflowX: 'auto' }}>
              {msg.role === 'ai' ? (
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="message ai">
            <div className="avatar"><Sparkles size={18} /></div>
            <div className="message-content" style={{ opacity: 0.7 }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <form onSubmit={handleSend} className="chat-input-wrapper">
          <button type="button" className="btn btn-secondary" style={{ position: 'absolute', left: '0.5rem', width: '2.5rem', height: '2.5rem', padding: 0, borderRadius: '50%', border: 'none' }} title="Upload image feature coming soon">
            <ImageIcon size={20} />
          </button>
          <input 
            type="text" 
            className="chat-input"
            style={{ paddingLeft: '3.5rem' }}
            placeholder="Type your doubt here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
          />
          <button type="submit" className="chat-submit" disabled={!input.trim() || isTyping}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
