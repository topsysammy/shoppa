/** Safe localStorage / sessionStorage helpers (storage can be blocked or full). */
export const local = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const session = {
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  remove(key: string) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const keys = {
  onboarded: 'shoppa.onboarded',
  pendingEmail: 'shoppa.pendingEmail',
  storagePersist: 'shoppa.storagePersist',
  storageWarned: 'shoppa.storageWarned',
  pushPromptDismissed: 'shoppa.pushPromptDismissed',
} as const;
