import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Brain, Calculator, Languages, Clock, ChevronRight, CheckCircle2, ChevronDown, Trophy, RotateCcw, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { contentData } from './data';
import './App.css';

const SUBJECTS = ['GK', 'Reasoning', 'Maths', 'English'];
const REFRESH_TIME = 7200; // 2 hours (7200 seconds)
const QUESTIONS_PER_QUIZ = 50;
const NEGATIVE_MARK = 0.25;

// Helper to shuffle and pick N
const getRandomQuestions = (subject, count = 10) => {
  const all = contentData[subject];
  return [...all].sort(() => Math.random() - 0.5).slice(0, count);
};

// Date-based seed for a unique quiz daily
const getDailySeed = () => {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
};

function App() {
  const [activeTab, setActiveTab] = useState('learn'); // 'learn' or 'quiz'
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(REFRESH_TIME);
  const [expandedId, setExpandedId] = useState(null);
  const [displayQuestions, setDisplayQuestions] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: selectedIndex }
  const [showResults, setShowResults] = useState(false);

  const currentSubject = SUBJECTS[currentSubjectIndex];

  // Timer Persistence Logic
  useEffect(() => {
    const lastRefresh = localStorage.getItem('last_refresh_time');
    const now = Date.now();
    
    if (lastRefresh) {
      const elapsed = Math.floor((now - parseInt(lastRefresh)) / 1000);
      if (elapsed < REFRESH_TIME) {
        setTimeLeft(REFRESH_TIME - elapsed);
      } else {
        handleAutoRefresh();
      }
    } else {
      localStorage.setItem('last_refresh_time', now.toString());
      setTimeLeft(REFRESH_TIME);
    }
  }, []);

  // Learning Mode: Pick 10 shuffle
  useEffect(() => {
    if (activeTab === 'learn') {
      setDisplayQuestions(getRandomQuestions(currentSubject));
    }
  }, [currentSubject, activeTab]);

  // Daily Quiz initialization
  useEffect(() => {
    if (activeTab === 'quiz') {
      const seed = getDailySeed();
      // Combine all pools
      const allQuestions = [
        ...contentData.GK,
        ...contentData.Reasoning,
        ...contentData.Maths,
        ...contentData.English
      ];
      
      // Simple seeded random to ensure same quiz for all users today
      const seededRandom = (s) => {
        const x = Math.sin(s++) * 10000;
        return x - Math.floor(x);
      };

      let currentSeed = seed;
      const shuffled = [...allQuestions]
        .map(value => ({ value, sort: seededRandom(currentSeed++) }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
        .slice(0, QUESTIONS_PER_QUIZ);
        
      setQuizQuestions(shuffled);
    }
  }, [activeTab]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoRefresh();
          return REFRESH_TIME;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTab]);

  const handleAutoRefresh = () => {
    setIsRefreshing(true);
    localStorage.setItem('last_refresh_time', Date.now().toString());
    
    setTimeout(() => {
      setCurrentSubjectIndex((prevIdx) => (prevIdx + 1) % SUBJECTS.length);
      setExpandedId(null);
      setIsRefreshing(false);
      setTimeLeft(REFRESH_TIME);
    }, 500);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getIcon = (subject) => {
    switch (subject) {
      case 'GK': return <BookOpen className="icon" />;
      case 'Reasoning': return <Brain className="icon" />;
      case 'Maths': return <Calculator className="icon" />;
      case 'English': return <Languages className="icon" />;
      default: return <BookOpen className="icon" />;
    }
  };

  const timerPercentage = (timeLeft / REFRESH_TIME) * 100;

  const handleSelectAnswer = (qId, optionIdx) => {
    if (showResults) return;
    setAnswers({ ...answers, [qId]: optionIdx });
    
    // Smooth transition to next question after selection
    if (currentQuizIdx < quizQuestions.length - 1) {
      setTimeout(() => setCurrentQuizIdx(prev => prev + 1), 400);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    let wrong = 0;
    let attempted = 0;
    quizQuestions.forEach(q => {
      const selectedIdx = answers[q.id];
      if (selectedIdx !== undefined) {
        attempted++;
        if (q.options[selectedIdx] === q.answer) {
          correct++;
        } else {
          wrong++;
        }
      }
    });
    const finalScore = correct - (wrong * NEGATIVE_MARK);
    return { correct, wrong, attempted, finalScore };
  };

  const handleFinishQuiz = () => {
    setShowResults(true);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="app-container">
      <div className="bg-mesh"></div>

      <header className="main-header">
        <div className="header-content">
          <div className="logo" onClick={() => setActiveTab('learn')}>
            <div className="logo-icon">PR</div>
            <h1>PORTAL<span> BY RAGHU</span></h1>
          </div>
          
          <div className="mode-toggle">
            <button 
              className={`mode-btn ${activeTab === 'learn' ? 'active' : ''}`}
              onClick={() => setActiveTab('learn')}
            >
              Learn
            </button>
            <button 
              className={`mode-btn ${activeTab === 'quiz' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('quiz');
                setAnswers({});
                setCurrentQuizIdx(0);
                setShowResults(false);
              }}
            >
              Daily Quiz
            </button>
          </div>

          {activeTab === 'learn' && (
            <div className="timer-badge">
              <Clock size={16} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
        {activeTab === 'learn' && (
          <div className="timer-progress-container">
            <motion.div 
              className="timer-progress-bar"
              animate={{ width: `${timerPercentage}%` }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </div>
        )}
      </header>

      {activeTab === 'learn' ? (
        <div className="learn-mode-view">
          <nav className="subject-nav">
            {SUBJECTS.map((sub, idx) => (
              <button
                key={sub}
                className={`subject-btn ${currentSubject === sub ? 'active' : ''}`}
                onClick={() => {
                  setCurrentSubjectIndex(idx);
                  setExpandedId(null);
                }}
              >
                {getIcon(sub)}
                <span>{sub}</span>
              </button>
            ))}
          </nav>

          <main className="content-area">
            <div className="section-title">
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                key={currentSubject}
              >
                {currentSubject} Excellence
              </motion.h2>
              <p>Curated insights to master your daily learning goals</p>
            </div>

            <div className="questions-grid">
              <AnimatePresence mode="wait">
                {!isRefreshing && (
                  <motion.div
                    key={currentSubject + displayQuestions.length}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="questions-wrapper"
                  >
                    {displayQuestions.map((q, index) => (
                      <motion.div 
                        key={q.id}
                        layout
                        className={`question-card ${expandedId === q.id ? 'expanded' : ''}`}
                        onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                        whileHover={{ y: -4 }}
                      >
                        <div className="card-header">
                          <span className="q-number">#{index + 1}</span>
                          <h3 className="question-text">{q.question}</h3>
                          <motion.div 
                            animate={{ rotate: expandedId === q.id ? 180 : 0 }}
                            className="expand-icon"
                          >
                            <ChevronDown size={20} />
                          </motion.div>
                        </div>
                        
                        <AnimatePresence>
                          {expandedId === q.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="explanation-box"
                            >
                              <div className="explanation-content">
                                <CheckCircle2 size={20} className="success-icon" />
                                <div>
                                  <strong>Correct Answer: {q.answer}</strong>
                                  <p>{q.explanation}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      ) : (
        <main className="quiz-area">
          {!showResults ? (
            <div className="quiz-view">
              <div className="quiz-progress-section">
                <div className="progress-info">
                  <span>Question {currentQuizIdx + 1} of {quizQuestions.length}</span>
                  <span>{Math.round(((currentQuizIdx + 1) / quizQuestions.length) * 100)}%</span>
                </div>
                <div className="progress-track">
                  <motion.div 
                    className="progress-fill"
                    animate={{ width: `${((currentQuizIdx + 1) / quizQuestions.length) * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                </div>
              </div>

              {quizQuestions.length > 0 && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuizIdx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="quiz-card-main"
                  >
                    <h2 className="quiz-question-text">{quizQuestions[currentQuizIdx].question}</h2>
                    <div className="options-container">
                      {quizQuestions[currentQuizIdx].options.map((option, idx) => (
                        <button
                          key={idx}
                          className={`quiz-option-btn ${answers[quizQuestions[currentQuizIdx].id] === idx ? 'selected' : ''}`}
                          onClick={() => handleSelectAnswer(quizQuestions[currentQuizIdx].id, idx)}
                        >
                          <span className="opt-key">{String.fromCharCode(65 + idx)}</span>
                          <span className="opt-text">{option}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

              <div className="quiz-controls">
                <button 
                  className="control-btn prev"
                  disabled={currentQuizIdx === 0}
                  onClick={() => setCurrentQuizIdx(prev => prev - 1)}
                >
                  Previous
                </button>
                {currentQuizIdx < quizQuestions.length - 1 ? (
                  <button 
                    className="control-btn next"
                    onClick={() => setCurrentQuizIdx(prev => prev + 1)}
                  >
                    Next Question
                  </button>
                ) : (
                  <button className="control-btn finish" onClick={handleFinishQuiz}>
                    Finish & View Score
                  </button>
                )}
              </div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="results-view"
            >
              <div className="results-header">
                <Trophy size={64} className="trophy-gold" />
                <h2>Daily Quiz Completed!</h2>
                <p>Date: {new Date().toLocaleDateString()}</p>
              </div>

              <div className="scores-grid">
                <div className="score-item">
                  <span className="sc-label">Attempted</span>
                  <span className="sc-val">{calculateScore().attempted}</span>
                </div>
                <div className="score-item">
                  <span className="sc-label">Correct</span>
                  <span className="sc-val pos">{calculateScore().correct}</span>
                </div>
                <div className="score-item">
                  <span className="sc-label">Wrong</span>
                  <span className="sc-val neg">{calculateScore().wrong}</span>
                </div>
                <div className="score-item highlight">
                  <span className="sc-label">Final Score</span>
                  <span className="sc-val">
                    {calculateScore().finalScore.toFixed(2)}
                    <small style={{ fontSize: '1rem', opacity: 0.7, marginLeft: '0.5rem' }}>
                      / {quizQuestions.length}
                    </small>
                  </span>
                </div>
              </div>

              <div className="result-buttons">
                <button className="subject-btn active" onClick={() => setActiveTab('learn')}>
                  <BookOpen size={18} /> Back to Learning
                </button>
                <button className="subject-btn" onClick={() => {
                  setAnswers({});
                  setCurrentQuizIdx(0);
                  setShowResults(false);
                }}>
                  <RotateCcw size={18} /> Retake Quiz
                </button>
              </div>
            </motion.div>
          )}
        </main>
      )}

      <footer className="footer-nav mobile-only">
        {activeTab === 'learn' ? (
          SUBJECTS.map((sub, idx) => (
            <button
              key={sub}
              className={`nav-item ${currentSubject === sub ? 'active' : ''}`}
              onClick={() => {
                setCurrentSubjectIndex(idx);
                setExpandedId(null);
              }}
              style={{ background: 'none', border: 'none', color: currentSubject === sub ? 'white' : '#64748b' }}
            >
              {getIcon(sub)}
            </button>
          ))
        ) : (
          <div className="quiz-footer-nav" style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'white' }}>
             <button onClick={() => setActiveTab('learn')} style={{ background: 'none', border: 'none', color: 'white' }}>
              <BookOpen size={24} />
            </button>
            <span style={{ fontWeight: 600 }}>Daily Quiz Mode</span>
          </div>
        )}
      </footer>
    </div>
  );
}


export default App;
