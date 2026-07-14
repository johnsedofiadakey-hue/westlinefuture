import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rules = await readFile(
  new URL('../firebase/firestore.rules', import.meta.url),
  'utf8',
);
const clientPortal = await readFile(
  new URL('../src/pages/ClientPortal.jsx', import.meta.url),
  'utf8',
);

test('phone-auth clients do not trigger unsafe UID profile role reads', () => {
  assert.match(
    rules,
    /function userHasRole\(role\)[\s\S]*exists\([\s\S]*users\/\$\(request\.auth\.uid\)[\s\S]*get\([\s\S]*\.data\.role == role/,
  );
  assert.doesNotMatch(
    rules,
    /function isStaff\(\)[\s\S]*?request\.auth\.token\.role == "staff"[\s\S]*?function isWorker/,
  );
  assert.doesNotMatch(
    rules,
    /function isWorker\(\)[\s\S]*?request\.auth\.token\.role == "worker"[\s\S]*?function isAdminOrStaff/,
  );
});

test('project access accepts normalized Firebase phone claims', () => {
  const normalizedPhoneMemberships = rules.match(
    /authPhoneId\(\) in (?:d|project)\.clientIds/g,
  ) || [];

  assert.equal(normalizedPhoneMemberships.length, 2);
});

test('client matching never reads optional auth claims without a presence guard', () => {
  assert.match(
    rules,
    /function authEmail\(\)[\s\S]*"email" in request\.auth\.token/,
  );
  assert.match(
    rules,
    /function authPhoneNumber\(\)[\s\S]*"phone_number" in request\.auth\.token/,
  );

  const isClientBody = rules.match(
    /function isClient\(clientId\) \{([\s\S]*?)\n    \}/,
  )?.[1] || '';

  assert.doesNotMatch(isClientBody, /request\.auth\.token\.email/);
  assert.doesNotMatch(isClientBody, /request\.auth\.token\.phone_number/);
});

test('client portal subscribes only to explicitly indexed project documents', () => {
  assert.match(
    clientPortal,
    /Array\.isArray\(user\.projectIds\)/,
  );
  assert.doesNotMatch(
    clientPortal,
    /collection\(db, 'projects'\),\s*where\('clientIds'/,
  );
  assert.match(
    clientPortal,
    /doc\(db, 'projects', projectId\)/,
  );
  assert.match(
    clientPortal,
    /projectsError && projects\.length === 0/,
  );
});

test('Lucide icons do not shadow native collection constructors', () => {
  assert.doesNotMatch(
    clientPortal,
    /\bAward,\s*Map,\s*HelpCircle/,
  );
  assert.match(
    clientPortal,
    /Map as MapIcon/,
  );
  assert.match(
    clientPortal,
    /const projectMap = new Map\(\)/,
  );
});

test('sanitized public gateway settings remain readable by client portals', () => {
  assert.match(
    rules,
    /match \/cms_content\/\{docId\} \{[\s\S]*allow read: if true;/,
  );
});

const storageRules = await readFile(
  new URL('../firebase/storage.rules', import.meta.url),
  'utf8',
);

test('no domain-wide admin email match — staff/worker pseudo-emails share the domain', () => {
  // Any .*@westlinefuture.com match or endsWith on the domain grants every
  // staff and worker account (username@westlinefuture.com pseudo-emails) full
  // admin. Only exact admin emails may appear.
  assert.doesNotMatch(rules, /matches\(".*@westlinefuture/);
  assert.doesNotMatch(storageRules, /matches\(".*@westlinefuture/);
  assert.match(rules, /request\.auth\.token\.email == "admin@westlinefuture\.com"/);
  assert.match(storageRules, /request\.auth\.token\.email == "admin@westlinefuture\.com"/);
});

test('storage staff/worker checks fall back to the users doc role for claim-less accounts', () => {
  assert.match(storageRules, /function userDocRole\(\)[\s\S]*users\/\$\(request\.auth\.uid\)/);
  assert.match(storageRules, /userDocRole\(\) == "staff"/);
  assert.match(storageRules, /userDocRole\(\) == "worker"/);
});
