import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Brain, Rocket, History, LogOut, CheckCircle2, XCircle, 
  ChevronRight, Trophy, Star, Loader2, PlayCircle, BarChart3,
  Dna, Cpu, ShieldCheck, Users, Plus, Hash, Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

// --- Axios Config ---
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function App() {
  const [view, setView] = useState('auth'); // auth, dashboard, play, result, analytics
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedQuizAnalytics, setSelectedQuizAnalytics] = useState(null);
  const [user, setUser] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState(null); // null = Personal
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Game State
  const [currentGame, setCurrentGame] = useState({
    quiz: null,
    attempt: null,
    questions: [],
    currentIndex: 0,
    answers: [],
    result: null
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) fetchData();
  }, [selectedCommunity]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build quiz URL with community filter
      let quizUrl = `${API_BASE}/quizzes/`;
      if (selectedCommunity) {
        quizUrl += `?community=${selectedCommunity.id}`;
      } else if (selectedCommunity === null && communities.length > 0) {
        // "Master Pool" = show all accessible quizzes (no filter)
      }

      const endpoints = [
        axios.get(quizUrl),
        axios.get(`${API_BASE}/users/me/performance/`),
        axios.get(`${API_BASE}/users/me/history/`),
        axios.get(`${API_BASE}/communities/`)
      ];
      
      const [qRes, sRes, hRes, cRes] = await Promise.all(endpoints);
      
      setQuizzes(qRes.data.results || qRes.data);
      setStats(sRes.data);
      setHistory(hRes.data.results || hRes.data);
      setCommunities(cRes.data.results || cRes.data);
      
      if(view === 'auth') setView('dashboard');
    } catch (err) {
      if (err.response?.status === 401) setView('auth');
      else setError('System synchronization failed.');
    } finally {
      setLoading(false);
    }
  };

  const login = async (e) => {
    e.preventDefault();
    setError('');
    const { email, password } = e.target.elements;
    try {
      const res = await axios.post(`${API_BASE}/auth/login/`, {
        email: email.value,
        password: password.value
      });
      localStorage.setItem('token', res.data.access);
      fetchData();
    } catch (err) {
      setError('Invalid credentials for this neural node.');
    }
  };

  const register = async (e) => {
    e.preventDefault();
    setError('');
    const { email, username, password, full_name } = e.target.elements;
    try {
      await axios.post(`${API_BASE}/auth/register/`, {
        email: email.value,
        username: username.value,
        password: password.value,
        full_name: full_name.value
      });
      setIsRegistering(false);
      setSuccess('Neural Node registered successfully. Please login.');
    } catch (err) {
        const msg = err.response?.data?.message || 'Biometric validation failed.';
        setError(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setView('auth');
  };

  const createCommunity = async (e) => {
    e.preventDefault();
    const { name, description } = e.target.elements;
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/communities/`, {
        name: name.value,
        description: description.value
      });
      fetchData();
      e.target.reset();
    } catch (err) {
      console.error('Community init error:', err);
      setError(err.response?.data?.detail || 'Failed to initialize community.');
    } finally {
      setLoading(false);
    }
  };

  const joinCommunity = async (e) => {
    e.preventDefault();
    const { code } = e.target.elements;
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/communities/join/`, {
        join_code: code.value
      });
      fetchData();
      e.target.reset();
    } catch (err) {
      console.error('Join error:', err);
      setError(err.response?.data?.detail || 'Invalid join code.');
    } finally {
      setLoading(false);
    }
  };

  const createQuiz = async (e) => {
    e.preventDefault();
    setError('');
    const { topic, difficulty, count, community } = e.target.elements;
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/quizzes/quiz-requests/`, {
        topic: topic.value,
        difficulty: difficulty.value,
        question_count: parseInt(count.value),
        community: community.value || null
      });
      // Wait for AI generation
      setTimeout(fetchData, 4500);
    } catch (err) {
      console.error('Quiz creation error:', err);
      setError(err.response?.data?.detail || 'Generation pipeline throttled.');
      setLoading(false);
    }
  };

  const loadAnalytics = async (quizId) => {
    setLoading(true);
    try {
      const qRes = await axios.get(`${API_BASE}/quizzes/${quizId}/`);
      const aRes = await axios.get(`${API_BASE}/quizzes/${quizId}/analytics/`);
      setSelectedQuizAnalytics({ quiz: qRes.data, stats: aRes.data });
      setView('analytics');
    } catch (err) {
      setError('Analytics node offline or access denied.');
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async (quizId) => {
    setLoading(true);
    try {
      const [qRes, aRes] = await Promise.all([
        axios.get(`${API_BASE}/quizzes/${quizId}/`),
        axios.post(`${API_BASE}/attempts/`, { quiz_id: quizId })
      ]);
      setCurrentGame({
        quiz: qRes.data,
        attempt: aRes.data,
        questions: qRes.data.questions,
        currentIndex: 0,
        result: null
      });
      setView('play');
    } catch (err) {
      setError('Failed to initialize session.');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (optionId) => {
    const q = currentGame.questions[currentGame.currentIndex];
    try {
      await axios.patch(`${API_BASE}/attempts/${currentGame.attempt.id}/answer/`, {
        question_id: q.id,
        option_id: optionId
      });
      if (currentGame.currentIndex < currentGame.questions.length - 1) {
        setCurrentGame(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
      } else {
        finishQuiz();
      }
    } catch (err) {}
  };

  const finishQuiz = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/attempts/${currentGame.attempt.id}/submit/`);
      setCurrentGame(prev => ({ ...prev, result: res.data }));
      setView('result');
      fetchData();
    } catch (err) {
      setError('Telemetry submission failed.');
    } finally {
      setLoading(false);
    }
  };

  if (view === 'auth') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-10 rounded-[2.5rem] w-full max-w-md">
        <h1 className="text-4xl font-black text-center mb-2 tracking-tight">QUIZQUEST<span className="text-secondary">.AI</span></h1>
        <p className="text-slate-400 text-center mb-10 font-medium">{isRegistering ? 'Initialize identity' : 'Neural Knowledge System'}</p>
        
        {!isRegistering ? (
          <form onSubmit={login} className="space-y-5">
            <input name="email" type="email" placeholder="Email" required className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4" />
            <input name="password" type="password" placeholder="Password" required className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4" />
            {error && <p className="text-sm text-center py-2 rounded-xl text-red-400">{error}</p>}
            {success && <p className="text-sm text-center py-2 rounded-xl text-green-400">{success}</p>}
            <button type="submit" className="w-full btn-primary py-4 rounded-2xl">INITIALIZE</button>
            <p className="text-center text-sm text-slate-500">New? <button type="button" onClick={() => { setIsRegistering(true); setError(''); setSuccess(''); }} className="text-indigo-400 font-bold">Register</button></p>
          </form>
        ) : (
          <form onSubmit={register} className="space-y-4">
            <input name="username" placeholder="Alias" required className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3" />
            <input name="full_name" placeholder="Full Name" required className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3" />
            <input name="email" type="email" placeholder="Email" required className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3" />
            <input name="password" type="password" placeholder="Password" required className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3" />
            {error && <p className="text-red-400 text-xs text-center py-2">{error}</p>}
            <button type="submit" className="w-full btn-primary py-3 rounded-xl font-bold">CREATE IDENTITY</button>
            <p className="text-center text-sm text-slate-500">Back? <button type="button" onClick={() => setIsRegistering(false)} className="text-indigo-400 font-bold">Sign In</button></p>
          </form>
        )}
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen max-w-7xl mx-auto p-4 md:p-8 space-y-10">
      <nav className="flex justify-between items-center py-4">
        <div className="flex items-center gap-3"><Brain className="w-8 h-8 text-indigo-400" /><span className="text-2xl font-black">QUIZQUEST.AI</span></div>
        <div className="flex items-center gap-4">
            <button onClick={() => setView('dashboard')} className="text-sm font-bold text-slate-400 hover:text-white transition-colors">DASHBOARD</button>
            <button onClick={logout} className="p-3 hover:bg-white/5 rounded-full"><LogOut className="w-5 h-5 text-slate-400" /></button>
        </div>
      </nav>

      {view === 'dashboard' && (
        <div className="space-y-6">
          {success && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-500/10 text-green-400 p-4 rounded-2xl text-center font-bold text-sm border border-green-500/20">{success}</motion.div>}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Sidebar: Communities */}
            <div className="lg:col-span-3 space-y-8">
              <section className="glass p-6 rounded-[2rem]">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-black text-slate-500 tracking-widest uppercase flex items-center gap-2"><Users size={16}/> Communities</h3>
                  </div>
                  <div className="space-y-2">
                      <button 
                          onClick={() => setSelectedCommunity(null)}
                          className={`w-full text-left p-3 rounded-xl transition-all ${!selectedCommunity ? 'bg-indigo-500 text-white font-bold px-4' : 'text-slate-400 hover:bg-white/5 font-medium'}`}
                      >
                          Master Pool
                      </button>
                      {communities.map(c => (
                          <div key={c.id} className="relative group">
                              <button 
                                  onClick={() => setSelectedCommunity(c)}
                                  className={`w-full text-left p-3 rounded-xl transition-all ${selectedCommunity?.id === c.id ? 'bg-indigo-500 text-white font-bold px-4' : 'text-slate-400 hover:bg-white/5 font-medium'}`}
                              >
                                  {c.name}
                              </button>
                              <div className="flex items-center justify-between mt-1 px-2">
                                  <span className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase whitespace-nowrap">CODE: {c.join_code}</span>
                                  <button 
                                      onClick={() => {
                                          navigator.clipboard.writeText(c.join_code);
                                          setSuccess(`Code copied: ${c.join_code}`);
                                          setTimeout(() => setSuccess(''), 2000);
                                      }}
                                      className="p-1.5 text-slate-600 hover:text-indigo-400 transition-colors"
                                      title="Copy Join Code"
                                  >
                                      <Copy size={12} />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
                  <hr className="my-6 border-white/5" />
                  <form onSubmit={joinCommunity} className="space-y-3">
                      <div className="relative">
                          <input name="code" placeholder="Join Code" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs" required />
                      </div>
                      <button type="submit" className="w-full text-[10px] font-black bg-slate-800 hover:bg-slate-700 py-2 rounded-xl transition-colors">JOIN UNIT</button>
                  </form>
                  <hr className="my-6 border-white/5" />
                  <form onSubmit={createCommunity} className="space-y-3">
                      <input name="name" placeholder="New Community Name" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs" required />
                      <input name="description" placeholder="Sector Description" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs" />
                      <button type="submit" className="w-full text-[10px] font-black bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 py-2 rounded-xl border border-indigo-500/30 transition-colors uppercaseTracking">Initialize Unit</button>
                  </form>
              </section>
            </div>

            <div className="lg:col-span-9 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard icon={<Rocket />} label="Missions" value={stats?.total_attempts} color="text-indigo-400" />
                  <StatCard icon={<Trophy />} label="Accuracy" value={stats?.avg_score_pct ? `${stats.avg_score_pct}%` : '0%'} color="text-amber-400" />
                  <StatCard icon={<Star />} label="Best Topic" value={stats?.best_topic || '--'} color="text-purple-400" />
                  <StatCard icon={<BarChart3 />} label="Member of" value={communities.length} color="text-green-400" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                  {/* Deployment Center */}
                  <div className="md:col-span-8 space-y-10">
                      <section className="glass p-10 rounded-[2.5rem] relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-8 text-indigo-500/20"><Brain size={120} /></div>
                          <h2 className="text-2xl font-bold mb-8">Deploy Assessment</h2>
                          <form onSubmit={createQuiz} className="space-y-4 relative z-10">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <input name="topic" placeholder="Topic: SQL, Python, Neural Nets..." className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4" required />
                                  <div className="flex gap-2">
                                      <input name="count" type="number" defaultValue="5" min="1" max="20" className="w-20 bg-slate-900 border border-slate-800 rounded-2xl p-4" />
                                      <select name="difficulty" className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4">
                                          <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                                      </select>
                                  </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <select name="community" className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4">
                                      <option value="">Personal Node (Private)</option>
                                      {communities.map(c => (
                                          <option key={c.id} value={c.id}>{c.name}</option>
                                      ))}
                                  </select>
                                  <button type="submit" disabled={loading} className="btn-primary py-4 rounded-2xl flex items-center justify-center gap-2">
                                      {loading ? <Loader2 className="animate-spin" /> : <><Rocket size={18}/> INITIALIZE PROXIMITY</>}
                                  </button>
                              </div>
                              {error && <p className="text-red-400 text-xs font-bold px-2">{error}</p>}
                          </form>
                      </section>

                      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <AnimatePresence>
                              {quizzes.length === 0 ? (
                                  <div className="md:col-span-2 text-center py-20 text-slate-500 font-medium">No active assessment nodes found in this sector.</div>
                              ) : quizzes.map(q => (
                                  <motion.div 
                                      layout
                                      initial={{ opacity: 0, scale: 0.9 }} 
                                      animate={{ opacity: 1, scale: 1 }} 
                                      key={q.id} 
                                      className="glass p-6 rounded-3xl border-l-4 border-l-indigo-500 group relative hover:bg-white/5 transition-all"
                                  >
                                      <div className="flex justify-between items-start mb-4">
                                          <div className="flex gap-2 items-center">
                                            <span className="text-[10px] font-black uppercase text-indigo-500/60 bg-indigo-500/10 px-3 py-1 rounded-full">{q.difficulty}</span>
                                            {q.community_name && <span className="text-[10px] font-black uppercase text-green-500/60 bg-green-500/10 px-3 py-1 rounded-full">{q.community_name}</span>}
                                            {!q.community && <span className="text-[10px] font-black uppercase text-slate-500/60 bg-slate-500/10 px-3 py-1 rounded-full">Personal</span>}
                                          </div>
                                          <div className="flex gap-1">
                                              <button onClick={() => loadAnalytics(q.id)} className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"><BarChart3 size={16} /></button>
                                          </div>
                                      </div>
                                      <div className="cursor-pointer" onClick={() => startQuiz(q.id)}>
                                          <h4 className="text-lg font-bold group-hover:text-indigo-400 transition-colors">{q.topic}</h4>
                                          <p className="text-slate-500 text-xs">{q.title}</p>
                                      </div>
                                  </motion.div>
                              ))}
                          </AnimatePresence>
                      </section>
                  </div>

                  {/* Vertical Logs */}
                  <div className="md:col-span-4 space-y-6 text-right">
                      <h3 className="text-sm font-black text-slate-500 tracking-widest uppercase mr-2">Telemetry History</h3>
                      <div className="glass rounded-[2rem] p-4 text-left space-y-2">
                          {history.length === 0 ? (
                              <div className="text-center py-10 text-slate-600 text-xs font-bold uppercase">No records</div>
                          ) : history.slice(0, 10).map(h => (
                              <div key={h.id} className="flex justify-between items-center p-4 last:border-0 border-b border-white/5 hover:bg-white/5 rounded-xl transition-colors">
                                  <div className="text-sm font-bold truncate max-w-[100px]">{h.quiz_topic}</div>
                                  <div className={`text-sm font-black ${h.score_percentage > 70 ? 'text-green-400' : 'text-orange-400'}`}>{h.score_percentage}%</div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Play Mode */}
      {view === 'play' && (
        <div className="max-w-3xl mx-auto py-10">
            <div className="flex justify-between items-center mb-8 px-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><Brain size={20}/></div>
                    <h2 className="text-2xl font-black">{currentGame.quiz.topic}</h2>
                </div>
                <div className="text-2xl font-mono text-slate-500">{currentGame.currentIndex + 1} / {currentGame.questions.length}</div>
            </div>
            <div className="glass rounded-[3rem] p-12 min-h-[450px] flex flex-col relative overflow-hidden transition-all duration-500">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-800"><motion.div className="h-full bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]" initial={{ width: 0 }} animate={{ width: `${(currentGame.currentIndex+1)/currentGame.questions.length*100}%` }} /></div>
                <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Question {currentGame.currentIndex + 1}</div>
                <h3 className="text-3xl font-bold mb-16 leading-tight">{currentGame.questions[currentGame.currentIndex].body}</h3>
                <div className="grid gap-4 mt-auto">
                    {currentGame.questions[currentGame.currentIndex].options.map((opt, idx) => (
                        <motion.button 
                            whileHover={{ x: 10 }}
                            key={opt.id} 
                            onClick={() => submitAnswer(opt.id)} 
                            className="w-full text-left p-6 rounded-2xl bg-white/5 hover:bg-indigo-500 group flex items-center justify-between transition-all"
                        >
                            <span className="font-bold">{opt.body}</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight /></div>
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* Results View */}
      {view === 'result' && (
        <div className="max-w-4xl mx-auto space-y-10 py-10">
            <div className="glass rounded-[3rem] p-16 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 -z-10" />
                <h2 className="text-6xl font-black mb-10 tracking-tighter">DATA SYNCED</h2>
                <div className="flex justify-center gap-20 mb-12">
                    <div><div className="text-6xl font-black text-indigo-400">{currentGame.result.score_percentage}%</div><div className="text-xs font-black text-slate-500 uppercase mt-2 tracking-widest">Accuracy</div></div>
                    <div><div className="text-6xl font-black text-slate-200">{currentGame.result.score}/{currentGame.result.max_score}</div><div className="text-xs font-black text-slate-500 uppercase mt-2 tracking-widest">Points</div></div>
                </div>
                <button onClick={fetchData} className="btn-primary px-16 py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20">BACK TO NEURAL CORE</button>
            </div>
            <div className="grid gap-6">
                {currentGame.result.answers.map((ans, i) => (
                    <div key={i} className={`glass p-8 rounded-[2rem] border-l-8 ${ans.is_correct ? 'border-green-500' : 'border-red-500'}`}>
                        <div className="flex items-center gap-2 mb-4 text-xs font-black uppercase tracking-widest text-slate-500">
                            {ans.is_correct ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />} Question {i+1}
                        </div>
                        <h4 className="text-xl font-bold mb-6">{ans.question_body}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-xl ${ans.is_correct ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'} font-bold border ${ans.is_correct ? 'border-green-500/20' : 'border-red-500/20'}`}>
                                <span className="text-[10px] uppercase block mb-1 opacity-60">Your Response</span>
                                {ans.selected_option_body || 'DATA LOST / SKIPPED'}
                            </div>
                            {!ans.is_correct && (
                                <div className="p-4 rounded-xl bg-green-500/10 text-green-400 font-bold border border-green-500/20">
                                    <span className="text-[10px] uppercase block mb-1 opacity-60">Correct Target</span>
                                    {ans.correct_option_body}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* Analytics View */}
      {view === 'analytics' && selectedQuizAnalytics && (
        <div className="max-w-5xl mx-auto py-10 space-y-10">
            <div className="flex justify-between items-center px-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl"><BarChart3 size={24}/></div>
                    <h2 className="text-3xl font-black">{selectedQuizAnalytics.quiz.topic} Assessment Intel</h2>
                </div>
                <button onClick={() => setView('dashboard')} className="glass border border-slate-800 px-8 py-3 rounded-xl font-bold hover:bg-white/5 transition-colors">Return</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={<Cpu />} label="Total Deployments" value={selectedQuizAnalytics.stats.total_attempts} color="text-indigo-400" />
                <StatCard icon={<Trophy />} label="Peer Accuracy" value={`${selectedQuizAnalytics.stats.avg_score_pct}%`} color="text-amber-400" />
                <StatCard icon={<Star />} label="Avg Response Sync" value={`${selectedQuizAnalytics.stats.avg_completion_secs}s`} color="text-purple-400" />
            </div>
            <div className="space-y-4">
                {selectedQuizAnalytics.quiz.questions.map((q, i) => {
                    const qStat = selectedQuizAnalytics.stats.question_stats[q.id] || { correct_rate_pct: 0 };
                    return (
                        <div key={q.id} className="glass p-8 rounded-[2.5rem]">
                            <div className="flex justify-between items-start mb-6">
                                <h4 className="text-xl font-bold max-w-2xl leading-relaxed">{q.body}</h4>
                                <span className="text-2xl font-black text-indigo-400">{qStat.correct_rate_pct}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
                                <motion.div 
                                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full" 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${qStat.correct_rate_pct}%` }} 
                                    transition={{ duration: 1 }}
                                />
                            </div>
                            <div className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Correct Rate Telemetry</div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className="glass p-8 rounded-[2.5rem] space-y-4 hover:bg-white/5 transition-colors">
            <div className={`${color}`}>{icon}</div>
            <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{label}</div>
                <div className="text-3xl font-black">{value}</div>
            </div>
        </div>
    );
}
