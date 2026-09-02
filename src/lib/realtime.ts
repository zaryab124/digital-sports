import { EventEmitter } from 'events';

// Maintain a singleton EventEmitter across hot reloads in development
declare global {
  var __realtimeBus: EventEmitter | undefined;
}

export const realtimeBus: EventEmitter = globalThis.__realtimeBus || new EventEmitter();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__realtimeBus = realtimeBus;
}

// Increase max listeners for multiple client connections
realtimeBus.setMaxListeners(200);

export type RealtimeEventType =
  | 'NOTIFICATION'
  | 'MATCH_SCORE_UPDATE'
  | 'MATCH_STATUS_UPDATE'
  | 'PAYMENT_UPDATE'
  | 'TRANSFER_UPDATE'
  | 'RANKINGS_UPDATE';

export interface RealtimeMessage {
  channel: string;
  eventType: RealtimeEventType;
  payload: any;
  timestamp: string;
}

export function publishEvent(channel: string, eventType: RealtimeEventType, payload: any) {
  const message: RealtimeMessage = {
    channel,
    eventType,
    payload,
    timestamp: new Date().toISOString(),
  };

  realtimeBus.emit(channel, message);
  realtimeBus.emit('all', message);
}

export function publishUserEvent(userId: string, eventType: RealtimeEventType, payload: any) {
  publishEvent(`user:${userId}`, eventType, payload);
}

export function publishMatchEvent(matchId: string, eventType: RealtimeEventType, payload: any) {
  publishEvent(`match:${matchId}`, eventType, payload);
}

export function publishCityEvent(cityId: string, eventType: RealtimeEventType, payload: any) {
  publishEvent(`city:${cityId}`, eventType, payload);
}

export function publishGlobalEvent(eventType: RealtimeEventType, payload: any) {
  publishEvent('global', eventType, payload);
}
