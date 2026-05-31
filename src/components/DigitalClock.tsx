/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';

export default function DigitalClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('es-ES', options);
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 px-8 bg-amber-50/40 rounded-2xl border border-amber-100 shadow-sm max-w-md mx-auto">
      <div className="flex items-center gap-3 text-amber-500 font-medium text-sm tracking-wider uppercase mb-1">
        <Clock id="clock-icon" className="w-4 h-4" />
        <span>Hora del Dispositivo</span>
      </div>
      
      <div className="text-4xl md:text-5xl font-mono font-bold text-slate-800 tracking-tight select-none">
        {formatTime(now)}
      </div>
      
      <div className="flex items-center gap-2 mt-2 text-slate-500 text-sm font-sans">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        <span className="capitalize">{formatDate(now)}</span>
      </div>
    </div>
  );
}
