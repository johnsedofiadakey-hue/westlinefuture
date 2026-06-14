import { useState, useEffect } from 'react';

export function useWindowWidth() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

export const isMob = (w) => w <= 1024;
export const LIGHT_BG = `var(--bg-primary)`;
export const DARK_TEXT = `var(--accent-secondary)`;
export const AC = `var(--accent-secondary)`;

export function toLocalDateTimeInputValue(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function minimumAppointmentDateTime(minutesFromNow = 30) {
  return toLocalDateTimeInputValue(Date.now() + minutesFromNow * 60 * 1000);
}

/**
 * High-performance Project Timeline Dependency Resolution Engine.
 * Dynamically computes sequential starts, ends, and handles manual overrides.
 */
export function calculateTimeline(createdAt, currentTimeline = {}, applicableStages = []) {
  let start = createdAt ? new Date(createdAt.seconds ? createdAt.seconds * 1000 : createdAt) : new Date();
  if (isNaN(start.getTime())) start = new Date();

  const timeline = {};
  let currentStart = new Date(start);

  for (let i = 0; i < applicableStages.length; i++) {
    const stage = applicableStages[i];
    const sId = stage.id;

    const saved = currentTimeline[sId] || {};
    const duration = typeof saved.durationDays === 'number' ? saved.durationDays : (stage.days || 5);
    
    let stDate;
    if (saved.startDate && saved.manualOverride) {
      stDate = new Date(saved.startDate);
      if (isNaN(stDate.getTime())) stDate = new Date(currentStart);
    } else {
      stDate = new Date(currentStart);
    }

    const endDate = new Date(stDate);
    endDate.setDate(endDate.getDate() + duration);

    timeline[sId] = {
      stageId: sId,
      name: stage.name,
      short: stage.short || stage.name,
      color: stage.color || '#888',
      startDate: stDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      durationDays: duration,
      manualOverride: !!saved.manualOverride,
    };

    // The next stage starts sequentially the day after the current ends
    currentStart = new Date(endDate);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  return timeline;
}
