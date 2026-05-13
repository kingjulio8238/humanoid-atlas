import { describe, expect, it } from 'vitest';
import { companyFunding, factoryDirectory, companyProduction } from '../data';
import {
  getBOMData,
  getFilteredFactories,
  getFilteredFunding,
  getFundingSortedByRaised,
  getProductionSorted,
  getTimelineData,
} from './atlasAnalytics';

describe('atlas analytics selectors', () => {
  it('filters funding rows by status', () => {
    const privateRows = getFilteredFunding('private');
    expect(privateRows.length).toBeGreaterThan(0);
    expect(privateRows.every((row) => row.status === 'private')).toBe(true);
    expect(getFilteredFunding('all')).toHaveLength(companyFunding.length);
  });

  it('sorts funding by latest valuation, then total raised', () => {
    const sorted = getFundingSortedByRaised([
      { ...companyFunding[0], companyId: 'low', latestValuationM: 100, totalRaisedM: 900 },
      { ...companyFunding[0], companyId: 'high', latestValuationM: 200, totalRaisedM: 1 },
      { ...companyFunding[0], companyId: 'tie_winner', latestValuationM: 100, totalRaisedM: 1000 },
    ]);

    expect(sorted.map((row) => row.companyId)).toEqual(['high', 'tie_winner', 'low']);
  });

  it('filters factories by status', () => {
    const operational = getFilteredFactories('operational');
    expect(operational.length).toBeGreaterThan(0);
    expect(operational.every((factory) => factory.status === 'operational')).toBe(true);
    expect(getFilteredFactories('all')).toHaveLength(factoryDirectory.length);
  });

  it('sorts production rows by annual capacity and excludes rows without capacity or shipment data', () => {
    const sorted = getProductionSorted();
    expect(sorted.length).toBeGreaterThan(0);
    expect(sorted.every((row) => row.shipped2025 != null || row.annualCapacity != null)).toBe(true);
    expect(sorted).toHaveLength(companyProduction.filter((row) => row.shipped2025 != null || row.annualCapacity != null).length);
    expect(sorted[0].annualCapacity ?? 0).toBeGreaterThanOrEqual(sorted[1].annualCapacity ?? 0);
  });

  it('produces bounded timeline positions and shipment summaries', () => {
    const timeline = getTimelineData();
    const rows = timeline.lanes.flatMap((lane) => lane.rows);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.pct >= 0 && row.pct <= 100)).toBe(true);
    expect(timeline.totalShipments).toBe(rows.reduce((sum, row) => sum + row.shipments, 0));
  });

  it('produces BOM rows with normalized cost bounds', () => {
    const bom = getBOMData();

    expect(bom.rows.length).toBeGreaterThan(0);
    expect(bom.maxK).toBeGreaterThan(0);
    expect(bom.rows.every((row) => row.bomK !== null || row.priceK !== null)).toBe(true);
    expect(bom.actuatorBreakdown.reduce((sum, row) => sum + row.pct, 0)).toBe(100);
  });
});
