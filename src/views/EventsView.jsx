import React, { useEffect, useState, useRef } from 'react';
import Icon from '../components/Icon.jsx';

const QATIK_ZONES = ['Winter Nexus', 'Yeti Cave', 'Wolf Cave', 'Dark Chapel'];
// Winter Nexus started on a known date; we calculate from there
const QATIK_REFERENCE_DATE = new Date('2025-12-03T00:00:00Z'); // Winter Nexus starts Dec 3, 2025 EST (midnight)

const getQatikZoneInfo = () => {
  const parts = NY_NOW_PARTS();
  const today = new Date(parts.year, parts.month - 1, parts.day);
  const refDateUTC = new Date('2025-12-03T05:00:00Z'); // Dec 3, 2025 00:00 EST = 05:00 UTC
  const daysSinceRef = Math.floor((today - refDateUTC) / (1000 * 60 * 60 * 24));
  const zoneIndex = (daysSinceRef % 4 + 4) % 4; // handle negative mod
  const currentZone = QATIK_ZONES[zoneIndex];
  
  // Calculate next midnight EST
  const nextMidnightEST = new Date(parts.year, parts.month - 1, parts.day + 1);
  const now = new Date();
  const secondsUntilMidnightEST = (nextMidnightEST - now) / 1000;
  
  const hours = Math.floor(secondsUntilMidnightEST / 3600);
  const minutes = Math.floor((secondsUntilMidnightEST % 3600) / 60);
  const seconds = Math.floor(secondsUntilMidnightEST % 60);
  
  return { currentZone, hours, minutes, seconds, zoneIndex };
};

const EVENT_DEFS = [
  { id: 'eggs_14_30', label: 'Eggs', hour: 14, minute: 30 },
  { id: 'eggs_18_30', label: 'Eggs', hour: 18, minute: 30 },
  { id: 'qatik_daily', label: 'Qatik Daily', isDaily: true },
];

const NY_NOW_PARTS = () => {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const parts = fmt.formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    hour: parseInt(parts.hour, 10),
    minute: parseInt(parts.minute, 10),
    second: parseInt(parts.second, 10),
  };
};

const storageKey = 'stone_eye_event_alerts_v1';

const loadState = () => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { enabled: {}, lastNotified: {} };
    return JSON.parse(raw);
  } catch (e) {
    return { enabled: {}, lastNotified: {} };
  }
};

const saveState = (s) => localStorage.setItem(storageKey, JSON.stringify(s));

const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const p = await Notification.requestPermission();
  return p === 'granted';
};

const calculateCountdown = (eventHour, eventMinute) => {
  const parts = NY_NOW_PARTS();
  let targetHour = eventHour;
  let targetMinute = eventMinute;
  
  // Calculate seconds until target time
  const nowTotalSeconds = parts.hour * 3600 + parts.minute * 60 + parts.second;
  const targetTotalSeconds = targetHour * 3600 + targetMinute * 60;
  
  let secondsUntil = targetTotalSeconds - nowTotalSeconds;
  
  // If event time has passed today, calculate for tomorrow
  if (secondsUntil <= 0) {
    secondsUntil += 24 * 3600; // add 24 hours
  }
  
  const hours = Math.floor(secondsUntil / 3600);
  const minutes = Math.floor((secondsUntil % 3600) / 60);
  const seconds = secondsUntil % 60;
  
  return { hours, minutes, seconds };
};

