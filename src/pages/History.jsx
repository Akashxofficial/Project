import React, { useEffect, useState } from 'react';
import { Bookmark, FileText, GraduationCap, Clock, BookOpen, AlertCircle } from 'lucide-react';
import { getUserDocuments } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function History() {
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDocs() {
      if (currentUser) {
        // We use email as a fallback ID if uid isn't there for the mock user
        const docs = await getUserDocuments(currentUser.uid || currentUser.email);
        setDocuments(docs);
      }
      setLoading(false);
    }
    fetchDocs();
  }, [currentUser]);

  const getIcon = (type) => {
    switch(type) {
      case 'note': return <FileText size={20} color="var(--primary)" />;
      case 'test': return <GraduationCap size={20} color="#f43f5e" />;
      case 'timetable': return <Clock size={20} color="#8b5cf6" />;
      case 'revision': return <BookOpen size={20} color="#10b981" />;
      default: return <FileText size={20} />;
    }
  };

  if (!currentUser) {
    return (
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
        <h2>Please Sign In</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You must be logged in to view your saved materials.</p>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card-icon" style={{ marginBottom: 0, backgroundColor: 'var(--primary-light)' }}>
          <Bookmark size={24} color="var(--primary)" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>My Saved Materials</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Access your previously generated notes, timetables, and tests.</p>
        </div>
      </div>

      {loading ? (
        <p>Loading your history...</p>
      ) : documents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>You haven't saved any materials yet. Try generating some notes or a test!</p>
        </div>
      ) : (
        <div className="grid-cards">
          {documents.map(doc => (
            <div key={doc.id} className="card" style={{ cursor: 'pointer' }} onClick={() => alert("Viewing saved document functionality coming soon!")}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius)' }}>
                  {getIcon(doc.type)}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {doc.createdAt?.toDate ? doc.createdAt.toDate().toLocaleDateString() : 'Just now'}
                </div>
              </div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{doc.title}</h3>
              <p style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 600, marginTop: 'auto' }}>
                View Document &rarr;
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
