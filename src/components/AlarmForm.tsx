/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Calendar, Clock, MessageSquare, Mic, Square, Play, Trash2, Check, AlertCircle } from 'lucide-react';
import { Alarm } from '../types';

interface AlarmFormProps {
  onSave: (alarm: Omit<Alarm, 'id' | 'createdAt' | 'status'>) => void;
  onCancel?: () => void;
}

export default function AlarmForm({ onSave, onCancel }: AlarmFormProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'voice'>('text');
  const [messageText, setMessageText] = useState('');
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceAudioBase64, setVoiceAudioBase64] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Initialize form with today's date and current time + 1 hour
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);

    const future = new Date(today.getTime() + 60 * 60 * 1000); // +1 hour
    const hh = String(future.getHours()).padStart(2, '0');
    const min = String(future.getMinutes()).padStart(2, '0');
    setTime(`${hh}:${min}`);
  }, []);

  // Timer effect for voice recording duration
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 15) { // Limit voice memo to 15 seconds to save space
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Apply quick offset preset helper
  const applyPresetMinutes = (additionalMinutes: number) => {
    const now = new Date();
    const presetDate = new Date(now.getTime() + additionalMinutes * 60 * 1000);
    
    const yyyy = presetDate.getFullYear();
    const mm = String(presetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(presetDate.getDate()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);

    const hh = String(presetDate.getHours()).padStart(2, '0');
    const min = String(presetDate.getMinutes()).padStart(2, '0');
    setTime(`${hh}:${min}`);
  };

  // Recording management
  const startRecording = async () => {
    setRecordingError(null);
    audioChunksRef.current = [];
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta grabación de voz.');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert to Base64 to save on localStorage
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setVoiceAudioBase64(base64String);
        };

        // Stop all tracks in stream to release microphone icon
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Error starting media recorder:', err);
      let errMsg = 'No se pudo acceder al micrófono. Por favor, otorga los permisos necesarios.';
      if (err.message && err.message.includes('not supported')) {
        errMsg = 'Grabación de voz no soportada por el navegador.';
      }
      setRecordingError(errMsg);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = () => {
    setVoiceAudioBase64(null);
    setRecordingSeconds(0);
  };

  const playPreview = () => {
    if (voiceAudioBase64 && audioPreviewRef.current) {
      audioPreviewRef.current.currentTime = 0;
      audioPreviewRef.current.play();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      alert('Favor de proveer fecha y horario para la alarma.');
      return;
    }

    if (messageType === 'text' && !messageText.trim()) {
      alert('Favor de escribir un mensaje para la alarma.');
      return;
    }

    if (messageType === 'voice' && !voiceAudioBase64) {
      alert('Favor de grabar un mensaje de voz o cambiar a mensaje escrito.');
      return;
    }

    onSave({
      date,
      time,
      messageType,
      messageText: messageType === 'text' ? messageText.trim() : undefined,
      voiceAudio: messageType === 'voice' ? voiceAudioBase64! : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date & Time Picker Group */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Selector */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>Seleccionar Fecha</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white shadow-sm font-sans"
            required
          />
        </div>

        {/* Time Selector */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span>Seleccionar Horario</span>
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white shadow-sm font-mono text-base"
            required
          />
        </div>
      </div>

      {/* Presets Row to speed up setting */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">Atajos rápidos (sumar tiempo)</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyPresetMinutes(5)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition"
          >
            +5 min
          </button>
          <button
            type="button"
            onClick={() => applyPresetMinutes(15)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition"
          >
            +15 min
          </button>
          <button
            type="button"
            onClick={() => applyPresetMinutes(30)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition"
          >
            +30 min
          </button>
          <button
            type="button"
            onClick={() => applyPresetMinutes(60)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition"
          >
            +1 hora
          </button>
          <button
            type="button"
            onClick={() => applyPresetMinutes(1440)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition"
          >
            Mañana a esta hora
          </button>
        </div>
      </div>

      {/* Message Type Tabs */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700 block">Tipo de Alerta</label>
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setMessageType('text')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              messageType === 'text'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Mensaje Escrito</span>
          </button>
          <button
            type="button"
            onClick={() => setMessageType('voice')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              messageType === 'voice'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Grabar por Voz</span>
          </button>
        </div>
      </div>

      {/* Written Message Area */}
      {messageType === 'text' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 block">Texto del Mensaje</label>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Ej. Tomar medicamento diario o Preparar las llaves..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white shadow-sm min-h-[100px] resize-none font-sans"
            maxLength={180}
            required={messageType === 'text'}
          />
          <div className="text-right text-xs text-slate-400">
            {messageText.length}/180 caracteres
          </div>
        </div>
      )}

      {/* Voice Recording Control Area */}
      {messageType === 'voice' && (
        <div className="p-5 border border-dashed border-slate-200 bg-slate-50 rounded-2xl flex flex-col items-center justify-center space-y-4">
          
          {/* Status Display */}
          <div className="flex flex-col items-center">
            {isRecording ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-full border-4 border-red-200 flex items-center justify-center animate-pulse bg-red-100">
                  <Mic className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-red-500 font-semibold text-sm">Grabando: {recordingSeconds}s / 15s Max</span>
              </div>
            ) : voiceAudioBase64 ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-300">
                  <Check className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-emerald-700 font-semibold text-sm">Voz Grabada Exitosamente</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400">
                  <Mic className="w-5 h-5" />
                </div>
                <span className="text-slate-500 font-medium text-sm">Haga clic abajo para iniciar grabación</span>
              </div>
            )}
          </div>

          {/* Recording Control Buttons */}
          <div className="flex items-center gap-3">
            {!isRecording && !voiceAudioBase64 && (
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition hover:shadow shadow-sm active:scale-95"
              >
                <Mic className="w-4 h-4" />
                <span>Grabar</span>
              </button>
            )}

            {isRecording && (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500 text-white font-medium animate-pulse hover:bg-red-600 transition shadow-sm active:scale-95"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Detener ({recordingSeconds}s)</span>
              </button>
            )}

            {voiceAudioBase64 && !isRecording && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={playPreview}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition active:scale-95"
                >
                  <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                  <span>Reproducir</span>
                </button>
                <button
                  type="button"
                  onClick={deleteRecording}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 font-medium hover:bg-red-100 transition active:scale-95"
                  title="Eliminar grabación"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar</span>
                </button>
              </div>
            )}
          </div>

          {/* Error text if any */}
          {recordingError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs max-w-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{recordingError}</span>
            </div>
          )}

          {/* Audio Preview Hidden Ref */}
          {voiceAudioBase64 && (
            <audio ref={audioPreviewRef} src={voiceAudioBase64} className="hidden" />
          )}

          <p className="text-[11px] text-slate-400 text-center max-w-xs">
            Asegúrese de otorgar permisos de micrófono en el dispositivo. Límite de 15 segundos para optimizar espacio.
          </p>
        </div>
      )}

      {/* Submit / Cancel Buttons */}
      <div className="flex items-center gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 font-medium hover:bg-slate-50 transition shadow-sm"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold hover:shadow-lg hover:brightness-105 transition active:scale-98"
        >
          Guardar Alarma
        </button>
      </div>
    </form>
  );
}
