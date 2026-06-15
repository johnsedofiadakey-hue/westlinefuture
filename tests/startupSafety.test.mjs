import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('application startup does not unregister workers or force a reload', async () => {
  const source = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');

  assert.equal(
    source.includes('navigator.serviceWorker.getRegistrations'),
    false,
    'startup must not unregister the Firebase Messaging worker'
  );
  assert.equal(
    source.includes('.then(() => window.location.reload())'),
    false,
    'startup must not automatically reload after service-worker cleanup'
  );
});

test('role routing does not send unresolved profiles through redirect chains', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

  assert.equal(
    source.includes("if (user?.role)"),
    true,
    'login routing must wait for a resolved role'
  );
  assert.equal(
    source.includes('<RoleResolutionError onLogout={handleLogout} error={userProfileError} />'),
    true,
    'unresolved profiles must stop on a stable access screen'
  );
});
