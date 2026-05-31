/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SoundType } from '../types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export interface ActiveSound {
  stop: () => void;
}

/**
 * Synthesizes alarm sounds offline using Web Audio API
 */
export function playSyntheticAlarm(type: SoundType): ActiveSound {
  const ctx = getAudioContext();
  let isPlaying = true;
  const activeNodes: (OscillatorNode | GainNode)[] = [];
  let intervalId: any = null;

  const cleanup = () => {
    isPlaying = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    activeNodes.forEach(node => {
      try {
        node.disconnect();
      } catch (e) {
        // Safe double-cleanup ignore
      }
    });
    activeNodes.length = 0;
  };

  if (type === 'beep') {
    // Standard double digital beep pulse every second
    const triggerBeep = () => {
      if (!isPlaying) return;
      const playPulse = (delay: number) => {
        if (!isPlaying) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(880, ctx.currentTime + delay); // A5 note

        g.gain.setValueAtTime(0, ctx.currentTime + delay);
        g.gain.linearRampToValueAtTime(0.4, ctx.currentTime + delay + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);

        o.connect(g);
        g.connect(ctx.destination);

        o.start(ctx.currentTime + delay);
        o.stop(ctx.currentTime + delay + 0.16);

        activeNodes.push(o, g);
      };

      playPulse(0);
      playPulse(0.2);
    };

    triggerBeep();
    intervalId = setInterval(triggerBeep, 1000);

  } else if (type === 'chime') {
    // Elegant warm bell-like chimes
    const triggerChime = () => {
      if (!isPlaying) return;
      const playBell = (freq: number, duration: number, volume: number) => {
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const g = ctx.createGain();

        o1.type = 'sine';
        o1.frequency.setValueAtTime(freq, ctx.currentTime);

        // Ring modulator/harmonic
        o2.type = 'sine';
        o2.frequency.setValueAtTime(freq * 1.5, ctx.currentTime);

        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        o1.connect(g);
        o2.connect(g);
        g.connect(ctx.destination);

        o1.start();
        o2.start();
        o1.stop(ctx.currentTime + duration);
        o2.stop(ctx.currentTime + duration);

        activeNodes.push(o1, o2, g);
      };

      // Play major arpeggio over 3 seconds
      playBell(523.25, 2.0, 0.25); // C5
      setTimeout(() => isPlaying && playBell(659.25, 1.8, 0.20), 400); // E5
      setTimeout(() => isPlaying && playBell(783.99, 1.5, 0.18), 800); // G5
      setTimeout(() => isPlaying && playBell(1046.50, 1.2, 0.15), 1200); // C6
    };

    triggerChime();
    intervalId = setInterval(triggerChime, 3000);

  } else if (type === 'siren') {
    // Oscillating high-low sweeping siren tone
    const o = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const g = ctx.createGain();

    o.type = 'triangle';
    o.frequency.setValueAtTime(700, ctx.currentTime);

    // Modulate main frequency up and down
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(2, ctx.currentTime); // 2Hz oscillation
    modGain.gain.setValueAtTime(250, ctx.currentTime); // Oscillate by 250 Hz

    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.1);

    modulator.connect(modGain);
    modGain.connect(o.frequency);
    o.connect(g);
    g.connect(ctx.destination);

    o.start();
    modulator.start();

    activeNodes.push(o, modulator, modGain, g);

  } else if (type === 'retro') {
    // Retro arcade space invaders style laser sounds
    const triggerRetro = () => {
      if (!isPlaying) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.type = 'sawtooth';
      o.frequency.setValueAtTime(1200, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.4);

      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      o.connect(g);
      g.connect(ctx.destination);

      o.start();
      o.stop(ctx.currentTime + 0.4);

      activeNodes.push(o, g);
    };

    triggerRetro();
    intervalId = setInterval(triggerRetro, 600);
  }

  return { stop: cleanup };
}

/**
 * Class to play recorded Base64 voice audio using the standard HTML Audio element
 */
export class VoicePlayer {
  private audio: HTMLAudioElement | null = null;

  play(base64DataUrl: string, loop: boolean = false): Promise<void> {
    this.stop();
    return new Promise((resolve, reject) => {
      try {
        this.audio = new Audio(base64DataUrl);
        this.audio.loop = loop;
        this.audio.play()
          .then(() => resolve())
          .catch(e => reject(e));
      } catch (err) {
        reject(err);
      }
    });
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
  }
}
