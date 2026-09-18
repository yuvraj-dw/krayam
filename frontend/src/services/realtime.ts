// Realtime Transport Service for Server-Sent Events (SSE)
// Supports custom Authorization headers via ReadableStream reader

export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface BackendEvent {
  id?: string;
  event_type: string;
  entity_type?: string;
  entity_id?: string | null;
  actor_id?: string | null;
  actor_type?: string | null;
  data?: any;
  created_at?: string;
}

type EventCallback = (event: BackendEvent) => void;
type StatusCallback = (status: RealtimeStatus) => void;

class RealtimeService {
  private abortController: AbortController | null = null;
  private status: RealtimeStatus = 'disconnected';
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private anyListeners: Set<EventCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private reconnectTimeout: any = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private isIntentionallyClosed = false;

  private currentRole: 'farmer' | 'operator' | null = null;
  private currentToken: string | null = null;
  private currentCentreId: string | null = null;

  public getStatus(): RealtimeStatus {
    return this.status;
  }

  public onStatusChange(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  private setStatus(newStatus: RealtimeStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((cb) => {
        try {
          cb(newStatus);
        } catch (err) {
          console.error('[Realtime] Status listener error:', err);
        }
      });
    }
  }

  public subscribe(eventType: string, callback: EventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  public subscribeAll(callback: EventCallback): () => void {
    this.anyListeners.add(callback);
    return () => {
      this.anyListeners.delete(callback);
    };
  }

  private emit(event: BackendEvent) {
    // Notify type-specific listeners
    if (event.event_type && this.listeners.has(event.event_type)) {
      this.listeners.get(event.event_type)!.forEach((cb) => {
        try {
          cb(event);
        } catch (err) {
          console.error('[Realtime] Event listener error:', err);
        }
      });
    }

    // Notify wildcard listeners
    this.anyListeners.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error('[Realtime] Wildcard listener error:', err);
      }
    });
  }

  public connect(params: {
    role: 'farmer' | 'operator';
    token: string;
    centreId?: string | null;
  }): void {
    if (!params.token) {
      console.warn('[Realtime] Cannot connect: missing authentication token');
      return;
    }

    // If already connected with identical parameters, do nothing
    if (
      this.status === 'connected' &&
      this.currentRole === params.role &&
      this.currentToken === params.token &&
      this.currentCentreId === (params.centreId || null)
    ) {
      return;
    }

    this.disconnect();
    this.isIntentionallyClosed = false;
    this.currentRole = params.role;
    this.currentToken = params.token;
    this.currentCentreId = params.centreId || null;
    this.reconnectAttempts = 0;

    this.startStream();
  }

  public disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.setStatus('disconnected');
  }

  private async startStream(): Promise<void> {
    if (this.isIntentionallyClosed || !this.currentToken) return;

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://hizru.me/api';
    let url = `${baseUrl}/v1/events/me`;
    if (this.currentRole === 'operator') {
      if (!this.currentCentreId) {
        console.warn('[Realtime] Operator stream requires centreId, falling back');
        return;
      }
      url = `${baseUrl}/v1/events/stream?centre_id=${encodeURIComponent(this.currentCentreId)}`;
    }

    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.currentToken}`,
          Accept: 'text/event-stream',
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(`SSE HTTP Error ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null, SSE stream unavailable');
      }

      this.setStatus('connected');
      this.reconnectAttempts = 0;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last incomplete fragment in buffer
        buffer = lines.pop() || '';

        let currentEvent: Partial<BackendEvent> = {};
        let currentData = '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            // Empty line marks end of an event block
            if (currentData || currentEvent.event_type) {
              let parsedData = null;
              if (currentData) {
                try {
                  parsedData = JSON.parse(currentData);
                } catch {
                  parsedData = currentData;
                }
              }

              const backendEvent: BackendEvent = {
                event_type: currentEvent.event_type || (parsedData?.event_type ?? 'MESSAGE'),
                entity_type: parsedData?.entity_type ?? currentEvent.entity_type,
                entity_id: parsedData?.entity_id ?? currentEvent.entity_id,
                data: parsedData?.data ?? parsedData,
                id: currentEvent.id ?? parsedData?.id,
                created_at: parsedData?.created_at ?? new Date().toISOString(),
              };

              this.emit(backendEvent);
            }
            currentEvent = {};
            currentData = '';
            continue;
          }

          if (trimmed.startsWith('event:')) {
            currentEvent.event_type = trimmed.slice(6).trim();
          } else if (trimmed.startsWith('data:')) {
            const dataContent = trimmed.slice(5).trim();
            currentData += (currentData ? '\n' : '') + dataContent;
          } else if (trimmed.startsWith('id:')) {
            currentEvent.id = trimmed.slice(3).trim();
          }
        }
      }
    } catch (err: any) {
      if (signal.aborted || this.isIntentionallyClosed) {
        // Normal disconnection
        return;
      }
      console.warn('[Realtime] SSE Connection dropped:', err.message);
    }

    if (!this.isIntentionallyClosed) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    this.setStatus('reconnecting');
    this.reconnectAttempts++;
    // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts - 1), this.maxReconnectDelay);

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      this.startStream();
    }, delay);
  }
}

export const realtimeService = new RealtimeService();
