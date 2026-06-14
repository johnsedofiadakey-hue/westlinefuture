import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rules = await readFile(
  new URL('../firebase/firestore.rules', import.meta.url),
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
