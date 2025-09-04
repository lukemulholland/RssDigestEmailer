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
  checkFeed: (id: string) => apiRequest("POST", `/api/feeds/${id}/check`, undefined, { timeoutMs: 60000 }),
  checkAllFeeds: () => apiRequest("POST", "/api/feeds/check-all", undefined, { timeoutMs: 90000 }),
  validateFeedUrl: (url: string) => apiRequest("POST", "/api/feeds/validate", { url }),

  // Summaries
  getSummaries: (limit?: number) => {
    const url = limit ? `/api/summaries?limit=${limit}` : "/api/summaries";
    return fetch(url).then(res => res.json());
  },
  getSummary: (id: string) => fetch(`/api/summaries/${id}`).then(res => res.json()),
  generateSummary: () => apiRequest("POST", "/api/summaries/generate", undefined, { timeoutMs: 180000 }),
  retrySummary: (id: string) => apiRequest("POST", `/api/summaries/${id}/retry`),
  sendSummaryEmail: (id: string) => apiRequest("POST", `/api/summaries/${id}/send-email`, undefined, { timeoutMs: 60000 }),

  // Email Settings
  getEmailSettings: async () => {
    const res = await fetch("/api/email-settings", { credentials: "include" });
    if (!res.ok) return undefined;
    return res.json();
  },
  saveEmailSettings: (data: any) => apiRequest("POST", "/api/email-settings", data),
  sendTestEmail: () => apiRequest("POST", "/api/email-settings/test", undefined, { timeoutMs: 60000 }),

  // Recipients
  listRecipients: async () => {
    const res = await apiRequest("GET", "/api/recipients");
    return res.json();
  },
  addRecipient: (email: string) => apiRequest("POST", "/api/recipients", { email }),
  removeRecipient: (email: string) => apiRequest("DELETE", `/api/recipients/${encodeURIComponent(email)}`),

  // Schedule
  getSchedule: () => fetch("/api/schedule").then(res => res.json()),
  saveSchedule: (data: any) => apiRequest("POST", "/api/schedule", data),
  runNow: () => apiRequest("POST", "/api/schedule/run-now", undefined, { timeoutMs: 120000 }),

  // Activity Logs
  getLogs: (limit?: number) => {
    const url = limit ? `/api/logs?limit=${limit}` : "/api/logs";
    return fetch(url).then(res => res.json());
  },
};
