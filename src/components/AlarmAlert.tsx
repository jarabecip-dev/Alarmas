/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { Alarm, AppSettings } from '../types';
import { Bell, Volume2, Mic, Clock, ShieldAlert } from 'lucide-react';
import { playSyntheticAlarm, ActiveSound, VoicePlayer } from '../utils/audio';

interface AlarmAlertProps {
  alarm: Alarm;
  settings: AppSettings;
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
}

export default function AlarmAlert({ alarm, settings, onDismiss, onSnooze }: AlarmAlertProps) {
  const activeSoundRef = useRef<ActiveSound | null>(null);
  const voicePlayerRef = useRef<VoicePlayer | null>(null);

  useEffect(() => {
    // 1. Play synthesize signal OR vocal voice
    if (alarm.messageType === 'voice' && alarm.voiceAudio) {
      // Setup Voice Recording Playback loop
      voicePlayerRef.current = new VoicePlayer();
      voicePlayerRef.current.play(alarm.voiceAudio, true).catch(err => {
        console.error('Cant autoplay voice recording, playing default synthesizer fallback', err);
        // Fallback to offline synthesized alert
        activeSoundRef.current = playSyntheticAlarm(settings.soundType);
      });
    } else {
      // Play digital synthesized tone
      activeSoundRef.current = playSyntheticAlarm(settings.soundType);
    }

    // 2. Setup Auto-expiry timer if configured (soundDuration)
    let autoExpiryTimer: any = null;
    if (settings.soundDuration > 0) {
      autoExpiryTimer = setTimeout(() => {
        onDismiss(alarm.id); // auto dismiss when timer finishes
      }, settings.soundDuration * 1000);
    }

    // 3. Clean up on unmount (when alarm goes off/dismissed/snoozed)
    return () => {
      if (activeSoundRef.current) {
        activeSoundRef.current.stop();
        activeSoundRef.current = null;
      }
      if (voicePlayerRef.current) {
        voicePlayerRef.current.stop();
        voicePlayerRef.current = null;
      }
      if (autoExpiryTimer) {
        clearTimeout(autoExpiryTimer);
      }
    };
  }, [alarm, settings, onDismiss]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-white font-sans overflow-y-auto">
      {/* Visual Accent Pulse Effects */}
      <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-rose-600/5 to-emerald-500/10 pointer-events-none animate-pulse" />

      <div className="max-w-md w-full text-center space-y-8 relative z-10">
        
        {/* Ringing Bell Visual */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-amber-500/25 animate-ping" style={{ animationDuration: '1.2s' }} />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Bell className="w-11 h-11 text-white animate-bounce" />
            </div>
          </div>
        </div>

        {/* Text Header */}
        <div className="space-y-2">
          <span className="text-amber-400 font-bold tracking-widest text-xs uppercase bg-amber-500/20 px-3 py-1 rounded-full border border-amber-400/20 inline-block font-sans">
            ¡ALERTA DE ALARMA ACTIVA!
          </span>
          <h2 className="text-5xl font-mono font-bold tracking-tight text-white select-none">
            {alarm.time}
          </h2>
          <div className="text-slate-400 text-sm font-sans">
            Asignada para {alarm.date}
          </div>
        </div>

        {/* Message Panel Card */}
        <div className="p-6 bg-slate-800/80 rounded-2xl border border-slate-700 max-w-sm mx-auto backdrop-blur shadow-xl space-y-4">
          <div className="flex items-center justify-center gap-2 text-rose-300 font-semibold text-xs uppercase tracking-wider">
            {alarm.messageType === 'voice' ? (
              <>
                <Mic className="w-4 h-4" />
                <span>Mensaje de Voz Reproduciéndose</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Mensaje Adjunto</span>
              </>
            )}
          </div>
          
          <div className="text-lg font-medium text-slate-100 italic">
            {alarm.messageType === 'voice' ? (
              '"Escuchando nota de voz en bucle..."'
            ) : (
              `"${alarm.messageText}"`
            )}
          </div>
        </div>

        {/* Snooze Info Tag */}
        <div className="text-slate-400 text-xs flex items-center justify-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>Intervalo de posposición: {settings.snoozeDuration} min.</span>
        </div>

        {/* Controls Grid */}
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          {/* SNOOZE */}
          <button
            onClick={() => onSnooze(alarm.id)}
            className="w-full py-4 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-bold transition shadow-md active:scale-95"
          >
            Posponer {settings.snoozeDuration} min.
          </button>
          
          {/* DISMISS */}
          <button
            onClick={() => onDismiss(alarm.id)}
            className="w-full py-4.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-105 text-white font-bold transition text-lg shadow-lg active:scale-95"
          >
            Apagar / Descartar
          </button>
        </div>

        {/* Browser specific notification disclaimer */}
        <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5 max-w-xs mx-auto font-sans">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Toque cualquiera de los botones para silenciar el dispositivo.</span>
        </div>
      </div>
    </div>
  );
}