const EventsView = () => {
  const [state, setState] = useState(() => loadState());
  const [permission, setPermission] = useState(Notification.permission || 'default');
  const [countdowns, setCountdowns] = useState(() => {
    const cd = {};
    EVENT_DEFS.forEach(ev => {
      if (ev.isDaily) {
        const qatik = getQatikZoneInfo();
        cd[ev.id] = { hours: qatik.hours, minutes: qatik.minutes, seconds: qatik.seconds };
      } else {
        cd[ev.id] = calculateCountdown(ev.hour, ev.minute);
      }
    });
    return cd;
  });
  const [qatikZone, setQatikZone] = useState(() => getQatikZoneInfo().currentZone);
  const timerRef = useRef(null);

  useEffect(() => {
    // Persist changes
    saveState(state);
  }, [state]);

  useEffect(() => {
    // Update countdowns every second and check for notifications every minute
    const tick = async () => {
      // Update countdowns
      const newCountdowns = {};
      EVENT_DEFS.forEach(ev => {
        if (ev.isDaily) {
          const qatik = getQatikZoneInfo();
          newCountdowns[ev.id] = { hours: qatik.hours, minutes: qatik.minutes, seconds: qatik.seconds };
          setQatikZone(qatik.currentZone);
        } else {
          newCountdowns[ev.id] = calculateCountdown(ev.hour, ev.minute);
        }
      });
      setCountdowns(newCountdowns);

      // Check for notifications (every minute, on the minute)
      const parts = NY_NOW_PARTS();
      if (parts.second === 0) {
        const todayKey = `${parts.year}-${String(parts.month).padStart(2,'0')}-${String(parts.day).padStart(2,'0')}`;

        for (const ev of EVENT_DEFS) {
          if (!state.enabled[ev.id]) continue;

          let shouldNotify = false;
          let notificationTitle = '';
          let notificationBody = '';

          if (ev.isDaily) {
            // Qatik Daily: notify at midnight (00:00 EST)
            if (parts.hour === 0 && parts.minute === 0) {
              const last = state.lastNotified && state.lastNotified[ev.id];
              if (last !== todayKey) {
                shouldNotify = true;
                const qatik = getQatikZoneInfo();
                notificationTitle = `${ev.label}: ${qatik.currentZone}`;
                notificationBody = `Zone for today is ${qatik.currentZone}`;
              }
            }
          } else {
            // Eggs: notify 5 minutes before
            const targetHour = ev.hour;
            const targetMinute = ev.minute - 5;
            if (targetMinute < 0) continue;
            
            if (parts.hour === targetHour && parts.minute === targetMinute) {
              const last = state.lastNotified && state.lastNotified[ev.id];
              if (last !== todayKey) {
                shouldNotify = true;
                notificationTitle = `${ev.label} in 5 minutes`;
                notificationBody = `${ev.label} starts at ${String(ev.hour).padStart(2,'0')}:${String(ev.minute).padStart(2,'0')} Eastern`;
              }
            }
          }

          if (shouldNotify) {
            if (Notification.permission !== 'granted') {
              const granted = await requestNotificationPermission();
              setPermission(granted ? 'granted' : Notification.permission);
              if (!granted) continue;
            }

            try {
              new Notification(notificationTitle, { body: notificationBody });
            } catch (err) {
              console.warn('Notification failed', err);
            }

            setState(prev => ({
              ...prev,
              lastNotified: { ...(prev.lastNotified || {}), [ev.id]: todayKey }
            }));
          }
        }
      }
    };

    timerRef.current = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timerRef.current);
  }, [state.enabled]);

  const toggle = async (id) => {
    // If enabling and permission not granted yet, request on first enable
    if (!state.enabled[id] && Notification && Notification.permission !== 'granted') {
      const granted = await requestNotificationPermission();
      setPermission(granted ? 'granted' : Notification.permission);
      if (!granted) {
        // user denied; do not enable
        setState(prev => ({ ...prev, enabled: { ...prev.enabled, [id]: false } }));
        return;
      }
    }
    setState(prev => ({ ...prev, enabled: { ...prev.enabled, [id]: !prev.enabled[id] } }));
  };

  return (
    <div className="p-4 md:p-8 pb-8 h-full overflow-y-auto">
      <h2 className="text-2xl font-light text-white mb-4">Events</h2>
      <div className="space-y-3">
        {EVENT_DEFS.map(ev => {
          const cd = countdowns[ev.id] || { hours: 0, minutes: 0, seconds: 0 };
          return (
            <div key={ev.id} className="flex items-center justify-between bg-slate-900/40 rounded p-4 border border-slate-800">
              <div className="flex-1">
                <div className="font-bold text-slate-200">{ev.label}</div>
                {ev.isDaily ? (
                  <div className="text-xs text-slate-500">Current zone: <span className="text-indigo-400 font-semibold">{qatikZone}</span></div>
                ) : (
                  <div className="text-xs text-slate-500">Daily at {String(ev.hour).padStart(2,'0')}:{String(ev.minute).padStart(2,'0')} Eastern</div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold text-indigo-400">
                    {String(cd.hours).padStart(2,'0')}:{String(cd.minutes).padStart(2,'0')}:{String(cd.seconds).padStart(2,'0')}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {ev.isDaily ? 'until reset' : 'until event'}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-slate-400">Alerts</label>
                  <button
                    onClick={() => toggle(ev.id)}
                    className={`px-3 py-1 rounded ${state.enabled[ev.id] ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                  >
                    {state.enabled[ev.id] ? 'On' : 'Off'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 text-xs text-slate-500">
        Notifications permission: <span className="font-mono">{permission}</span>
      </div>
    </div>
  );
};

export default EventsView;
