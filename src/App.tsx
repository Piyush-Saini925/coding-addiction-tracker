import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSiteUrl, hasSupabaseConfig, supabase } from './lib/supabase';
import type {
  DailyLog,
  FocusSession,
  Mission,
  MissionCompletion,
  Profile,
  Task,
  TaskCompletion,
} from './types';
import {
  buildBadges,
  buildJourneyReport,
  calculateLevel,
  calculateStreaks,
  nextLevelProgress,
  todayIso,
} from './utils';

const DEFAULT_TASKS = [
  'Review yesterday code',
  'Code for 30 minutes',
  'Write what I learned',
];

type AppData = {
  profile: Profile;
  logs: DailyLog[];
  tasks: Task[];
  taskCompletions: TaskCompletion[];
  missions: Mission[];
  missionCompletions: MissionCompletion[];
  focusSessions: FocusSession[];
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const readUrlParam = (key: string) => {
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      return query.get(key) || hash.get(key);
    };

    const withTimeout = async <T,>(promise: Promise<T>, label: string) => {
      let timeoutId: number | undefined;
      const timeout = new Promise<never>((_resolve, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(`${label} timed out. Please reload and try again.`)), 10000);
      });

      try {
        return await Promise.race([promise, timeout]);
      } finally {
        if (timeoutId) window.clearTimeout(timeoutId);
      }
    };

    const cleanAuthUrl = () => {
      if (window.location.search || window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname || '/');
      }
    };

    const finishAuthRedirect = async () => {
      try {
        const errorDescription = readUrlParam('error_description');
        const errorCode = readUrlParam('error_code');
        const code = readUrlParam('code');

        if (errorDescription) {
          setAuthMessage(`${errorCode ? `${errorCode}: ` : ''}${errorDescription.replace(/\+/g, ' ')}`);
          cleanAuthUrl();
        } else if (readUrlParam('access_token') && readUrlParam('refresh_token')) {
          const accessToken = readUrlParam('access_token') || '';
          const refreshToken = readUrlParam('refresh_token') || '';
          const { error } = await withTimeout(
            supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }),
            'Email verification',
          );
          if (error) {
            setAuthMessage(error.message);
          } else {
            setAuthMessage('Email verified. You are signed in.');
          }
          cleanAuthUrl();
        } else if (code) {
          const { error } = await withTimeout(supabase.auth.exchangeCodeForSession(code), 'Email verification');
          if (error) {
            setAuthMessage(error.message);
          } else {
            setAuthMessage('Email verified. You are signed in.');
          }
          cleanAuthUrl();
        }

        const { data, error } = await withTimeout(supabase.auth.getSession(), 'Session loading');
        if (error) setAuthMessage(error.message);

        if (data.session) {
          const { data: userData, error: userError } = await withTimeout(supabase.auth.getUser(), 'User validation');
          if (userError || !userData.user) {
            await supabase.auth.signOut();
            if (isMounted) {
              setSession(null);
              setAuthMessage(userError?.message || 'Your verification session is invalid. Please log in again.');
            }
            return;
          }
        }

        if (isMounted) setSession(data.session);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Authentication redirect failed.';
        if (isMounted) setAuthMessage(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    finishAuthRedirect();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!hasSupabaseConfig) return <SetupScreen />;
  if (loading) return <Shell message="Loading your coding arena..." />;
  if (!session?.user) return <AuthScreen authMessage={authMessage} />;

  return <Dashboard authMessage={authMessage} user={session.user} />;
}

function SetupScreen() {
  return (
    <main className="setup-screen">
      <section className="setup-card">
        <p className="eyebrow">Setup needed</p>
        <h1>Coding Addiction Tracker</h1>
        <p>
          Add your Supabase URL and anon key in a local <code>.env</code> file, then restart the
          dev server.
        </p>
        <pre>{`VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key`}</pre>
        <p className="muted">Run the SQL in <code>supabase/schema.sql</code> before using the app.</p>
      </section>
    </main>
  );
}

function Shell({ message }: { message: string }) {
  return (
    <main className="setup-screen">
      <section className="setup-card">
        <p>{message}</p>
      </section>
    </main>
  );
}

