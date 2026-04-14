import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, Loader2, BookOpen, FileJson, AlertCircle, RefreshCw } from 'lucide-react';

const ContentVisualizer = ({ payload, review }) => {
  const [view, setView] = useState('RENDERED');

  if (!payload) return null;

  return (
    <div className="glass-panel animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Final Content Preview</h3>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
          <button
            className="btn-outline"
            style={{ padding: '6px 12px', fontSize: '0.85rem', background: view === 'RENDERED' ? 'var(--glass-border)' : 'transparent' }}
            onClick={() => setView('RENDERED')}
          >
            <BookOpen size={14} /> Rendered
          </button>
          <button
            className="btn-outline"
            style={{ padding: '6px 12px', fontSize: '0.85rem', background: view === 'JSON' ? 'var(--glass-border)' : 'transparent' }}
            onClick={() => setView('JSON')}
          >
            <FileJson size={14} /> JSON
          </button>
        </div>
      </div>

      {review && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          borderRadius: '8px',
          background: review.pass ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${review.pass ? 'var(--accent)' : 'var(--danger)'}`
        }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: review.pass ? 'var(--accent)' : 'var(--danger)' }}>
            {review.pass ? <CheckCircle size={18} /> : <XCircle size={18} />}
            Final Review Status: {review.pass ? 'PASS' : 'FAIL'}
          </h4>
          {review.feedback && review.feedback.length > 0 && (
            <ul style={{ marginTop: '8px', paddingLeft: '24px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
              {review.feedback.map((fb, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}><strong>{fb.field}</strong>: {fb.issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px' }}>
        {view === 'JSON' ? (
          <pre style={{ margin: 0, fontSize: '0.85rem', color: '#a78bfa', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(payload, null, 2)}
          </pre>
        ) : (
          <div style={{ lineHeight: '1.7' }}>
            <h4 style={{ color: 'var(--primary)', marginBottom: '12px', fontSize: '1.3rem' }}>Explanation</h4>
            <p style={{ marginBottom: '24px', fontSize: '1.05rem', color: 'var(--text-main)' }}>{payload.explanation?.text}</p>

            <h4 style={{ color: 'var(--primary)', marginBottom: '12px', fontSize: '1.3rem' }}>Multiple Choice Questions</h4>
            {payload.mcqs?.map((mcq, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <p style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text-main)' }}>{idx + 1}. {mcq.question}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {mcq.options?.map((opt, oIdx) => {
                    const isCorrect = oIdx === mcq.correct_index;
                    return (
                      <div
                        key={oIdx}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '6px',
                          background: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.3)',
                          border: isCorrect ? '1px solid var(--accent)' : '1px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: isCorrect ? 'var(--accent)' : 'var(--glass-border)',
                          color: 'white',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        {opt}
                        {isCorrect && <CheckCircle size={16} color="var(--accent)" style={{ marginLeft: 'auto' }} />}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [grade, setGrade] = useState(5);
  const [topic, setTopic] = useState('Fractions as parts of a whole');
  const [isGenerating, setIsGenerating] = useState(false);
  const [runArtifact, setRunArtifact] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const generateContent = async () => {
    setIsGenerating(true);
    setRunArtifact(null);
    setErrorMsg('');

    try {
      const response = await fetch('http://localhost:8000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade: Number(grade), topic, user_id: 'local_ui_user' })
      });
      if (!response.ok) {
        throw new Error("HTTP connection to backend failed");
      }
      const data = await response.json();
      setRunArtifact(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="main-app-enter" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="animate-fade-in">Auditable AI Content Pipeline</h1>
        <p style={{ fontSize: '1.1rem', marginTop: '8px', color: 'var(--text-muted)' }}>Backend-Driven Education Flow with SQLite RunArtifacts</p>
      </header>

      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="glass-panel animate-fade-in">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>FastAPI Configuration</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Target Grade (e.g. 5)</label>
              <input type="number" value={grade} onChange={e => setGrade(e.target.value)} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Topic</label>
              <input type="text" value={topic} onChange={e => setTopic(e.target.value)} />
            </div>
            <button className="btn-primary" style={{ width: '100%', height: '48px' }} onClick={generateContent} disabled={isGenerating}>
              {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
              {isGenerating ? 'Running Backend Pipeline...' : 'Generate AI Pipeline'}
            </button>
            {errorMsg && <p style={{ color: 'var(--danger)', marginTop: '12px' }}>{errorMsg}</p>}
          </div>

          {/* Audit Logs showing the payload metadata */}
          {runArtifact && (
            <div className="glass-panel animate-fade-in">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>RunArtifact Metadata</h3>
              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-muted)' }}>
                <p><strong>Run ID:</strong> {runArtifact.run_id}</p>
                <p>
                  <strong>Status:</strong> <span style={{ color: runArtifact.final.status === 'approved' ? '#22c55e' : 'var(--danger)' }}>{runArtifact.final.status.toUpperCase()}</span>
                </p>
                {runArtifact.final.error && (
                  <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '4px', marginTop: '4px' }}>
                    <strong>Backend Error:</strong> {runArtifact.final.error}
                  </div>
                )}
                <p><strong>Attempts:</strong> {runArtifact.attempts.length} cycle(s)</p>
                <p><strong>Started:</strong> {new Date(runArtifact.timestamps.started_at).toLocaleString()}</p>
              </div>
            </div>
          )}

          {runArtifact?.attempts?.map((attempt, index) => (
             <div key={index} className="glass-panel animate-fade-in" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
               <h4 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                 <RefreshCw size={14} /> Attempt {attempt.attempt}
               </h4>
               <p style={{ fontSize: '0.8rem', color: attempt.review?.pass ? '#22c55e' : 'var(--danger)' }}>
                 Review Pass: {attempt.review?.pass ? 'True' : 'False'}
               </p>
             </div>
          ))}

        </div>

        <div style={{ flex: '2 1 600px', display: 'flex', height: 'calc(100vh - 200px)', minHeight: '600px' }}>
          {runArtifact?.final?.content ? (
            <ContentVisualizer 
              payload={runArtifact.final.content} 
              review={runArtifact.attempts[runArtifact.attempts.length - 1]?.review} 
            />
          ) : (
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              {isGenerating ? (
                <>
                  <Loader2 size={48} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--primary)' }} />
                  <p style={{ fontSize: '1.2rem', fontWeight: 500 }}>Orchestrating Agents...</p>
                </>
              ) : (
                <>
                  <AlertCircle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                  <p style={{ fontSize: '1.2rem', fontWeight: 500 }}>{runArtifact?.final?.status || 'No Content Generated Yet'}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
