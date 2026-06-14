import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  calculateTimeline,
  minimumAppointmentDateTime,
  toLocalDateTimeInputValue,
} from '../src/pages/sharedHelpers.js';

test('datetime-local values preserve local wall-clock time', () => {
  const value = toLocalDateTimeInputValue(new Date(2026, 5, 14, 20, 30, 0));
  assert.equal(value, '2026-06-14T20:30');
});

test('appointment minimum is a valid datetime-local value', () => {
  assert.match(minimumAppointmentDateTime(30), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
});

test('a confirmed stage date resequences every later stage', () => {
  const stages = [
    { id: 1, name: 'One', days: 2 },
    { id: 2, name: 'Two', days: 3 },
    { id: 3, name: 'Three', days: 1 },
  ];
  const timeline = calculateTimeline('2026-06-01', {
    2: { startDate: '2026-06-10', durationDays: 3, manualOverride: true },
  }, stages);

  assert.equal(timeline[2].startDate, '2026-06-10');
  assert.equal(timeline[2].endDate, '2026-06-13');
  assert.equal(timeline[3].startDate, '2026-06-14');
});

test('admin timeline does not present automatic estimates as a gantt chart', async () => {
  const source = await readFile(new URL('../src/pages/admin/ClientHub.jsx', import.meta.url), 'utf8');
  assert.equal(source.includes('Gantt Visual Timeline'), false);
  assert.equal(source.includes('Automatic dates are planning estimates.'), true);
  assert.equal(source.includes('min={earliestStartDate || undefined}'), true);
});

test('site visit callable prevents rescheduling a completed survey and links to the project', async () => {
  const source = await readFile(new URL('../stage-functions/index.js', import.meta.url), 'utf8');
  assert.equal(source.includes("project.siteVisit?.status === 'completed'"), true);
  assert.equal(source.includes('/portal?projectId=${encodeURIComponent(projectId)}&tab=overview'), true);
  assert.equal(source.includes('Access note: ${notes}'), true);
});
