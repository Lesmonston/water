import { assertReviewInput } from '../native-review/model.mjs';
import { assertMarker, validId, unavailable } from './model.mjs';

function dataObject(value, keys) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) throw new Error();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== keys.length) throw new Error();
  for (const key of keys) {
    const d = descriptors[key];
    if (!d?.enumerable || !Object.hasOwn(d, 'value')) throw new Error();
  }
}

// Synchronous ownership boundary: no result objects or mutable buffers escape.
export function captureProjectReport(result) {
  try {
    dataObject(result, ['job_id', 'read_manifest', 'marker', 'selection', 'status', 'bundle']);
    const { job_id, read_manifest, marker, selection, status, bundle } = result;
    if (!validId(job_id) || typeof read_manifest !== 'boolean' || selection !== 'confirmed') throw new Error();
    assertReviewInput(bundle);
    if (bundle.bundle_version !== 'water.native-session-bundle.v1' || bundle.selection !== selection ||
        bundle.session_id !== job_id || bundle.snapshots.length !== 1) throw new Error();
    const snapshot = bundle.snapshots[0], limits = bundle.policy.limits;
    if (snapshot.source_kind !== 'native_scope_metadata' || snapshot.view.scan_id !== job_id ||
        snapshot.view.status !== status || !['completed', 'partial', 'cancelled'].includes(status) ||
        limits.max_depth !== 8 || limits.max_entries !== 10000 || limits.max_dir_entries !== 256) throw new Error();
    dataObject(marker, ['status', 'error_code', 'observation_json']);
    assertMarker(marker, read_manifest, selection, status);
    return {
      session: Buffer.from(JSON.stringify({ report_version: 'water.project-report.v1', job_id, read_manifest, bundle, marker })),
      metadata: Buffer.from(snapshot.redacted_json, 'utf8'),
      evidence: marker.status === 'observed' ? Buffer.from(marker.observation_json, 'utf8') : null,
    };
  } catch { throw new Error(unavailable); }
}
