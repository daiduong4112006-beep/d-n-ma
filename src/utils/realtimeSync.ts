/**
 * Real-time Cross-Tab & In-App Sync Engine
 * Uses modern BroadcastChannel API with ultra-low latency (< 5ms)
 * Includes Fallback to StorageEvent and anti-echo loop prevention.
 */

export type SyncEventType =
  | 'MCQ_FLASHCARD'
  | 'MCQ_PRACTICE'
  | 'JP_FLASHCARD'
  | 'JP_KANJI'
  | 'JP_TYPING'
  | 'JP_MULTICHOICE';

export interface SyncPayload<T = any> {
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

    // Storage Event fallback (also ensures cross-tab communication on older browsers)
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
  }

  private handleIncoming(payload: SyncPayload) {
    if (!payload || !payload.type || !payload.key) return;
    // Ignore messages sent by this tab itself to prevent echo loops
    if (payload.senderId === TAB_INSTANCE_ID) return;

    this.listeners.forEach((callback) => {
      try {
        callback(payload);
      } catch (err) {
        console.error('[RealtimeSync] Listener callback error:', err);
      }
    });
  }

  /**
   * Broadcast state changes to all other tabs instantly (< 5ms)
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
      type,
      key,
      currentIndex,
      data,
      timestamp,
      senderId: TAB_INSTANCE_ID,
    };

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
      type,
      key,
      currentIndex,
      data,
      timestamp,
      senderId: 'remote_cloud', // Mark as remote cloud to bypass local sender check
    };
    this.listeners.forEach((callback) => {
      try {
        callback(payload);
      } catch (err) {
        console.error('[RealtimeSync] Local listener error:', err);
      }
    });
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
    const handler: SyncCallback = (payload) => {
      if (payload.type === type && payload.key === key) {
        callback(payload as SyncPayload<T>);
      }
    };
    return this.subscribe(handler);
  }
}

export const realtimeSync = new RealtimeSyncBus();
