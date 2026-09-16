/**
 * Real-time Cross-Tab & In-App Sync Engine
 * Uses modern BroadcastChannel API with ultra-low latency (< 2ms)
 * Includes Fallback to StorageEvent, in-memory state caching, and anti-echo loop prevention.
 */

export type SyncEventType =
  | 'MCQ_FLASHCARD'
  | 'MCQ_PRACTICE'
  | 'MCQ_MISTAKES'
  | 'JP_FLASHCARD'
  | 'JP_KANJI'
  | 'JP_TYPING'
  | 'JP_MULTICHOICE';

export interface SyncPayload<T = any> {
  id?: string;            // unique message identifier to force storage event triggering
  type: SyncEventType;
  key: string;            // unique identifier e.g. quizId or lessonId
  currentIndex: number;   // active question or card index (e.g. 92, 100)
  data?: T;               // optional extra state: userAnswers, knownIds, etc.
  timestamp: number;      // Date.now() for Last-Write-Wins conflict resolution
  senderId: string;       // unique tab identifier to prevent echo loops
}

// Generate unique ID for this browser tab instance
export const TAB_INSTANCE_ID = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const CHANNEL_NAME = 'mcq_master_realtime_sync_channel';
type SyncCallback = (payload: SyncPayload) => void;

class RealtimeSyncBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<SyncCallback> = new Set();
  private hasBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window;
  // Cache of latest known state for each event key to provide instant initial sync
  private latestStateMap: Map<string, SyncPayload> = new Map();

  constructor() {
    if (typeof window === 'undefined') return;

    // Initialize BroadcastChannel if supported
    if (this.hasBroadcastChannel) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent<SyncPayload>) => {
          this.handleIncoming(event.data);
        };
      } catch (err) {
        console.warn('[RealtimeSync] BroadcastChannel init failed, falling back to storage events:', err);
        this.channel = null;
      }
    }

    // Storage Event fallback (also ensures cross-tab communication on older browsers or background tabs)
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === '__mcq_bus_message__' && event.newValue) {
        try {
          const payload: SyncPayload = JSON.parse(event.newValue);
          this.handleIncoming(payload);
        } catch {
          // ignore parsing error
        }
      }
    });

    // When tab regains focus or visibility, re-trigger active subscribers with latest state
    const handleTabRevisit = () => {
      if (document.visibilityState === 'visible') {
        this.latestStateMap.forEach((payload) => {
          this.listeners.forEach((callback) => {
            try {
              callback(payload);
            } catch (err) {
              console.error('[RealtimeSync] Visibility change callback error:', err);
            }
          });
        });
      }
    };

    window.addEventListener('focus', handleTabRevisit);
    document.addEventListener('visibilitychange', handleTabRevisit);
  }

  private handleIncoming(payload: SyncPayload) {
    if (!payload || !payload.type || !payload.key) return;
    // Ignore messages sent by this tab itself to prevent echo loops
    if (payload.senderId === TAB_INSTANCE_ID) return;

    const cacheKey = `${payload.type}_${payload.key}`;
    const existing = this.latestStateMap.get(cacheKey);
    // Last-Write-Wins check
    if (existing && existing.timestamp > payload.timestamp) {
      return;
    }
    this.latestStateMap.set(cacheKey, payload);

    this.listeners.forEach((callback) => {
      try {
        callback(payload);
      } catch (err) {
        console.error('[RealtimeSync] Listener callback error:', err);
      }
    });
  }

  /**
   * Broadcast state changes to all other tabs instantly (< 2ms)
   */
  public broadcast<T = any>(
    type: SyncEventType,
    key: string,
    currentIndex: number,
    data?: T,
    timestamp = Date.now()
  ): void {
    if (typeof window === 'undefined' || !key) return;

    const payload: SyncPayload<T> = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      key: String(key).trim(),
      currentIndex,
      data,
      timestamp,
      senderId: TAB_INSTANCE_ID,
    };

    // Update in-memory latest state
    const cacheKey = `${type}_${payload.key}`;
    this.latestStateMap.set(cacheKey, payload);

    // 1. Send via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch (err) {
        console.warn('[RealtimeSync] postMessage error:', err);
      }
    }

    // 2. Storage event fallback for cross-tab compatibility
    try {
      localStorage.setItem('__mcq_bus_message__', JSON.stringify(payload));
    } catch {
      // ignore storage quota errors
    }
  }

  /**
   * Also notify listeners inside the SAME tab (useful when Cloud Firestore onSnapshot fires)
   */
  public notifyLocal<T = any>(
    type: SyncEventType,
    key: string,
    currentIndex: number,
    data?: T,
    timestamp = Date.now()
  ): void {
    const payload: SyncPayload<T> = {
      id: `cloud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      key: String(key).trim(),
      currentIndex,
      data,
      timestamp,
      senderId: 'remote_cloud', // Mark as remote cloud to bypass local sender check
    };

    const cacheKey = `${type}_${payload.key}`;
    const existing = this.latestStateMap.get(cacheKey);
    if (existing && existing.timestamp > payload.timestamp) {
      return;
    }
    this.latestStateMap.set(cacheKey, payload);

    this.listeners.forEach((callback) => {
      try {
        callback(payload);
      } catch (err) {
        console.error('[RealtimeSync] Local listener error:', err);
      }
    });
  }

  /**
   * Get the latest known sync state from memory
   */
  public getLatestState<T = any>(type: SyncEventType, key: string): SyncPayload<T> | null {
    const cacheKey = `${type}_${String(key).trim()}`;
    return (this.latestStateMap.get(cacheKey) as SyncPayload<T>) || null;
  }

  /**
   * Subscribe to incoming sync events
   */
  public subscribe(callback: SyncCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Filtered subscription for a specific key and type
   */
  public subscribeKey<T = any>(
    type: SyncEventType,
    key: string,
    callback: (payload: SyncPayload<T>) => void
  ): () => void {
    const cleanKey = String(key).trim();
    const handler: SyncCallback = (payload) => {
      if (payload.type === type && payload.key === cleanKey) {
        callback(payload as SyncPayload<T>);
      }
    };
    return this.subscribe(handler);
  }
}

export const realtimeSync = new RealtimeSyncBus();
