/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import { Alarm } from '../types';
import { Calendar, Clock, MessageSquare, Mic, Play, Pause, Trash2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface AlarmListProps {
  alarms: Alarm[];
  onDelete: (id: string) => void;
  onToggleStatus?: (id: string, newStatus: 'pending' | 'dismissed') => void;
}

export default function AlarmList({ alarms, onDelete, onToggleStatus }: AlarmListProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayVoice = (id: string, voiceBase64: string) => {
    if (playingId === id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(voiceBase64);
      audioRef.current.onended = () => setPlayingId(null);
      setPlayingId(id);
      audioRef.current.play().catch(err => {
        console.error('Playback failed', err);
        setPlayingId(null);
      });
    }
  };

  const getStatusBadge = (status: Alarm['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Pendiente
          </span>
        );
      case 'rang':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sonada
          </span>
        );
      case 'dismissed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            Satisfecha / Descartada
          </span>
        );
      default:
        return null;
    }
  };

  const formatAlarmDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Divide into Active and Historical
  const futureAlarms = alarms.filter(a => a.status === 'pending').sort((a, b) => {
    const timeA = new Date(`${a.date}T${a.time}`).getTime();
    const timeB = new Date(`${b.date}T${b.time}`).getTime();
    return timeA - timeB;
  });

  const historicalAlarms = alarms.filter(a => a.status !== 'pending').sort((a, b) => b.createdAt - a.createdAt);

  const renderAlarmCard = (alarm: Alarm) => {
    const isVoice = alarm.messageType === 'voice';

    return (
      <div 
        key={alarm.id} 
        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md transition gap-4"
      >
        <div className="flex items-start gap-3.5">
          <div className={`p-3 rounded-xl shrink-0 ${alarm.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
            <Clock className="w-5 h-5 font-bold" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-mono font-bold text-slate-800">{alarm.time}</span>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                <Calendar className="w-3 h-3" />
                {formatAlarmDate(alarm.date)}
              </span>
              {getStatusBadge(alarm.status)}
            </div>

            {/* Alert Message */}
            <div className="text-sm text-slate-600">
              {isVoice ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-50 border border-slate-100 rounded px-2 py-0.5 text-xs">
                    <Mic className="w-3 h-3 text-emerald-500" />
                    Grabación de voz
                  </span>
                  <button
                    onClick={() => handlePlayVoice(alarm.id, alarm.voiceAudio!)}
                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                    title={playingId === alarm.id ? "Pausar" : "Reproducir sonido grabado"}
                  >
                    {playingId === alarm.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </button>
                </div>
              ) : (
                <p className="font-medium text-slate-700 italic border-l-2 border-emerald-300 pl-2 py-0.5 my-1">
                  "{alarm.messageText}"
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 shrink-0 border-t sm:border-0 border-slate-100 pt-3 sm:pt-0">
          {alarm.status === 'pending' && onToggleStatus && (
            <button
              onClick={() => onToggleStatus(alarm.id, 'dismissed')}
              className="py-1.5 px-3 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
              title="Saltar o desactivar"
            >
              Desactivar
            </button>
          )}
          {alarm.status === 'dismissed' && onToggleStatus && (
            <button
              onClick={() => onToggleStatus(alarm.id, 'pending')}
              className="p-1.5 bg-slate-50 border border-slate-150 hover:bg-emerald-55 text-emerald-600 rounded-lg transition"
              title="Re-activar alarma"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onDelete(alarm.id)}
            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
            title="Eliminar registro"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Active alarms category */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Futuras Alarmas Activas ({futureAlarms.length})</h3>
        {futureAlarms.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-150 text-slate-400 text-sm">
            No tienes alarmas programadas activas.
          </div>
        ) : (
          <div className="space-y-2">
            {futureAlarms.map(renderAlarmCard)}
          </div>
        )}
      </div>

      {/* Historical alarms category */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Historial e Históricas ({historicalAlarms.length})</h3>
        {historicalAlarms.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-150 text-slate-400 text-sm">
            Usted no posee alarmas pasadas registradas de momento.
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {historicalAlarms.map(renderAlarmCard)}
          </div>
        )}
      </div>
    </div>
  );
}
