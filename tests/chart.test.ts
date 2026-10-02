import test from 'node:test';
import assert from 'node:assert/strict';
import { chartSummary } from '../src/components/ValueChart';
import type { Player } from '../src/types';

const point = (rating: number, price: number) => ({ rating, price } as Player);
test('chart handles empty and constant samples without invalid correlations', () => {
  assert.equal(chartSummary([]).correlation, null);
  assert.equal(chartSummary([point(80, 100), point(80, 120)]).slope, null);
  assert.equal(chartSummary([point(80, 100), point(90, 100)]).correlation, null);
});
test('chart scales include outliers and regression follows the actual prices', () => {
  const summary = chartSummary([point(60, 100), point(80, 300), point(100, 500), point(NaN, 0)]);
  assert.equal(summary.data.length, 3);
  assert.equal(summary.slope, 10);
  assert.equal(summary.correlation, 1);
  assert.equal(summary.minRating, 60);
  assert.equal(summary.maxRating, 100);
  assert.equal(summary.maxCost, 500);
});