function AuthScreen({ authMessage }: { authMessage: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    const result =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { username: username || email.split('@')[0] },
              emailRedirectTo: getSiteUrl(),
            },
          });

    if (result.error) {
      setMessage(result.error.message);
    } else if (mode === 'register') {
      setMessage('Account created. If email confirmation is enabled, check your inbox.');
    }

    setBusy(false);
  };

  return (
    <main className="auth-layout">
      <section className="auth-hero">
        <p className="eyebrow">Build consistency</p>
        <h1>Coding Addiction Tracker</h1>
        <p>
          Turn coding into daily missions, XP, levels, streaks, focus sessions, and a shareable
          journey report.
        </p>
      </section>

      <form className="auth-card" onSubmit={submit}>
        <div className="segmented">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Login
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        {mode === 'register' && (
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your name" />
          </label>
        )}
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>
        <label>
          Password
          <span className="password-field">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              minLength={6}
              required
            />
            <button type="button" className="toggle-password" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </span>
        </label>
        <button className="primary-button" disabled={busy}>
          {busy ? 'Please wait...' : mode === 'login' ? 'Enter dashboard' : 'Create account'}
        </button>
        {authMessage && <p className="form-message">{authMessage}</p>}
        {message && <p className="form-message">{message}</p>}
      </form>
    </main>
  );
}

