import React, { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle, XCircle, Loader2, BookOpen, FileJson, AlertCircle, FileText, Brain, SearchCheck, RefreshCw } from 'lucide-react';
import { runAgentPipeline } from './agents/pipeline';

const PipelineTracker = ({ activeStep, log }) => {
  const steps = [
    { id: 'IDLE', label: 'Ready', icon: <FileText size={18} /> },
    { id: 'GENERATING_DRAFT', label: 'Drafting', icon: <Brain size={18} /> },
    { id: 'REVIEWING_DRAFT', label: 'Reviewing', icon: <SearchCheck size={18} /> },
    { id: 'REFINING_CONTENT', label: 'Refining', icon: <RefreshCw size={18} /> },
    { id: 'COMPLETED', label: 'Done', icon: <CheckCircle size={18} /> },
  ];

  const getStepIndex = (stepId) => steps.findIndex(s => s.id === stepId) === -1 ? 0 : steps.findIndex(s => s.id === stepId);
  const currentIndex = activeStep === 'ERROR' ? steps.length : getStepIndex(activeStep);

  return (
    <div className="glass-panel animate-fade-in" style={{ marginBottom: '24px' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Loader2 size={20} className={activeStep !== 'IDLE' && activeStep !== 'COMPLETED' && activeStep !== 'ERROR' ? 'animate-spin' : ''} style={{ opacity: (activeStep !== 'IDLE' && activeStep !== 'COMPLETED' && activeStep !== 'ERROR') ? 1 : 0.3, animationDuration: '0.9s' }} />
        Live Pipeline Status
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        {steps.map((step, i) => {
          let isActive = activeStep === step.id;
          let isPast = currentIndex > i;

          if (activeStep === 'ERROR') isActive = false;

          let stageClass = 'stage-idle';
          if (isActive) stageClass = 'stage-active';
          if (isPast) stageClass = 'stage-done';

          let connectorClass = '';
          if (isActive) connectorClass = 'connector-active';
          if (isPast) connectorClass = 'connector-done';

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 10 }}>
                <div className={stageClass} style={{
                  position: 'relative',
                  width: '44px', height: '44px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.4s, border-color 0.4s'
                }}>
                  {isActive && activeStep !== 'COMPLETED' && activeStep !== 'IDLE' && <div className="ripple-pulse" />}
                  {step.icon}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 700 : 400, color: (isActive || isPast) ? 'white' : 'var(--text-muted)' }}>
                  {step.label}
                </span>
              </div>

              {/* Connecting Dashed SVG Line */}
              {i < steps.length - 1 && (
                <div style={{ flex: 1, margin: '0 8px', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
                  <svg width="100%" height="2" style={{ display: 'block', overflow: 'visible' }}>
                    <line x1="0" y1="1" x2="100%" y2="1" strokeWidth="2" className={`connector-dash ${connectorClass}`} />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {activeStep === 'ERROR' && (
        <div className="log-line" style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)', borderRadius: '8px', color: '#fca5a5', marginBottom: '16px', display: 'flex', gap: '8px' }}>
          <AlertCircle size={20} /> Pipeline failed. Check console or API key.
        </div>
      )}

      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', height: '170px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {log.map((entry, i) => {
          let color = 'var(--text-muted)';
          let borderColor = 'var(--glass-border)';
          if (entry.step === 'ERROR') { color = 'var(--danger)'; borderColor = 'var(--danger)'; }
          else if (entry.step === 'COMPLETED') { color = '#22c55e'; borderColor = '#22c55e'; }
          else if (entry.step !== 'IDLE') { color = '#fbbf24'; borderColor = '#f59e0b'; }

          return (
            <div key={i} className="log-line" style={{ fontSize: '0.9rem', color: color, borderLeft: `3px solid ${borderColor}`, paddingLeft: '10px' }}>
              <span style={{ color: 'var(--text-muted)', marginRight: '8px', fontSize: '0.8rem' }}>{entry.timeLabel || new Date().toLocaleTimeString()}</span>
              {entry.message}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ContentVisualizer = ({ payload, review }) => {
  const [view, setView] = useState('RENDERED');

  if (!payload) return null;

  return (
    <div className="glass-panel animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Content Preview</h3>
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
          background: review.status === 'pass' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${review.status === 'pass' ? 'var(--accent)' : 'var(--danger)'}`
        }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: review.status === 'pass' ? 'var(--accent)' : 'var(--danger)' }}>
            {review.status === 'pass' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            Reviewer Agent: {review.status.toUpperCase()}
          </h4>
          {review.feedback && review.feedback.length > 0 && (
            <ul style={{ marginTop: '8px', paddingLeft: '24px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
              {review.feedback.map((fb, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>{fb}</li>
              ))}
            </ul>
          )}
        </div>
      )
      }

      <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px' }}>
        {view === 'JSON' ? (
          <pre style={{ margin: 0, fontSize: '0.85rem', color: '#a78bfa', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(payload, null, 2)}
          </pre>
        ) : (
          <div style={{ lineHeight: '1.7' }}>
            <h4 style={{ color: 'var(--primary)', marginBottom: '12px', fontSize: '1.3rem' }}>Explanation</h4>
            <p style={{ marginBottom: '24px', fontSize: '1.05rem', color: 'var(--text-main)' }}>{payload.explanation}</p>

            <h4 style={{ color: 'var(--primary)', marginBottom: '12px', fontSize: '1.3rem' }}>Multiple Choice Questions</h4>
            {payload.mcqs?.map((mcq, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <p style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text-main)' }}>{idx + 1}. {mcq.question}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {mcq.options?.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '6px',
                        background: opt === mcq.answer ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.3)',
                        border: opt === mcq.answer ? '1px solid var(--accent)' : '1px solid transparent',
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
                        background: opt === mcq.answer ? 'var(--accent)' : 'var(--glass-border)',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}>
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      {opt}
                      {opt === mcq.answer && <CheckCircle size={16} color="var(--accent)" style={{ marginLeft: 'auto' }} />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div >
  );
};

const SplashScreen = () => (
  <div className="splash-overlay">
    <div className="splash-grid"></div>
    <div className="splash-scan"></div>

    <h1 className="splash-title">Code AI Lab</h1>
    <div className="splash-subtitle">
      <span>Agent-Based &middot; UI-Driven &middot; Educational Formatter</span>
      <div className="splash-dots">
        <span>.</span><span>.</span><span>.</span>
      </div>
    </div>
  </div>
);

export default function App() {
  const [apiKey] = useState('AIzaSyAgZPgmiLbrok1xHD2JLa40pqn4B1zfjeM');
  const [grade, setGrade] = useState(() => Number(localStorage.getItem('savedGrade')) || 4);
  const [topic, setTopic] = useState(() => localStorage.getItem('savedTopic') || 'Types of angles');

  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStep, setActiveStep] = useState(() => localStorage.getItem('savedActiveStep') || 'IDLE');
  const [log, setLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem('savedLog')) || []; }
    catch { return []; }
  });

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 5200);
    return () => clearTimeout(timer);
  }, []);

  const [currentPayload, setCurrentPayload] = useState(() => {
    try { return JSON.parse(localStorage.getItem('savedPayload')) || null; }
    catch { return null; }
  });
  const [currentReview, setCurrentReview] = useState(() => {
    try { return JSON.parse(localStorage.getItem('savedReview')) || null; }
    catch { return null; }
  });

  useEffect(() => {
    localStorage.setItem('savedGrade', grade);
    localStorage.setItem('savedTopic', topic);
    localStorage.setItem('savedActiveStep', activeStep);
    localStorage.setItem('savedLog', JSON.stringify(log));
    localStorage.setItem('savedPayload', JSON.stringify(currentPayload));
    localStorage.setItem('savedReview', JSON.stringify(currentReview));
  }, [grade, topic, activeStep, log, currentPayload, currentReview]);

  const startPipeline = async () => {
    if (!apiKey) {
      alert("Please enter a Google Gemini API Key");
      return;
    }

    setIsGenerating(true);
    setLog([]);
    setCurrentPayload(null);
    setCurrentReview(null);

    const pipeline = runAgentPipeline(apiKey, grade, topic);

    for await (const state of pipeline) {
      await new Promise(resolve => setTimeout(resolve, 400)); // 400ms stage transition delay
      setActiveStep(state.step);

      if (state.payload || state.finalContent) {
        setCurrentPayload(state.payload || state.finalContent);
      }

      if (state.review) {
        setCurrentReview(state.review);
      }

      await new Promise(resolve => setTimeout(resolve, 480)); // 480ms log handoff delay
      setLog(prev => [...prev, { ...state, timeLabel: new Date().toLocaleTimeString() }]);
    }

    setIsGenerating(false);
  };

  return (
    <>
      {showSplash && <SplashScreen />}
      <div className="main-app-enter" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 className="animate-fade-in">Code AI Lab</h1>
          <p style={{ fontSize: '1.1rem', marginTop: '8px', color: 'var(--text-muted)' }}>Agent-Based, UI-Driven Educational Formatter</p>
        </header>

        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Left Column: Controls & Pipeline Tracker */}
          <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column' }}>

            <div className="glass-panel animate-fade-in" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Generator Configuration</h2>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Target Grade</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={grade}
                  onChange={e => setGrade(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Types of angles"
                />
              </div>

              <button
                className="btn-primary"
                style={{ width: '100%', height: '48px' }}
                onClick={startPipeline}
                disabled={isGenerating || !apiKey || !topic}
              >
                {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
                {isGenerating ? 'Running Pipeline...' : 'Generate & Review Content'}
              </button>
            </div>

            <PipelineTracker activeStep={activeStep} log={log} />

          </div>

          {/* Right Column: Content Presenter */}
          <div style={{ flex: '2 1 600px', display: 'flex', height: 'calc(100vh - 350px)', minHeight: '600px' }}>
            {currentPayload ? (
              <ContentVisualizer payload={currentPayload} review={currentReview} />
            ) : (
              <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <AlertCircle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p style={{ fontSize: '1.2rem', fontWeight: 500 }}>No Content Generated Yet</p>
                <p style={{ fontSize: '0.95rem', marginTop: '8px', textAlign: 'center', maxWidth: '300px' }}>
                  Click 'Generate & Review Content' to watch the autonomous educational agents in action!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
