/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { AppSettings, SoundType } from '../types';
import { Volume2, Play, Square, Timer, Check, Info } from 'lucide-react';
import { playSyntheticAlarm, ActiveSound } from '../utils/audio';

interface SettingsPanelProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

export default function SettingsPanel({ settings, onSaveSettings }: SettingsPanelProps) {
  const [soundType, setSoundType] = useState<SoundType>(settings.soundType);
  const [soundDuration, setSoundDuration] = useState<number>(settings.soundDuration);
  const [snoozeDuration, setSnoozeDuration] = useState<number>(settings.snoozeDuration);
  const [testSoundInstance, setTestSoundInstance] = useState<ActiveSound | null>(null);

  const handleTestSound = (selectedType: SoundType) => {
    // If already playing some test sound, stop it
    if (testSoundInstance) {
      testSoundInstance.stop();
      setTestSoundInstance(null);
      return;
    }

    const sound = playSyntheticAlarm(selectedType);
    setTestSoundInstance(sound);

    // Auto-stop preview after 3 seconds so it's not annoying
    setTimeout(() => {
      sound.stop();
      setTestSoundInstance(prev => prev === sound ? null : prev);
    }, 3000);
  };

  const handleStopTest = () => {
    if (testSoundInstance) {
      testSoundInstance.stop();
      setTestSoundInstance(null);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleStopTest();
    onSaveSettings({
      soundType,
      soundDuration,
      snoozeDuration,
    });
    alert('Configuración guardada exitosamente.');
  };

  const soundOptions = [
    { value: 'beep' as SoundType, label: 'Pitido Digital', desc: 'Clásica alarma electrónica rítmica y veloz.' },
    { value: 'chime' as SoundType, label: 'Campanilla Suave', desc: 'Arpegio armónico de campanas, ideal para un despertar pacífico.' },
    { value: 'siren' as SoundType, label: 'Modulador Alerta', desc: 'Sirena oscilante de alta intensidad, imposible de ignorar.' },
    { value: 'retro' as SoundType, label: 'Arcade Sintetizador', desc: 'Melodía retro inspirada en consolas de 8-bits.' },
  ];

  const durationOptions = [
    { value: 10, label: '10 Segundos' },
    { value: 20, label: '20 Segundos' },
    { value: 30, label: '30 Segundos' },
    { value: 60, label: '1 Minuto' },
    { value: 120, label: '2 Minutos' },
    { value: 0, label: 'Hasta apagar manualmente' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Volume2 className="w-5 h-5 text-emerald-500" />
        <h3 className="font-semibold text-slate-800 text-base">Tonos y Temporizador de Alerta</h3>
      </div>

      {/* Sound Selection Grid */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-slate-700 block">Tipo de Sonido</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {soundOptions.map((opt) => {
            const isSelected = soundType === opt.value;
            const isTestingThis = testSoundInstance && soundType === opt.value;

            return (
              <div
                key={opt.value}
                onClick={() => {
                  setSoundType(opt.value);
                  handleStopTest();
                }}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  isSelected 
                    ? 'border-emerald-500 bg-emerald-50/20 shadow-sm' 
                    : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-sm ${isSelected ? 'text-emerald-800' : 'text-slate-800'}`}>
                      {opt.label}
                    </span>
                    {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-sans">{opt.desc}</p>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSoundType(opt.value);
                      handleTestSound(opt.value);
                    }}
                    className={`flex items-center gap-1 py-1 px-2.5 rounded-lg border text-xs font-semibold select-none transition ${
                      isTestingThis
                        ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    {isTestingThis ? (
                      <>
                        <Square className="w-3 h-3 fill-rose-600" />
                        <span>Detener</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-slate-500" />
                        <span>Probar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alarm Sound Duration Dropdown */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Timer className="w-4 h-4 text-emerald-500" />
          <label>Duración de la alerta</label>
        </div>
        <select
          value={soundDuration}
          onChange={(e) => setSoundDuration(Number(e.target.value))}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white shadow-sm font-sans"
        >
          {durationOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-400 font-sans">
          Establece cuánto tiempo sonará de manera continua antes de apagarse automáticamente para no agotar la batería de tu dispositivo.
        </p>
      </div>

      {/* Snooze duration */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700 block">Intervalo de Posposición (Snooze)</label>
        <select
          value={snoozeDuration}
          onChange={(e) => setSnoozeDuration(Number(e.target.value))}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white shadow-sm font-sans"
        >
          <option value={1}>1 Minuto (Prueba rápida)</option>
          <option value={5}>5 Minutos (Recomendado)</option>
          <option value={10}>10 Minutos</option>
          <option value={15}>15 Minutos</option>
          <option value={30}>30 Minutos</option>
        </select>
      </div>

      {/* Hardware constraints info */}
      <div className="p-3 bg-blue-50/50 border border-blue-105 rounded-xl flex items-start gap-2 text-[11px] text-blue-800 leading-relaxed font-sans">
        <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <strong>Funcionamiento en segundo plano:</strong> Debido a limitaciones de seguridad de los navegadores web modernos, mantenga esta pestaña abierta para garantizar el sonido puntual de las alarmas locales.
        </div>
      </div>

      {/* Action Buttons */}
      <button
        type="submit"
        className="w-full py-3.5 px-4 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition shadow-sm active:scale-98"
      >
        Guardar Configuración
      </button>
    </form>
  );
}
