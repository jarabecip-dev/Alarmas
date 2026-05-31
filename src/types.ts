/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AlarmStatus = 'pending' | 'ringing' | 'rang' | 'dismissed';

export interface Alarm {
  id: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format
  messageType: 'text' | 'voice';
  messageText?: string;
  voiceAudio?: string; // Base64 encoded audio string
  status: AlarmStatus;
  createdAt: number;
}

export type SoundType = 'beep' | 'chime' | 'siren' | 'retro';

export interface AppSettings {
  soundType: SoundType;
  soundDuration: number; // in seconds, e.g. 10, 30, 60, 120 (infinite = 0)
  snoozeDuration: number; // in minutes
}
