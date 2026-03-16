import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Brain, Calculator, Languages, Clock, ChevronRight, CheckCircle2, ChevronDown, Trophy, RotateCcw, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { contentData } from './data';
import { getInfiniteQuestions } from './generators';
import './App.css';

const SUBJECTS = ['GK', 'Reasoning', 'Maths', 'English'];
const REFRESH_TIME = 2400; // 40 minutes (2400 seconds)
const QUESTIONS_PER_QUIZ = 50;
const NEGATIVE_MARK = 0.25;
const QUIZ_DURATION = 3600; // 1 hour (3600 seconds)

const MOTIVATIONAL_QUOTES = [
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Your only limit is your mind.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn’t just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Don’t stop when you’re tired. Stop when you’re done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for."
];

// Fisher-Yates Shuffle
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const getHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('portal_history') || '{}');
  } catch (e) {
    return {};
  }
};

const updateHistory = (subject, ids) => {
  const history = getHistory();
  const current = history[subject] || [];
  history[subject] = [...new Set([...current, ...ids])];
  localStorage.setItem('portal_history', JSON.stringify(history));
};

// Helper to fetch external GK/English if needed
const fetchExternalQuestions = async (subject, count = 10) => {
  try {
    const categoryMap = { 'GK': 9, 'English': 10 }; // OTDB categories
    const cat = categoryMap[subject];
    if (!cat) return [];

    const res = await fetch(`https://opentdb.com/api.php?amount=${count}&category=${cat}&type=multiple`);
    const data = await res.json();
    
    if (data.results) {
      return data.results.map((q, idx) => ({
        id: `ext_${subject}_${Date.now()}_${idx}`,
        question: decodeURIComponent(atob(q.question)), // Handle encoded chars if needed, but OTDB often uses HTML entities
        // Simpler decode for now
        question: q.question.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&'),
        options: shuffleArray([...q.incorrect_answers, q.correct_answer].map(o => o.replace(/&quot;/g, '"').replace(/&#039;/g, "'"))),
        answer: q.correct_answer.replace(/&quot;/g, '"').replace(/&#039;/g, "'"),
        explanation: "External question from global trivia database."
      }));
    }
    return [];
  } catch (e) {
    console.error("External fetch failed", e);
    return [];
  }
};

// Helper to shuffle and pick N unique questions (Mixing Static + Generated + API)
const getRandomQuestions = async (subject, count = 10) => {
  const all = contentData[subject] || [];
  const history = getHistory();
  const seenIds = history[subject] || [];
  
  // 1. Try to get from procedural generators first for Maths/Reasoning (Infinite)
  if (subject === 'Maths' || subject === 'Reasoning') {
    return getInfiniteQuestions(subject, count);
  }

  // 2. For GK/English, try to get from unseen local pool
  let available = all.filter(q => !seenIds.includes(q.id));
  
  // 3. If local pool low, try external API
  if (available.length < count / 2) {
    const ext = await fetchExternalQuestions(subject, count);
    if (ext.length > 0) return ext;
  }

  // 4. Fallback: reset history if everything exhausted
  if (available.length < count) {
    const historyFull = getHistory();
    delete historyFull[subject];
    localStorage.setItem('portal_history', JSON.stringify(historyFull));
    available = all;
  }
  
  const picked = shuffleArray(available).slice(0, count);
  updateHistory(subject, picked.map(q => q.id));
  return picked;
};

// Date-based seed for a unique quiz daily
const getDailySeed = () => {
  const now = new Date();
  // Using days since epoch for more reliable sequential logic
  return Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
};

function App() {
  const [activeTab, setActiveTab] = useState('learn'); // 'learn' or 'quiz'
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(REFRESH_TIME);
  const [expandedId, setExpandedId] = useState(null);
  const [displayQuestions, setDisplayQuestions] = useState([]);
  const [learnedCache, setLearnedCache] = useState({}); // Cache for randomized questions per subject
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: selectedIndex }
  const [showResults, setShowResults] = useState(false);
  const [quizTimeLeft, setQuizTimeLeft] = useState(QUIZ_DURATION);
  const [randomQuote, setRandomQuote] = useState("");

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

  // Learning Mode: Use cached questions or generate new ones
  useEffect(() => {
    const updateQuestions = async () => {
      if (activeTab === 'learn') {
        if (learnedCache[currentSubject]) {
          setDisplayQuestions(learnedCache[currentSubject]);
        } else {
          setIsRefreshing(true);
          const newQuestions = await getRandomQuestions(currentSubject);
          setLearnedCache(prev => ({ ...prev, [currentSubject]: newQuestions }));
          setDisplayQuestions(newQuestions);
          setIsRefreshing(false);
        }
      }
    };
    updateQuestions();
  }, [currentSubject, activeTab, learnedCache]);

  // Daily Quiz initialization (Infinite & Seeded)
  useEffect(() => {
    const initQuiz = async () => {
      if (activeTab === 'quiz') {
        const dayOffset = getDailySeed();
        
        // 1. Seeded Dynamic Content (50% of Quiz)
        // Using dayOffset as seed for consistent daily generation
        const genCount = Math.floor(QUESTIONS_PER_QUIZ * 0.5);
        const genMath = getInfiniteQuestions('Maths', Math.ceil(genCount / 2), dayOffset);
        const genReason = getInfiniteQuestions('Reasoning', Math.floor(genCount / 2), dayOffset + 1);

        // 2. External API Content (30% of Quiz)
        // Fetching 15 questions from global DB
        const apiCount = Math.floor(QUESTIONS_PER_QUIZ * 0.3);
        const extGK = await fetchExternalQuestions('GK', apiCount);
        
        // 3. Static Pool Rotation (20% of Quiz)
        // Still use a bit of local pool for consistency
        const staticCount = QUESTIONS_PER_QUIZ - genMath.length - genReason.length - extGK.length;
        const staticPool = [
          ...contentData.GK,
          ...contentData.Reasoning,
          ...contentData.Maths,
          ...contentData.English
        ];
        const startIndex = (dayOffset * staticCount) % staticPool.length;
        let staticSet = [];
        for (let i = 0; i < staticCount; i++) {
          staticSet.push(staticPool[(startIndex + i) % staticPool.length]);
        }
        
        // Combine and Shuffle
        const fullQuiz = shuffleArray([...genMath, ...genReason, ...extGK, ...staticSet]);
        setQuizQuestions(fullQuiz);
      }
    };
    initQuiz();
  }, [activeTab]);

  // Learning Mode Timer logic
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

  // Quiz Timer logic
  useEffect(() => {
    let timer;
    if (activeTab === 'quiz' && !showResults) {
      timer = setInterval(() => {
        setQuizTimeLeft((prev) => {
          if (prev <= 1) {
            handleFinishQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeTab, showResults]);

  const handleAutoRefresh = () => {
    setIsRefreshing(true);
    localStorage.setItem('last_refresh_time', Date.now().toString());
    
    setTimeout(() => {
      setCurrentSubjectIndex((prevIdx) => (prevIdx + 1) % SUBJECTS.length);
      setLearnedCache({}); // Clear cache on auto-refresh
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
    setRandomQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
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
              {activeTab === 'learn' && (
                <motion.div 
                  layoutId="active-pill"
                  className="active-bg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <BookOpen size={16} className="btn-icon" />
              <span>Learn</span>
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
              {activeTab === 'quiz' && (
                <motion.div 
                  layoutId="active-pill"
                  className="active-bg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Trophy size={16} className="btn-icon" />
              <span>Daily Quiz</span>
            </button>
          </div>

          {(activeTab === 'learn' || (activeTab === 'quiz' && !showResults)) && (
            <div className="timer-badge">
              <Clock size={16} />
              <span>{activeTab === 'learn' ? formatTime(timeLeft) : formatTime(quizTimeLeft)}</span>
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
                                  {(currentSubject === 'Maths' || currentSubject === 'Reasoning' || currentSubject === 'GK') && (
                                    <p>{q.explanation}</p>
                                  )}
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
                <div className="quote-box">
                  <p>"{randomQuote}"</p>
                </div>
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

              <div className="answer-key-section">
                <h3 className="key-title">Detailed Answer Key</h3>
                <div className="key-list">
                  {quizQuestions.map((q, idx) => {
                    const userIdx = answers[q.id];
                    const userAns = userIdx !== undefined ? q.options[userIdx] : "Not Attempted";
                    const isCorrect = userAns === q.answer;
                    
                    return (
                      <div key={q.id} className={`key-item ${isCorrect ? 'correct-choice' : (userAns === "Not Attempted" ? 'skipped-choice' : 'wrong-choice')}`}>
                        <div className="key-q-header">
                          <span className="key-num">Q{idx + 1}</span>
                          <p className="key-q-text">{q.question}</p>
                        </div>
                        <div className="key-ans-details">
                          <div className="user-choice">
                            <span>Your Answer:</span>
                            <strong>{userAns}</strong>
                          </div>
                          {!isCorrect && (
                            <div className="correct-choice-box">
                              <span>Correct Answer:</span>
                              <strong>{q.answer}</strong>
                            </div>
                          )}
                          {isCorrect && (
                             <div className="correct-marker">
                               <CheckCircle2 size={16} /> Correct
                             </div>
                          )}
                        </div>
                        {(q.explanation && (isCorrect || userAns !== "Not Attempted")) && (
                          <div className="key-explanation">
                            <p><strong>Explanation:</strong> {q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
