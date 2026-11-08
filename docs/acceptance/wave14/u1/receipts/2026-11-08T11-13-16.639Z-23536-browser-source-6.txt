import {t} from './views/strings.mjs';
const textMap = keys => Object.freeze(Object.defineProperties({}, Object.fromEntries(Object.entries(keys).map(([name, key]) => [name, {enumerable:true, get:() => t(key)}]))));
export const levels = textMap({recommended:'levelSafe', confirm:'levelReview', advisory:'levelStats', protected:'levelProtected', unrecognized:'levelUnknown'});
export const clusterStates = textMap({growing:'clusterGrowing', stopped:'clusterStopped', suspected:'clusterSuspected', new:'clusterNew'});
export function viewCards(conclusion) { return conclusion.cards; }
export function validQuery(value) { return typeof value === 'string' && [...value].length <= 64 && !/[\\/:\u0000-\u001f\u007f]/.test(value); }
export function itemRow(group, row) { return !group.group_id.startsWith('m:') && !row.row_id.startsWith('r:') && group.item_count <= 8; }
export function cleanLabel(plan) { return `${BigInt(plan.chosen_bytes) > 0n ? t('clean') : t('cleanRecommended')}`; }
export function canonicalRoute(value) {
  const name = value.replace(/^#\/?/, '');
  const alias = {results:'home', locations:'settings/content', about:'settings/about', settings:'settings/content'};
  const route = alias[name] ?? name;
  return ['home', 'quarantine', 'trends', 'history', 'settings/content', 'settings/skip', 'settings/decl', 'settings/about', 'settings/language'].includes(route) ? route : 'home';
}
// Monotone cubic Hermite interpolation. Limited shared tangents keep the
// Bezier controls ordered inside each interval, with no overshoot at extrema.
export function monotoneSegments(points) {
  if (points.length < 2) return [];
  const slopes = points.slice(1).map((p, i) => (p.y - points[i].y) / (p.x - points[i].x));
  const tangent = i => {
    if (i === 0) return slopes[0];
    if (i === points.length - 1) return slopes.at(-1);
    const a = slopes[i - 1], b = slopes[i];
    return a * b <= 0 ? 0 : Math.sign(a) * Math.min(Math.abs(a), Math.abs(b));
  };
  return points.slice(1).map((end, i) => {
    const start = points[i], dx = (end.x - start.x) / 3;
    return {start, end, c1:{x:start.x + dx, y:start.y + tangent(i) * dx}, c2:{x:end.x - dx, y:end.y - tangent(i + 1) * dx}};
  });
}
