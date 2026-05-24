import React, { useState } from 'react';
import { Sparkles, BookOpen, MessageSquare, GraduationCap, Clock, Zap, Shield, Star } from 'lucide-react';
import { loginWithGoogle } from '../lib/firebase';

const features = [
  { icon: <MessageSquare size={18} />, label: 'AI Doubt Solver', desc: 'Ask any question, get instant answers' },
  { icon: <BookOpen size={18} />, label: 'Smart Notes', desc: 'AI-generated chapter notes in seconds' },
  { icon: <GraduationCap size={18} />, label: 'Test Generator', desc: 'Practice tests tailored for you' },
  { icon: <Clock size={18} />, label: 'Study Planner', desc: 'Personalized exam timetable' },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
      setError('Sign-in failed. Please allow popups and try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Animated background orbs ── */}
      <div style={{
        position: 'absolute', top: '-10%', right: '-5%',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
        animation: 'orb-drift 9s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', left: '-5%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
        animation: 'orb-drift 11s ease-in-out infinite reverse',
      }} />
      <div style={{
        position: 'absolute', top: '40%', left: '20%',
        width: '200px', height: '200px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
        animation: 'orb-drift 7s ease-in-out infinite 2s',
      }} />

      {/* ── Login Card ── */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '1.5rem',
        boxShadow: '0 20px 60px rgba(79,70,229,0.14)',
        padding: '2.5rem 2rem',
        maxWidth: '420px',
        width: '100%',
        position: 'relative',
        zIndex: 1,
        animation: 'scaleIn 0.4s cubic-bezier(.34,1.56,.64,1) both',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem', animation: 'fadeUp 0.4s 0.1s both' }}>
          <div style={{
            width: '3.5rem', height: '3.5rem',
            background: 'linear-gradient(135deg, #4f46e5, #f59e0b)',
            borderRadius: '1rem',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
            marginBottom: '1rem',
            animation: 'float 3s ease-in-out infinite',
          }}>
            <Sparkles size={22} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            TaniOS <span className="text-gradient">AI</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
            Your personal AI study companion
          </p>
        </div>

        {/* Feature chips — staggered entrance */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '0.625rem', marginBottom: '1.75rem'
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              padding: '0.75rem',
              display: 'flex', flexDirection: 'column', gap: '0.375rem',
              animation: `fadeUp 0.35s ${0.15 + i * 0.07}s cubic-bezier(.4,0,.2,1) both`,
              transition: 'transform 0.2s ease, border-color 0.2s ease',
              cursor: 'default',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                {f.icon}
                <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)' }}>{f.label}</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{f.desc}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem',
          animation: 'fadeIn 0.4s 0.4s both'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Sign in to continue</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Google Sign-In Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.875rem 1.5rem',
            borderRadius: '0.75rem',
            border: '1.5px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text)',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.75rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            animation: 'bounce-in 0.5s 0.45s cubic-bezier(.4,0,.2,1) both',
          }}
          onMouseEnter={e => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(79,70,229,0.2)';
              e.currentTarget.style.borderColor = 'var(--primary)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
          onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
        >
          {!loading ? (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          ) : (
            <div style={{
              width: '20px', height: '20px',
              border: '2.5px solid var(--primary)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite'
            }} />
          )}
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {/* Error */}
        {error && (
          <p style={{
            marginTop: '1rem', textAlign: 'center',
            fontSize: '0.82rem', color: '#ef4444',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '0.5rem', padding: '0.625rem',
            animation: 'fadeUp 0.3s ease both',
          }}>
            {error}
          </p>
        )}

        {/* Footer badges */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          gap: '1rem', marginTop: '1.5rem',
          animation: 'fadeIn 0.5s 0.5s both'
        }}>
          {[
            { icon: <Shield size={12} />, text: 'Privacy first' },
            { icon: <Zap size={12} />, text: 'Free to use' },
            { icon: <Star size={12} />, text: 'CBSE & RBSE' },
          ].map((b, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              color: 'var(--text-secondary)', fontSize: '0.72rem',
              transition: 'color 0.2s ease',
            }}>
              {b.icon}
              <span>{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shared keyframe for spin + login page animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-7px); }
        }
        @keyframes bounce-in {
          0%   { opacity: 0; transform: scale(0.88); }
          60%  { opacity: 1; transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        @keyframes orb-drift {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(25px,-18px) scale(1.05); }
          66%  { transform: translate(-12px,14px) scale(0.97); }
          100% { transform: translate(0,0) scale(1); }
        }
      `}</style>
    </div>
  );
}
