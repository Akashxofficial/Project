import React, { useState } from 'react';
import { Mail, MessageSquare, AlertCircle, CheckCircle, HelpCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Standalone SVG Instagram Icon to bypass older lucide-react version gaps
const Instagram = (props) => (
  <svg
    viewBox="0 0 24 24"
    width={props.size || 18}
    height={props.size || 18}
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={props.style}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export default function Support() {
  const { currentUser } = useAuth();
  
  // State for support ticket form
  const [name, setName] = useState(currentUser?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // FAQ open/close states
  const [faqOpen, setFaqOpen] = useState({
    0: false,
    1: false,
    2: false,
    3: false
  });

  const toggleFaq = (index) => {
    setFaqOpen(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSendTicket = async (e) => {
    e.preventDefault();
    if (!email || !subject || !message) {
      setError('Please fill in all required fields.');
      return;
    }
    
    setError('');
    setSuccess(false);
    setSubmitting(true);

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess(true);
        setSubject('');
        setMessage('');
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Unable to send ticket. Please check your internet connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const faqs = [
    {
      q: 'How does TaniOS AI help me study?',
      a: 'TaniOS studies with you by offering interactive syllabus reviews, generating targeted revision notes, and answering complex school-level doubts. Our tools are customized to suit the board guidelines.'
    },
    {
      q: 'My payment was successful but Pro is not active yet?',
      a: 'All subscription claims are reviewed manually against UPI transaction logs. Approval is typically processed within 15 to 45 minutes. If it has been more than 2 hours, please file a support request here or email us directly.'
    },
    {
      q: 'How do I generate a revision sheet or mind map?',
      a: 'Go to the Dashboard, navigate to "One-Click Study Generators" at the bottom, select your study tool (e.g. revision sheet, mind map), choose your subject and topic, and click "Generate". Output will load instantly.'
    },
    {
      q: 'Can I upload files/textbooks for custom review?',
      a: 'Yes! TaniOS Pro supports "Textbook RAG". Upload any syllabus PDF or course material, and TaniOS will reference only that specific document to help you study and solve problems.'
    }
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      
      {/* HEADER HERO */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.04) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.18)',
        borderTop: '1px solid rgba(99, 102, 241, 0.35)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        marginBottom: '1.75rem',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99, 102, 241, 0.1)', padding: '6px 12px', borderRadius: '20px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.75rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <HelpCircle size={14} /> Help & Support Console
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text)', margin: '0 0 0.5rem 0' }}>
            How can we help you today?
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '650px', lineHeight: 1.6 }}>
            Facing payment issues, found a bug, or have ideas for TaniOS AI? Send a ticket below or connect directly. Our developer team will assist you shortly.
          </p>
        </div>
        
        {/* Decorative orb */}
        <div style={{
          position: 'absolute', right: '-10%', top: '-20%', width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none'
        }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* LEFT COLUMN: FAQ & DIRECT CHANNELS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* FAQs section */}
          <section className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 1.25rem 0', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="var(--primary)" /> Frequently Asked Questions
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {faqs.map((faq, idx) => (
                <div 
                  key={idx} 
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'var(--nested-card-bg)',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      color: 'var(--text)',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}
                  >
                    <span>{faq.q}</span>
                    <ArrowRight 
                      size={14} 
                      style={{ 
                        transform: faqOpen[idx] ? 'rotate(90deg)' : 'none', 
                        transition: 'transform 0.2s ease',
                        color: 'var(--text-secondary)'
                      }} 
                    />
                  </button>
                  {faqOpen[idx] && (
                    <div style={{
                      padding: '0 1rem 1rem 1rem',
                      fontSize: '0.82rem',
                      lineHeight: 1.6,
                      color: 'var(--text-secondary)',
                      borderTop: '1px solid var(--border)',
                      paddingTop: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.005)'
                    }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Direct channels */}
          <section className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 1.25rem 0', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={18} color="var(--primary)" /> Direct Contact Channels
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
              
              {/* Email Card */}
              <a 
                href="mailto:taniosai00@gmail.com" 
                style={{ 
                  textDecoration: 'none',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '1rem', 
                  borderRadius: '10px', 
                  background: 'var(--nested-card-bg)',
                  border: '1px solid var(--nested-card-border)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.background = 'var(--nested-card-bg-hover)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--nested-card-border)';
                  e.currentTarget.style.background = 'var(--nested-card-bg)';
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Mail size={18} />
                </div>
                <div>
                  <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '0.85rem' }}>Email Support</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>taniosai00@gmail.com</div>
                </div>
              </a>

              {/* Instagram Card */}
              <a 
                href="https://instagram.com/tanios_ai" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  textDecoration: 'none',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '1rem', 
                  borderRadius: '10px', 
                  background: 'var(--nested-card-bg)',
                  border: '1px solid var(--nested-card-border)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.background = 'var(--nested-card-bg-hover)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--nested-card-border)';
                  e.currentTarget.style.background = 'var(--nested-card-bg)';
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899' }}>
                  <Instagram size={18} />
                </div>
                <div>
                  <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '0.85rem' }}>DM us on Instagram</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>@tanios_ai</div>
                </div>
              </a>

            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: CONTACT FORM */}
        <section className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✉️ Raise a Support Ticket
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
            Send us a message directly from your console and we will reply to your registered email address.
          </p>

          <form onSubmit={handleSendTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            
            {success && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.75rem', borderRadius: '8px', color: '#10b981', fontSize: '0.82rem' }}>
                <CheckCircle size={16} /> Ticket raised successfully! Copy sent to your email.
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.75rem', borderRadius: '8px', color: '#ef4444', fontSize: '0.82rem' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>Your Name</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Akash" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  fontSize: '0.85rem',
                  background: 'var(--nested-card-bg)',
                  border: '1px solid var(--nested-card-border)',
                  color: 'var(--text)',
                  borderRadius: '6px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>Your Email <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="email" 
                required 
                className="input-field" 
                placeholder="e.g. student@gmail.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  fontSize: '0.85rem',
                  background: 'var(--nested-card-bg)',
                  border: '1px solid var(--nested-card-border)',
                  color: 'var(--text)',
                  borderRadius: '6px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>Subject / Issue Title <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="text" 
                required 
                className="input-field" 
                placeholder="e.g. Pro activation UTR issue / Bug in Revision Page" 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  fontSize: '0.85rem',
                  background: 'var(--nested-card-bg)',
                  border: '1px solid var(--nested-card-border)',
                  color: 'var(--text)',
                  borderRadius: '6px'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '0.35rem' }}>Problem Description <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea 
                required 
                className="input-field" 
                placeholder="Explain the problem or request in detail. If it is a payment issue, please paste your UTR and transaction timestamp." 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '0.65rem 0.8rem',
                  fontSize: '0.85rem',
                  background: 'var(--nested-card-bg)',
                  border: '1px solid var(--nested-card-border)',
                  color: 'var(--text)',
                  borderRadius: '6px',
                  resize: 'vertical',
                  flex: 1
                }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={submitting} 
              style={{
                width: '100%',
                padding: '0.75rem',
                background: submitting ? 'var(--border)' : 'linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%)',
                color: '#fff',
                fontWeight: 700,
                border: 'none',
                borderRadius: '8px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: submitting ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.2s ease',
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="spin" /> Submitting ticket...
                </>
              ) : (
                'Submit Support Ticket →'
              )}
            </button>

          </form>
        </section>

      </div>

    </div>
  );
}
