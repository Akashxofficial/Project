import React, { useState } from 'react';
import { Send, Image as ImageIcon, Sparkles, User } from 'lucide-react';

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

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Mock AI response
    setTimeout(() => {
      const aiMessage = {
        id: Date.now() + 1,
        role: 'ai',
        text: `Here is a simple explanation for your question:\n\nThis concept is very important for your exams. Let's break it down step-by-step so it's easy to understand. \n\n1. First, we identify the core principle.\n2. Then, we apply the formula: $E = mc^2$.\n3. Finally, you get the answer.\n\nDo you want me to explain this further in Hindi?`
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="avatar">
              {msg.role === 'ai' ? <Sparkles size={18} /> : <User size={18} />}
            </div>
            <div className="message-content" style={{ whiteSpace: 'pre-wrap' }}>
              {msg.text}
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
      </div>

      <div className="chat-input-area">
        <form onSubmit={handleSend} className="chat-input-wrapper">
          <button type="button" className="btn btn-secondary" style={{ position: 'absolute', left: '0.5rem', width: '2.5rem', height: '2.5rem', padding: 0, borderRadius: '50%', border: 'none' }}>
            <ImageIcon size={20} />
          </button>
          <input 
            type="text" 
            className="chat-input"
            style={{ paddingLeft: '3.5rem' }}
            placeholder="Type your doubt here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="chat-submit" disabled={!input.trim()}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
