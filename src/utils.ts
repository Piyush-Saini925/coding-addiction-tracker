import type {
  Badge,
  DailyLog,
  FocusSession,
  Mission,
  MissionCompletion,
  Profile,
  Task,
  TaskCompletion,
} from './types';

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const xpForLevelStart = (level: number) => ((level - 1) * level * 100) / 2;

export const calculateLevel = (totalXp: number) => {
  let level = 1;
  while (totalXp >= xpForLevelStart(level + 1)) {
    level += 1;
  }
  return level;
};

export const nextLevelProgress = (totalXp: number, level: number) => {
  const currentStart = xpForLevelStart(level);
  const nextStart = xpForLevelStart(level + 1);
  const gained = totalXp - currentStart;
  const needed = nextStart - currentStart;
  return {
    gained,
    needed,
    percent: Math.min(100, Math.max(0, Math.round((gained / needed) * 100))),
  };
};

const dateToNumber = (date: string) => {
  const utc = new Date(`${date}T00:00:00.000Z`).getTime();
  return Math.floor(utc / 86_400_000);
};

export const calculateStreaks = (logs: DailyLog[]) => {
  const activeDates = [...new Set(logs.filter((log) => log.is_active).map((log) => log.date))]
    .sort()
    .map(dateToNumber);

  let longest = 0;
  let run = 0;
  let previous: number | null = null;

  activeDates.forEach((day) => {
    run = previous === null || day === previous + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  });

  const today = dateToNumber(todayIso());
  const yesterday = today - 1;
  let current = 0;
  let expected = activeDates.includes(today) ? today : yesterday;

  for (let i = activeDates.length - 1; i >= 0; i -= 1) {
    if (activeDates[i] !== expected) break;
    current += 1;
    expected -= 1;
  }

  return { current, longest };
};

export const buildBadges = (
  profile: Profile,
  streaks: { current: number; longest: number },
  missionCompletions: MissionCompletion[],
  focusSessions: FocusSession[],
): Badge[] => [
  {
    key: 'first-mission',
    title: 'First Mission',
    description: 'Complete your first coding mission.',
    earned: missionCompletions.length >= 1,
  },
  {
    key: 'week-warrior',
    title: 'Week Warrior',
    description: 'Reach a 7-day coding streak.',
    earned: streaks.longest >= 7,
  },
  {
    key: 'level-5',
    title: 'Level 5',
    description: 'Reach level 5 through consistent XP.',
    earned: profile.level >= 5,
  },
  {
    key: 'century',
    title: 'Century',
    description: 'Complete 100 total missions.',
    earned: missionCompletions.length >= 100,
  },
  {
    key: 'focus-master',
    title: 'Focus Master',
    description: 'Complete 10 focus sessions.',
    earned: focusSessions.length >= 10,
  },
];

export const buildJourneyReport = (params: {
  profile: Profile;
  logs: DailyLog[];
  missions: Mission[];
  missionCompletions: MissionCompletion[];
  tasks: Task[];
  taskCompletions: TaskCompletion[];
  focusSessions: FocusSession[];
  badges: Badge[];
  streaks: { current: number; longest: number };
}) => {
  const {
    profile,
    logs,
    missions,
    missionCompletions,
    tasks,
    taskCompletions,
    focusSessions,
    badges,
    streaks,
  } = params;
  const missionById = new Map(missions.map((mission) => [mission.id, mission.title]));
  const taskById = new Map(tasks.map((task) => [task.id, task.title]));
  const startDate = logs[0]?.date || profile.created_at.slice(0, 10);
  const activeDays = logs.filter((log) => log.is_active).length;
  const earnedBadges = badges.filter((badge) => badge.earned).map((badge) => badge.title);

  const dailyHistory = logs
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((log) => {
      const completedMissions = missionCompletions
        .filter((item) => item.date === log.date)
        .map((item) => missionById.get(item.mission_id) || 'Unknown mission');
      const completedTasks = taskCompletions
        .filter((item) => item.date === log.date)
        .map((item) => taskById.get(item.task_id) || 'Unknown task');

      return [
        `## ${log.date}`,
        `- Active coding day: ${log.is_active ? 'Yes' : 'No'}`,
        `- XP earned: ${log.xp_earned}`,
        `- Missions: ${completedMissions.length ? completedMissions.join(', ') : 'None'}`,
        `- Tasks: ${completedTasks.length ? completedTasks.join(', ') : 'None'}`,
        `- Notes: ${log.notes || 'No notes'}`,
      ].join('\n');
    })
    .join('\n\n');

  return `# Coding Addiction Tracker Journey Report

Start date: ${startDate}
Current date: ${todayIso()}
Current streak: ${streaks.current} days
Longest streak: ${streaks.longest} days
Total XP: ${profile.total_xp}
Current level: ${profile.level}
Total coding days: ${activeDays}
Total missions completed: ${missionCompletions.length}
Total tasks completed: ${taskCompletions.length}
Total focus sessions: ${focusSessions.length}
Badges earned: ${earnedBadges.length ? earnedBadges.join(', ') : 'None yet'}

# Progress Summary
I am using coding missions, tasks, XP, levels, streaks, and focus sessions to build consistency.

# Daily History
${dailyHistory || 'No daily history yet.'}

# Questions For Review
1. Is my coding journey going in the right direction?
2. What should I focus on next?
3. What mistakes or weak patterns do you see?
4. What should I build or learn in the next 7 days?
`;
};
