import assert from 'node:assert/strict';
import test from 'node:test';
import { BUCKETS, EDGE_FUNCTIONS, RPCS, TABLES, coupleChannel } from '../src/lib/backend';

// The single mapping point between the app and the co-tenant Supabase project.
// Every live DB object is trace_-prefixed; a regression here silently points the
// app at another tenant's tables, so these are load-bearing assertions.

test('every table name is trace_-prefixed', () => {
  for (const name of Object.values(TABLES)) {
    assert.match(name, /^trace_/, `${name} must be trace_-prefixed`);
  }
});

test('every rpc name is trace_-prefixed', () => {
  for (const name of Object.values(RPCS)) {
    assert.match(name, /^trace_/, `${name} must be trace_-prefixed`);
  }
});

test('every edge function is trace-prefixed', () => {
  for (const name of Object.values(EDGE_FUNCTIONS)) {
    assert.match(name, /^trace-/, `${name} must be trace-prefixed`);
  }
});

test('every storage bucket is trace-prefixed', () => {
  for (const name of Object.values(BUCKETS)) {
    assert.match(name, /^trace-/, `${name} must be trace-prefixed`);
  }
});

test('coupleChannel matches the live realtime RLS topic format', () => {
  // Live policy: topic LIKE 'trace:couple:%' AND member(split_part(topic,':',3)).
  // If this format drifts, realtime broadcasts are silently denied by RLS.
  const id = '11111111-2222-3333-4444-555555555555';
  const topic = coupleChannel(id);
  assert.equal(topic, `trace:couple:${id}`);
  assert.ok(topic.startsWith('trace:couple:'), 'must match LIKE prefix');
  assert.equal(topic.split(':')[2], id, 'split_part(topic, ":", 3) must be the couple id');
});

test('table/rpc/bucket names are unique (no accidental collisions)', () => {
  const all = [...Object.values(TABLES), ...Object.values(RPCS), ...Object.values(BUCKETS)];
  assert.equal(new Set(all).size, all.length);
});
