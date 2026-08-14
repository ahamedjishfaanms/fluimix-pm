export type Role = "admin" | "member";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  title: string | null;
  created_at: string;
}

export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  parent_id: string | null;
  owner_id: string;
  status: ProjectStatus;
  color: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee_id: string | null;
  reporter_id: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export type NotificationType = "assigned" | "mentioned";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  task_id: string | null;
  project_id: string | null;
  actor_id: string | null;
  title: string;
  read: boolean;
  created_at: string;
}

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
];

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "#5b8dd6" },
  { value: "medium", label: "Medium", color: "#e0ab35" },
  { value: "high", label: "High", color: "#e0793c" },
  { value: "urgent", label: "Urgent", color: "#d64545" },
];