function Dashboard({ authMessage, user }: { authMessage: string; user: User }) {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newMission, setNewMission] = useState('');
  const [newMissionDescription, setNewMissionDescription] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = async (showFullLoading = false) => {
    try {
      setLoadError('');
      if (showFullLoading) setLoading(true);

      const { data: currentUser, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser.user) {
        await supabase.auth.signOut();
        throw new Error(userError?.message || 'Your login session is invalid. Please log in again.');
      }

      const profile = await ensureProfile(currentUser.user);
      await ensureDefaultTasks(currentUser.user.id);

      const [logs, tasks, taskCompletions, missions, missionCompletions, focusSessions] = await Promise.all([
        supabase.from('daily_logs').select('*').order('date', { ascending: true }),
        supabase.from('tasks').select('*').order('created_at', { ascending: true }),
        supabase.from('task_completions').select('*').order('created_at', { ascending: true }),
        supabase.from('missions').select('*').order('created_at', { ascending: true }),
        supabase.from('mission_completions').select('*').order('created_at', { ascending: true }),
        supabase.from('focus_sessions').select('*').order('created_at', { ascending: true }),
      ]);

      const queryError =
        logs.error ||
        tasks.error ||
        taskCompletions.error ||
        missions.error ||
        missionCompletions.error ||
        focusSessions.error;
      if (queryError) throw queryError;

      const loadedLogs = (logs.data || []) as DailyLog[];
      setNotes(loadedLogs.find((log) => log.date === todayIso())?.notes || '');
      setData({
        profile,
        logs: loadedLogs,
        tasks: (tasks.data || []) as Task[],
        taskCompletions: (taskCompletions.data || []) as TaskCompletion[],
        missions: (missions.data || []) as Mission[],
        missionCompletions: (missionCompletions.data || []) as MissionCompletion[],
        focusSessions: (focusSessions.data || []) as FocusSession[],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Dashboard data failed to load.';
      setLoadError(errorMessage);
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [user.id]);

  const stats = useMemo(() => {
    if (!data) return null;
    const streaks = calculateStreaks(data.logs);
    const progress = nextLevelProgress(data.profile.total_xp, data.profile.level);
    const badges = buildBadges(data.profile, streaks, data.missionCompletions, data.focusSessions);
    return { streaks, progress, badges };
  }, [data]);

  if (loading) return <Shell message="Preparing your dashboard..." />;
  if (loadError || !data || !stats) {
    return (
      <main className="setup-screen">
        <section className="setup-card">
          <p className="eyebrow">Dashboard error</p>
          <h1>Coding Addiction Tracker</h1>
          <p>{loadError || 'Dashboard data failed to load.'}</p>
          <button className="primary-button" onClick={() => loadData(true)}>
            Try again
          </button>
          <button className="ghost-button" onClick={() => supabase.auth.signOut()}>
            Logout
          </button>
        </section>
      </main>
    );
  }

  const today = todayIso();
  const completedTaskIds = new Set(data.taskCompletions.filter((item) => item.date === today).map((item) => item.task_id));
  const completedMissionIds = new Set(
    data.missionCompletions.filter((item) => item.date === today).map((item) => item.mission_id),
  );

  const gainXp = async (points: number, active: boolean) => {
    const nextXp = data.profile.total_xp + points;
    const nextLevel = calculateLevel(nextXp);

    await supabase
      .from('profiles')
      .update({ total_xp: nextXp, level: nextLevel })
      .eq('id', user.id);

    const existingLog = data.logs.find((log) => log.date === today);
    if (existingLog) {
      await supabase
        .from('daily_logs')
        .update({
          xp_earned: existingLog.xp_earned + points,
          is_active: existingLog.is_active || active,
          notes,
        })
        .eq('id', existingLog.id);
    } else {
      await supabase.from('daily_logs').insert({
        user_id: user.id,
        date: today,
        xp_earned: points,
        is_active: active,
        notes,
      });
    }
  };

  const completeMission = async (missionId: string) => {
    if (completedMissionIds.has(missionId)) return;
    await supabase.from('mission_completions').insert({ user_id: user.id, mission_id: missionId, date: today });
    await gainXp(20, true);
    setMessage('+20 XP mission completed');
    await loadData();
  };

  const completeTask = async (taskId: string) => {
    if (completedTaskIds.has(taskId)) return;
    await supabase.from('task_completions').insert({ user_id: user.id, task_id: taskId, date: today });
    await gainXp(10, false);
    setMessage('+10 XP task completed');
    await loadData();
  };

  const addTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!newTask.trim()) return;
    await supabase.from('tasks').insert({ user_id: user.id, title: newTask.trim(), is_default: false });
    setNewTask('');
    await loadData();
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId).eq('is_default', false);
    await loadData();
  };

  const addMission = async (event: FormEvent) => {
    event.preventDefault();
    if (!newMission.trim()) return;
    await supabase.from('missions').insert({
      user_id: user.id,
      title: newMission.trim(),
      description: newMissionDescription.trim() || 'Custom coding challenge.',
      is_custom: true,
    });
    setNewMission('');
    setNewMissionDescription('');
    await loadData();
  };

  const saveNotes = async () => {
    const existingLog = data.logs.find((log) => log.date === today);
    if (existingLog) {
      await supabase.from('daily_logs').update({ notes }).eq('id', existingLog.id);
    } else {
      await supabase.from('daily_logs').insert({
        user_id: user.id,
        date: today,
        xp_earned: 0,
        is_active: false,
        notes,
      });
    }
    setMessage('Today notes saved');
    await loadData();
  };

  const completeFocus = async (duration: number) => {
    await supabase.from('focus_sessions').insert({ user_id: user.id, date: today, duration_minutes: duration });
    await gainXp(15, false);
    setMessage('+15 XP focus session completed');
    await loadData();
  };

  const copyJourney = async () => {
    const report = buildJourneyReport({ ...data, badges: stats.badges, streaks: stats.streaks });
    await navigator.clipboard.writeText(report);
    setMessage('Journey report copied');
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Coding Addiction Tracker</p>
          <h1>Level up your coding habit</h1>
        </div>
        <button className="ghost-button" onClick={() => supabase.auth.signOut()}>
          Logout
        </button>
      </header>

      {message && <div className="toast">{message}</div>}
      {authMessage && <div className="toast">{authMessage}</div>}

      <section className="stats-grid">
        <StatCard label="Current streak" value={`${stats.streaks.current} days`} />
        <StatCard label="Longest streak" value={`${stats.streaks.longest} days`} />
        <StatCard label="Total XP" value={data.profile.total_xp.toString()} />
        <StatCard label="Level" value={data.profile.level.toString()} />
      </section>

      <section className="level-panel">
        <div>
          <p className="eyebrow">Next level</p>
          <h2>{stats.progress.gained} / {stats.progress.needed} XP</h2>
        </div>
        <div className="progress-track">
          <span style={{ width: `${stats.progress.percent}%` }} />
        </div>
      </section>

      <section className="content-grid">
        <Panel title="Today Missions">
          {data.missions.map((mission) => (
            <article className="mission-card" key={mission.id}>
              <div>
                <h3>{mission.title}</h3>
                <p>{mission.description}</p>
              </div>
              <button
                className={completedMissionIds.has(mission.id) ? 'done-button' : 'small-button'}
                onClick={() => completeMission(mission.id)}
                disabled={completedMissionIds.has(mission.id)}
              >
                {completedMissionIds.has(mission.id) ? 'Done' : '+20 XP'}
              </button>
            </article>
          ))}
          <form className="inline-form stacked" onSubmit={addMission}>
            <input value={newMission} onChange={(event) => setNewMission(event.target.value)} placeholder="Add custom mission" />
            <input
              value={newMissionDescription}
              onChange={(event) => setNewMissionDescription(event.target.value)}
              placeholder="Short description"
            />
            <button className="small-button">Add mission</button>
          </form>
        </Panel>

        <Panel title="Daily Checklist">
          {data.tasks.map((task) => (
            <div className="task-row" key={task.id}>
              <button
                className={completedTaskIds.has(task.id) ? 'checkbox done' : 'checkbox'}
                onClick={() => completeTask(task.id)}
                aria-label={`Complete ${task.title}`}
              />
              <span>{task.title}</span>
              {!task.is_default && (
                <button className="text-button" onClick={() => deleteTask(task.id)}>
                  Delete
                </button>
              )}
            </div>
          ))}
          <form className="inline-form" onSubmit={addTask}>
            <input value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="Add checklist task" />
            <button className="small-button">Add</button>
          </form>
        </Panel>

        <FocusTimer onComplete={completeFocus} />

        <Panel title="Progress Dashboard">
          <div className="mini-stats">
            <StatCard label="Coding days" value={data.logs.filter((log) => log.is_active).length.toString()} />
            <StatCard label="Missions" value={data.missionCompletions.length.toString()} />
            <StatCard label="Tasks" value={data.taskCompletions.length.toString()} />
            <StatCard label="Focus" value={data.focusSessions.length.toString()} />
          </div>
          <Heatmap logs={data.logs} />
          <XpBars logs={data.logs} />
        </Panel>

        <Panel title="Badges">
          <div className="badge-grid">
            {stats.badges.map((badge) => (
              <div className={badge.earned ? 'badge earned' : 'badge'} key={badge.key}>
                <strong>{badge.title}</strong>
                <span>{badge.description}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Journey Report">
          <p className="muted">
            Copy your full progress and paste it into Claude, ChatGPT, or send it to a mentor for review.
          </p>
          <button className="primary-button" onClick={copyJourney}>
            Copy Journey Report
          </button>
        </Panel>

        <Panel title="Today Notes">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What did you learn today? Where did you get stuck?"
          />
          <button className="small-button" onClick={saveNotes}>
            Save notes
          </button>
          <div className="notes-history">
            <h3>Previous Notes</h3>
            {data.logs.filter((log) => log.notes?.trim()).length === 0 && <p className="muted">No saved notes yet.</p>}
            {data.logs
              .filter((log) => log.notes?.trim())
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((log) => (
                <article className="note-item" key={log.id}>
                  <strong>{log.date}</strong>
                  <p>{log.notes}</p>
                </article>
              ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}

async function ensureProfile(user: User): Promise<Profile> {
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (data) return data as Profile;

  const username = (user.user_metadata?.username as string | undefined) || user.email?.split('@')[0] || 'coder';
  const { data: created, error } = await supabase
    .from('profiles')
    .insert({ id: user.id, username, level: 1, total_xp: 0 })
    .select('*')
    .single();

  if (error) throw error;
  return created as Profile;
}

async function ensureDefaultTasks(userId: string) {
  const { data } = await supabase.from('tasks').select('id').eq('user_id', userId).eq('is_default', true).limit(1);
  if (data && data.length > 0) return;
  await supabase.from('tasks').insert(DEFAULT_TASKS.map((title) => ({ user_id: userId, title, is_default: true })));
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FocusTimer({ onComplete }: { onComplete: (duration: number) => Promise<void> }) {
  const storageKey = 'coding-addiction-focus-timer';
  const [duration, setDuration] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [completionNotice, setCompletionNotice] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const completingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const alertCompletion = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Focus session complete', {
        body: 'XP saved. Take a short break, then start the next mission.',
      });
    }

    const audioContext = audioContextRef.current;
    if (audioContext) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.35);
    }
  };

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const savedTimer = window.localStorage.getItem(storageKey);
    if (!savedTimer) return;

    try {
      const parsed = JSON.parse(savedTimer) as { duration: number; endAt: number };
      const remaining = Math.max(0, Math.ceil((parsed.endAt - Date.now()) / 1000));
      if (remaining > 0) {
        setDuration(parsed.duration);
        setSecondsLeft(remaining);
        setEndAt(parsed.endAt);
        setRunning(true);
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    if (!running || !endAt) return;
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0 && !completingRef.current) {
        completingRef.current = true;
        window.clearInterval(interval);
        window.localStorage.removeItem(storageKey);
        setRunning(false);
        setEndAt(null);
        setSaving(true);
        setCompletionNotice(true);
        alertCompletion();
        onCompleteRef.current(duration).finally(() => {
          setSaving(false);
          completingRef.current = false;
        });
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [duration, endAt, running]);

  const start = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const target = Date.now() + duration * 60 * 1000;
    setEndAt(target);
    setSecondsLeft(duration * 60);
    setRunning(true);
    setCompletionNotice(false);
    window.localStorage.setItem(storageKey, JSON.stringify({ duration, endAt: target }));
  };

  const reset = () => {
    setRunning(false);
    setEndAt(null);
    setSecondsLeft(duration * 60);
    setCompletionNotice(false);
    window.localStorage.removeItem(storageKey);
  };

  const completeNow = async () => {
    if (saving) return;
    window.localStorage.removeItem(storageKey);
    setRunning(false);
    setEndAt(null);
    setSecondsLeft(0);
    setSaving(true);
    setCompletionNotice(true);
    alertCompletion();
    await onCompleteRef.current(duration);
    setSaving(false);
  };

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <Panel title="Focus Timer">
      <div className="timer-face">{minutes}:{seconds}</div>
      <label>
        Duration minutes
        <input
          type="number"
          min="1"
          max="120"
          value={duration}
          disabled={running}
          onChange={(event) => {
            const next = Number(event.target.value);
            setDuration(next);
            setSecondsLeft(next * 60);
          }}
        />
      </label>
      {completionNotice && (
        <div className="timer-popup">
          <strong>Focus session complete</strong>
          <span>XP saved. Take a short break, then start the next mission.</span>
          <button className="text-button" onClick={() => setCompletionNotice(false)}>
            Close
          </button>
        </div>
      )}
      <div className="button-row">
        <button className="small-button" onClick={start} disabled={running || saving}>
          Start
        </button>
        <button className="ghost-button" onClick={reset}>
          Reset
        </button>
        <button className="small-button" onClick={completeNow} disabled={saving}>
          Complete now
        </button>
      </div>
    </Panel>
  );
}

function Heatmap({ logs }: { logs: DailyLog[] }) {
  const logMap = new Map(logs.map((log) => [log.date, log]));
  const days = Array.from({ length: 90 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (89 - index));
    const iso = date.toISOString().slice(0, 10);
    return { iso, active: Boolean(logMap.get(iso)?.is_active) };
  });

  return (
    <div className="heatmap" aria-label="Coding activity for last 90 days">
      {days.map((day) => (
        <span className={day.active ? 'active' : ''} title={day.iso} key={day.iso} />
      ))}
    </div>
  );
}

function XpBars({ logs }: { logs: DailyLog[] }) {
  const recent = logs.slice(-14);
  const max = Math.max(20, ...recent.map((log) => log.xp_earned));

  return (
    <div className="xp-bars">
      {recent.map((log) => (
        <div className="xp-bar" key={log.id}>
          <span style={{ height: `${Math.max(8, (log.xp_earned / max) * 100)}%` }} />
          <small>{log.date.slice(5)}</small>
        </div>
      ))}
    </div>
  );
}

export default App;
