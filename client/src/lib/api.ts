import { apiRequest } from "./queryClient";

export const api = {
  // Dashboard
  getDashboardStats: () => fetch("/api/dashboard/stats").then(res => res.json()),

  // Feeds
  getFeeds: () => fetch("/api/feeds").then(res => res.json()),
  getFeed: (id: string) => fetch(`/api/feeds/${id}`).then(res => res.json()),
  createFeed: (data: any) => apiRequest("POST", "/api/feeds", data),
  updateFeed: (id: string, data: any) => apiRequest("PATCH", `/api/feeds/${id}`, data),
  deleteFeed: (id: string) => apiRequest("DELETE", `/api/feeds/${id}`),
  checkFeed: (id: string) => apiRequest("POST", `/api/feeds/${id}/check`),
  checkAllFeeds: () => apiRequest("POST", "/api/feeds/check-all"),
  validateFeedUrl: (url: string) => apiRequest("POST", "/api/feeds/validate", { url }),

  // Summaries
  getSummaries: (limit?: number) => {
    const url = limit ? `/api/summaries?limit=${limit}` : "/api/summaries";
    return fetch(url).then(res => res.json());
  },
  getSummary: (id: string) => fetch(`/api/summaries/${id}`).then(res => res.json()),
  generateSummary: () => apiRequest("POST", "/api/summaries/generate"),
  retrySummary: (id: string) => apiRequest("POST", `/api/summaries/${id}/retry`),
  sendSummaryEmail: (id: string) => apiRequest("POST", `/api/summaries/${id}/send-email`),

  // Email Settings
  getEmailSettings: async () => {
    const res = await fetch("/api/email-settings");
    if (!res.ok) return undefined;
    return res.json();
  },
  saveEmailSettings: (data: any) => apiRequest("POST", "/api/email-settings", data),
  sendTestEmail: () => apiRequest("POST", "/api/email-settings/test"),

  // Recipients
  listRecipients: () => fetch("/api/recipients").then(res => res.json()),
  addRecipient: (email: string) => apiRequest("POST", "/api/recipients", { email }),
  removeRecipient: (email: string) => apiRequest("DELETE", `/api/recipients/${encodeURIComponent(email)}`),

  // Schedule
  getSchedule: () => fetch("/api/schedule").then(res => res.json()),
  saveSchedule: (data: any) => apiRequest("POST", "/api/schedule", data),
  runNow: () => apiRequest("POST", "/api/schedule/run-now"),

  // Activity Logs
  getLogs: (limit?: number) => {
    const url = limit ? `/api/logs?limit=${limit}` : "/api/logs";
    return fetch(url).then(res => res.json());
  },
};
