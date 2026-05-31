/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Alarm } from '../types';
import { Calendar, Clock, Edit2, Trash2, Check, X, AlertCircle } from 'lucide-react';
import AlarmForm from './AlarmForm';

interface FutureAlarmsProps {
  alarms: Alarm[];
  onUpdate: (id: string, updatedFields: Omit<Alarm, 'id' | 'createdAt' | 'status'>) => void;
  onDelete: (id: string) => void;
}

export default function FutureAlarms({ alarms, onUpdate, onDelete }: FutureAlarmsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter only pending/future alarms
  const futureAlarms = alarms.filter(a => a.status === 'pending').sort((a, b) => {
    const timeA = new Date(`${a.date}T${a.time}`).getTime();
    const timeB = new Date(`${b.date}T${b.time}`).getTime();
    return timeA - timeB;
  });

  const handleStartEdit = (id: string) => {
    setEditingId(id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = (id: string, updatedFields: Omit<Alarm, 'id' | 'createdAt' | 'status'>) => {
    onUpdate(id, updatedFields);
    setEditingId(null);
  };

  const formatAlarmDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Modificar Próximas Alarmas ({futureAlarms.length})
        </h3>
      </div>

      {futureAlarms.length === 0 ? (
        <div className="p-6 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-200 text-slate-400 text-sm">
          No tienes alarmas futuras programadas de momento para modificar.
        </div>
      ) : (
        <div className="space-y-3">
          {futureAlarms.map((alarm) => {
            const isEditing = editingId === alarm.id;

            return (
              <div 
                key={alarm.id} 
                className={`p-4 rounded-xl border transition ${
                  isEditing 
                    ? 'border-emerald-300 bg-white shadow-md' 
                    : 'border-slate-150 bg-white hover:border-slate-200 hover:shadow-sm'
                }`}
              >
                {!isEditing ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl font-mono font-bold text-slate-800">{alarm.time}</span>
                        <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-100 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span className="capitalize">{formatAlarmDate(alarm.date)}</span>
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 font-sans mt-1">
                        {alarm.messageType === 'voice' ? (
                          <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-50 border border-slate-100 rounded px-2 py-0.5 text-xs">
                            🔈 Mensaje por Voz grabado
                          </span>
                        ) : (
                          <span className="text-slate-700 italic font-medium bg-slate-50 border border-slate-100 rounded px-2.5 py-1 text-xs inline-block">
                            "{alarm.messageText}"
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        onClick={() => handleStartEdit(alarm.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Modificar</span>
                      </button>
                      <button
                        onClick={() => onDelete(alarm.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        title="Borrar Alarma"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-sm">
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editando Alarma de las {alarm.time}</span>
                      </div>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Prepopulated AlarmForm for Editing */}
                    <AlarmForm 
                      onSave={(fields) => handleSaveEdit(alarm.id, fields)} 
                      onCancel={handleCancelEdit}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
