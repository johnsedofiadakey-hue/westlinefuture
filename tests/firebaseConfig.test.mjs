import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('production builds retain the Westline Firebase fallback configuration', async () => {
  const source = await readFile(new URL('../src/lib/firebase.js', import.meta.url), 'utf8');

  assert.equal(source.includes('westlinefuture.firebaseapp.com'), true);
  assert.equal(source.includes('projectId: "westlinefuture"'), true);
  assert.equal(source.includes('appId: "1:552268332392:web:28a020be199bce1b47eadd"'), true);
  assert.equal(
    source.includes('const hasKeys = !!(\\n  env.VITE_FIREBASE_API_KEY'),
    false,
    'Firebase availability must be based on the resolved config, not environment variables alone'
  );
});

test('Firestore uses a transport compatible with restrictive client networks', async () => {
  const source = await readFile(new URL('../src/lib/firebase.js', import.meta.url), 'utf8');

  assert.match(source, /initializeFirestore\(app,\s*\{/);
  assert.match(source, /experimentalForceLongPolling:\s*true/);
  assert.doesNotMatch(source, /db\s*=\s*getFirestore\(app\)/);
});
