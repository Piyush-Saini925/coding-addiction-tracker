export type Profile = {
  id: string;
  username: string | null;
  created_at: string;
  level: number;
  total_xp: number;
};

export type DailyLog = {
  id: string;
  user_id: string;
  date: string;
  xp_earned: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  user_id: string;
  title: string;
  is_default: boolean;
  created_at: string;
};

export type TaskCompletion = {
  id: string;
  user_id: string;
  task_id: string;
  date: string;
  created_at: string;
};

export type Mission = {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  is_custom: boolean;
  created_at: string;
};

export type MissionCompletion = {
  id: string;
  user_id: string;
  mission_id: string;
  date: string;
  created_at: string;
};

export type FocusSession = {
  id: string;
  user_id: string;
  date: string;
  duration_minutes: number;
  created_at: string;
};

export type Badge = {
  key: string;
  title: string;
  description: string;
  earned: boolean;
};
