/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Bell, List, Clock, Settings, AlertCircle, Sparkles } from 'lucide-react';
import { Alarm, AppSettings } from './types';
import DigitalClock from './components/DigitalClock';
import AlarmForm from './components/AlarmForm';
import AlarmList from './components/AlarmList';
import FutureAlarms from './components/FutureAlarms';
import SettingsPanel from './components/SettingsPanel';
import AlarmAlert from './components/AlarmAlert';

// Default custom settings for the alarm engine
const DEFAULT_SETTINGS: AppSettings = {
  soundType: 'chime',
  soundDuration: 30, // 30 seconds
  snoozeDuration: 5,  // 5 minutes
};

// Seed initial alarm so the system has immediate visual guidance when first opened
const INITIAL_ALARM_SEED = (): Alarm[] => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');
  
  return [
    {
      id: 'seed-alarm-1',
      date: `${yyyy}-${mm}-${dd}`,
      time: '08:30',
      messageType: 'text',
      messageText: '¡Comenzar el día con energía y gratitud! ☕',
      status: 'pending',
      createdAt: Date.now()
    }
  ];
};

export default function App() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'future' | 'settings'>('list');
  const [ringingAlarmId, setRingingAlarmId] = useState<string | null>(null);

  // Load alarms & settings from local offline storage initially
  useEffect(() => {
    try {
      const savedAlarms = localStorage.getItem('local_alarms');
      if (savedAlarms) {
        setAlarms(JSON.parse(savedAlarms));
      } else {
        const seed = INITIAL_ALARM_SEED();
        setAlarms(seed);
        localStorage.setItem('local_alarms', JSON.stringify(seed));
      }

      const savedSettings = localStorage.getItem('local_alarm_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (e) {
      console.error('Failed to load storage values', e);
    }
  }, []);

  // Persistent storage synchronizer helper
  const saveAlarms = (updatedAlarms: Alarm[]) => {
    setAlarms(updatedAlarms);
    try {
      localStorage.setItem('local_alarms', JSON.stringify(updatedAlarms));
    } catch (e) {
      console.error('Failed to write alarms to local storage', e);
    }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('local_alarm_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to write settings to local storage', e);
    }
  };

  // Background second-level scheduler tracking system time triggers
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hh}:${min}`;

      // Check for any active alarm scheduled right now (exclusive of already ringing alarms)
      const matchingAlarm = alarms.find(a => 
        a.status === 'pending' && 
        a.date === todayStr && 
        a.time === currentTimeStr
      );

      if (matchingAlarm && ringingAlarmId === null) {
        // Switch matching alarm state to ringing
        const updated = alarms.map(a => {
          if (a.id === matchingAlarm.id) {
            return { ...a, status: 'ringing' as const };
          }
          return a;
        });
        saveAlarms(updated);
        setRingingAlarmId(matchingAlarm.id);
      }
    };

    const intervalTimer = setInterval(checkSchedule, 1000);
    return () => clearInterval(intervalTimer);
  }, [alarms, ringingAlarmId]);

  // Alarm Action Management
  const addAlarm = (newAlarmData: Omit<Alarm, 'id' | 'createdAt' | 'status'>) => {
    const newAlarm: Alarm = {
      ...newAlarmData,
      id: `alarm-${Date.now()}`,
      status: 'pending',
      createdAt: Date.now()
    };
    const updated = [...alarms, newAlarm];
    saveAlarms(updated);
    setActiveTab('list');
  };

  const deleteAlarm = (id: string) => {
    const updated = alarms.filter(a => a.id !== id);
    saveAlarms(updated);
    if (ringingAlarmId === id) {
      setRingingAlarmId(null);
    }
  };

  const updateAlarm = (id: string, updatedFields: Omit<Alarm, 'id' | 'createdAt' | 'status'>) => {
    const updated = alarms.map(a => {
      if (a.id === id) {
        return {
          ...a,
          ...updatedFields,
          status: 'pending' as const // reset to pending so it rings
        };
      }
      return a;
    });
    saveAlarms(updated);
  };

  const toggleAlarmStatus = (id: string, newStatus: 'pending' | 'dismissed') => {
    const updated = alarms.map(a => {
      if (a.id === id) {
        return { ...a, status: newStatus };
      }
      return a;
    });
    saveAlarms(updated);
  };

  const handleDismissAlarm = (id: string) => {
    const updated = alarms.map(a => {
      if (a.id === id) {
        return { ...a, status: 'dismissed' as const };
      }
      return a;
    });
    saveAlarms(updated);
    setRingingAlarmId(null);
  };

  // Snooze shifts the specific trigger target time forward by Settings.snoozeDuration
  const handleSnoozeAlarm = (id: string) => {
    const alarm = alarms.find(a => a.id === id);
    if (!alarm) return;

    const now = new Date();
    const snoozedDate = new Date(now.getTime() + settings.snoozeDuration * 60 * 1000);

    const yyyy = snoozedDate.getFullYear();
    const mm = String(snoozedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(snoozedDate.getDate()).padStart(2, '0');
    const futureDateStr = `${yyyy}-${mm}-${dd}`;

    const hh = String(snoozedDate.getHours()).padStart(2, '0');
    const min = String(snoozedDate.getMinutes()).padStart(2, '0');
    const futureTimeStr = `${hh}:${min}`;

    const updated = alarms.map(a => {
      if (a.id === id) {
        return {
          ...a,
          date: futureDateStr,
          time: futureTimeStr,
          status: 'pending' as const
        };
      }
      return a;
    });

    saveAlarms(updated);
    setRingingAlarmId(null);
    alert(`Alarma de las ${alarm.time} pospuesta por ${settings.snoozeDuration} minutos.`);
  };

  const ringingAlarm = alarms.find(a => a.id === ringingAlarmId);

  return (
    <div className="min-h-screen bg-[#FDFCF7] text-slate-800 font-sans flex flex-col antialiased">
      
      {/* Alarm Alert Overlays (Locks screen when ringing) */}
      {ringingAlarm && (
        <AlarmAlert
          alarm={ringingAlarm}
          settings={settings}
          onDismiss={handleDismissAlarm}
          onSnooze={handleSnoozeAlarm}
        />
      )}

      {/* Main Structural Layout Container */}
      <main className="flex-grow w-full max-w-2xl mx-auto px-4 py-8 sm:px-6 flex flex-col space-y-8">
        
        {/* Header Visual Title & Slogan */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest leading-none">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span>Sistema Offline Autónomo</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
            Alarmas
          </h1>
          <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
            Programación horaria inteligente protegida localmente en el navegador, sin necesidad de conexión a internet.
          </p>
        </div>

        {/* Live Digital Clock Component */}
        <DigitalClock />

        {/* Navigation Grid of the Four Mandatory Buttons */}
        <div className="grid grid-cols-2 gap-3" id="navigation-dashboard">
          
          {/* First Button: Cargar nueva alarma */}
          <button
            type="button"
            id="nav-btn-form"
            onClick={() => setActiveTab('form')}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition ${
              activeTab === 'form'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300 ring-offset-2'
                : 'bg-white text-slate-700 border-slate-150 hover:border-slate-250 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <Bell className={`w-5 h-5 ${activeTab === 'form' ? 'text-white' : 'text-emerald-500'}`} />
            <span className="font-semibold text-xs tracking-tight">Cargar nueva alarma</span>
          </button>

          {/* Second Button: Lista de alarmas */}
          <button
            type="button"
            id="nav-btn-list"
            onClick={() => setActiveTab('list')}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition ${
              activeTab === 'list'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300 ring-offset-2'
                : 'bg-white text-slate-700 border-slate-150 hover:border-slate-250 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <List className={`w-5 h-5 ${activeTab === 'list' ? 'text-white' : 'text-emerald-500'}`} />
            <span className="font-semibold text-xs tracking-tight">Lista de alarmas</span>
          </button>

          {/* Third Button: Futuras notificaciones */}
          <button
            type="button"
            id="nav-btn-future"
            onClick={() => setActiveTab('future')}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition ${
              activeTab === 'future'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300 ring-offset-2'
                : 'bg-white text-slate-700 border-slate-150 hover:border-slate-250 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <Clock className={`w-5 h-5 ${activeTab === 'future' ? 'text-white' : 'text-emerald-500'}`} />
            <span className="font-semibold text-xs tracking-tight">Futuras notificaciones</span>
          </button>

          {/* Fourth Button: Configuración de notificaciones */}
          <button
            type="button"
            id="nav-btn-settings"
            onClick={() => setActiveTab('settings')}
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300 ring-offset-2'
                : 'bg-white text-slate-700 border-slate-150 hover:border-slate-250 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-white' : 'text-emerald-500'}`} />
            <span className="font-semibold text-xs tracking-tight">Configuración de notificaciones</span>
          </button>

        </div>

        {/* Dynamic Display Panel container */}
        <section 
          id="active-panel-container"
          className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm min-h-[350px]"
        >
          {activeTab === 'form' && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Programar Nueva Alarma
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Ingresa una fecha, una hora precisa e indica la alerta (escríbela o grábala con tu voz).
              </p>
              <AlarmForm onSave={addAlarm} />
            </div>
          )}

          {activeTab === 'list' && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Todas Mis Alarmas
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Consulte las alarmas futuras vigentes con sus respectivos estados así como el histórico sonado.
              </p>
              <AlarmList 
                alarms={alarms} 
                onDelete={deleteAlarm} 
                onToggleStatus={toggleAlarmStatus} 
              />
            </div>
          )}

          {activeTab === 'future' && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Modificar Notificaciones Pendientes
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Seleccione cualquiera de sus futuras alertas planificadas y modifique su fecha, hora o mensaje de inmediato.
              </p>
              <FutureAlarms 
                alarms={alarms} 
                onUpdate={updateAlarm} 
                onDelete={deleteAlarm} 
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Ajustes de Alertas
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Sintoniza el sintetizador de sonido, la duración máxima en reproducción y el intervalo de retraso de tus alarmas.
              </p>
              <SettingsPanel 
                settings={settings} 
                onSaveSettings={handleSaveSettings} 
              />
            </div>
          )}
        </section>

      </main>

      {/* Footer Branding Credit */}
      <footer className="py-6 text-center border-t border-slate-100 bg-white">
        <p className="text-xs font-medium text-slate-400 font-sans">
          Aplicación Alarmas © 2026 • Funcionalidad 100% Offline
        </p>
      </footer>
    </div>
  );
}
