/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Bell, List, Clock, Settings, AlertCircle, Sparkles, ShieldCheck, Smartphone, Eye, EyeOff, ShieldAlert, Zap, Volume2, Sun } from 'lucide-react';
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

  // PWA installation state controls
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Wake Lock & Notification System States
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<any>(null);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');

  // Load alarms & settings from local offline storage initially
  useEffect(() => {
    // Check initial notification state
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Check if currently running in fullscreen standalone mode
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

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

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User installed the PWA app');
      setShowInstallPrompt(false);
    }
    setDeferredPrompt(null);
  };

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

  // Wake Lock control handlers
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        const lock = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current = lock;
        setWakeLockActive(true);
        console.log('Wake Lock holding screen active');
        
        lock.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      } catch (err) {
        console.warn('Failed to lock screen wakefulness', err);
      }
    } else {
      alert('Tu navegador o teléfono no soporta mantener la pantalla encendida automáticamente de forma programada.');
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (e) {
        console.warn(e);
      }
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Tu navegador no soporta notificaciones locales en sistema.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        alert('¡Excelente! Las notificaciones del sistema han sido autorizadas para sonar en segundo plano.');
      }
    } catch (e) {
      console.error('Failed to request notification permission', e);
    }
  };

  useEffect(() => {
    // Re-acquire wake lock if active when returning to visibility
    const handleVisibilityChange = async () => {
      if (wakeLockActive && document.visibilityState === 'visible' && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.warn('Failed to re-acquire wake lock:', err);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [wakeLockActive]);

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

        // Disparar Notificación de Sistema (Rompe bloqueo de segundo plano del teléfono)
        if ('Notification' in window && Notification.permission === 'granted') {
          const bodyText = matchingAlarm.messageType === 'voice'
            ? 'Tienes una alarma por voz grabada activa ahora'
            : `Alarma: "${matchingAlarm.messageText}"`;

          const notificationOptions = {
            body: bodyText,
            icon: '/icon.png',
            badge: '/icon.png',
            tag: matchingAlarm.id,
            vibrate: [200, 100, 200, 100, 200, 100, 200],
            requireInteraction: true // mantiene vivo el banner visible en el bloqueo hasta desestimarlo
          };

          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification('⏰ ¡Alarma Sonando!', notificationOptions);
            });
          } else {
            new Notification('⏰ ¡Alarma Sonando!', notificationOptions);
          }
        }
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

        {/* Banner de Instalación (PWA) */}
        {!isStandalone && (
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-150 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex gap-3 items-start">
              <img 
                src="/icon.png" 
                alt="Logo reloj" 
                className="w-10 h-10 rounded-xl shadow-xs border border-emerald-200/50 bg-white p-1 hover:rotate-12 transition-transform duration-300"
                referrerPolicy="no-referrer" 
              />
              <div>
                <h4 className="font-extrabold text-sm text-slate-800">Instalar aplicación en tu teléfono</h4>
                <p className="text-xs text-slate-500 font-sans mt-0.5 leading-relaxed">
                  Agrégala como acceso directo con su logo de reloj para abrirla sin abrir el navegador y para que funcione 100% offline.
                </p>
              </div>
            </div>
            
            <div className="shrink-0 flex items-center justify-end">
              {showInstallPrompt ? (
                <button
                  type="button"
                  onClick={handleInstallApp}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  Descargar / Instalar
                </button>
              ) : (
                <div className="text-[11px] text-slate-500 font-sans leading-tight max-w-[200px] border-l-2 border-emerald-200 pl-2">
                  En iOS/Safari, pulsa <span className="font-semibold text-emerald-700">Compartir ↑</span> y luego <span className="font-semibold text-emerald-700">Añadir a pantalla de inicio ⊞</span>.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Digital Clock Component */}
        <DigitalClock />

        {/* Panel de Control de Segundo Plano y Vigilia */}
        <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 border border-slate-800 shadow-lg space-y-4" id="background-wake-control">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-extrabold text-sm tracking-wide text-white uppercase font-sans">Vigilia y Alertas en Segundo Plano</h3>
            </div>
            <span className="flex h-2 w-2 relative">
              {wakeLockActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${wakeLockActive ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
            </span>
          </div>

          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            Los navegadores suspenden los procesos inactivos para ahorrar batería. Sigue estos pasos para garantizar que tus alarmas suenen perfectamente si el celular está bloqueado.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Control 1: Wake Lock */}
            <div className="p-3 bg-slate-800/60 hover:bg-slate-800 rounded-2xl border border-slate-700/50 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Sun className="w-4 h-4 text-emerald-400" />
                  <span>Modo "Mesita de Noche"</span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans mt-1 leading-normal">
                  Mantiene la aplicación activa impidiendo que tu celular se apague o suspenda el proceso de alarma.
                </p>
              </div>
              <button
                type="button"
                id="btn-wake-toggle"
                onClick={wakeLockActive ? releaseWakeLock : requestWakeLock}
                className={`w-full py-2 px-3 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                  wakeLockActive 
                    ? 'bg-rose-600 text-white hover:bg-rose-700' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {wakeLockActive ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Desactivar Modo Activo</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Evitar que se Apague</span>
                  </>
                )}
              </button>
            </div>

            {/* Control 2: Notification Permission */}
            <div className="p-3 bg-slate-800/60 hover:bg-slate-800 rounded-2xl border border-slate-700/50 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Alertas del Teléfono</span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans mt-1 leading-normal">
                  Permite lanzar alertas audibles nativas a tu pantalla de bloqueo incluso con la app cerrada o minimizada.
                </p>
              </div>
              <button
                type="button"
                id="btn-notif-toggle"
                onClick={requestNotificationPermission}
                disabled={notificationPermission === 'granted'}
                className={`w-full py-2 px-3 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                  notificationPermission === 'granted'
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/20 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {notificationPermission === 'granted' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Alertas Habilitadas</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Habilitar Alertas</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-3 text-[11px] text-slate-400 font-sans space-y-2">
            <div className="flex items-center gap-1 font-bold text-slate-300">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Instrucciones para un funcionamiento 100% confiable:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-400 leading-normal">
              <li>
                <span className="font-semibold text-emerald-400">¿Cerrar u Ocultar?</span> Puedes minimizar la aplicación si habilitas <strong className="text-white">Alertas del Teléfono</strong> arriba. La alarma sonará a través de un aviso oficial del sistema operativo.
              </li>
              <li>
                <span className="font-semibold text-emerald-400">iOS (Safari / iPhone):</span> Es sumamente recomendado <strong className="text-white">Instalar la App</strong> (Compartir → Añadir a pantalla de inicio). Esto evita que el navegador desactive la app por inactividad.
              </li>
              <li>
                <span className="font-semibold text-emerald-400">Android (Chrome / MIUI):</span> Mantén presionado el icono de la App en tu pantalla de inicio → <strong className="text-white">Información de la aplicación</strong> → <strong className="text-white">Ahorro de batería</strong> y selecciona <strong className="text-white">Sin restricciones</strong>. Esto permite temporizadores indefinidos de fondo.
              </li>
              <li>
                <span className="font-semibold text-emerald-400">¿Celular apagado por completo?</span> Si el teléfono está apagado físicamente, ningún software web puede ejecutarse. Te recomendamos dejar el teléfono encendido o en reposo sobre un soporte de carga.
              </li>
            </ul>
          </div>
        </div>

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
