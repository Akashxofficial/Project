import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, MessageSquare, Clock, FileText, GraduationCap, ArrowRight } from 'lucide-react';

export default function Home() {
  const features = [
    {
      title: "AI Doubt Solver",
      description: "Ask doubts in Hindi or English, upload images, and get instant step-by-step explanations.",
      icon: <MessageSquare size={24} />,
      link: "/chat",
      color: "var(--primary)"
    },
    {
      title: "AI Notes Generator",
      description: "Generate short notes, key points, important definitions, and formula sheets instantly.",
      icon: <FileText size={24} />,
      link: "/notes",
      color: "var(--accent)"
    },
    {
      title: "Smart Revision",
      description: "Get quick revision notes, one-shot summaries, and last-minute exam prep content.",
      icon: <BookOpen size={24} />,
      link: "/revision",
      color: "#10b981"
    },
    {
      title: "Study Planner",
      description: "Automatically generate a smart timetable based on your subjects, exams, and free time.",
      icon: <Clock size={24} />,
      link: "/timetable",
      color: "#8b5cf6"
    },
    {
      title: "Test Generator",
      description: "Create MCQ tests, short/long questions, and board-style practice papers.",
      icon: <GraduationCap size={24} />,
      link: "/test",
      color: "#f43f5e"
    }
  ];

  return (
    <div className="page-content">
      <div className="hero-section">
        <h1 className="hero-title">Study Smarter,<br/>Not Harder</h1>
        <p className="hero-subtitle">
          Your personal AI teacher available 24/7. Generate instant study material, 
          solve doubts, and prepare for exams faster than ever.
        </p>
        <Link to="/chat" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
          <MessageSquare size={20} />
          Ask a Doubt Now
        </Link>
      </div>

      <h2 style={{ marginBottom: '2rem' }}>Study Tools</h2>
      <div className="grid-cards">
        {features.map((feature, index) => (
          <Link to={feature.link} key={index} className="card" style={{ textDecoration: 'none' }}>
            <div className="card-icon" style={{ color: feature.color, backgroundColor: `${feature.color}20` }}>
              {feature.icon}
            </div>
            <h3 className="card-title">{feature.title}</h3>
            <p className="card-description">{feature.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, marginTop: 'auto' }}>
              Try now <ArrowRight size={16} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
