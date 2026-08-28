/**
 * GENERATED FILE — do not edit by hand.
 *
 * Produced by `node scripts/placement/port-item-bank.mjs` from
 * `scripts/placement/source-item-bank.md` (the upstream CASA placement-test
 * teacher review book). Re-run the script instead of patching this file, or the
 * next port silently reverts your change.
 *
 * SERVER ONLY. This module carries answer keys and, for listening items,
 * protected transcripts. It must never be imported from a `'use client'`
 * module — `src/lib/placement/__tests__/answer-containment.test.ts` enforces
 * that. Client payloads are produced by `src/lib/placement/sanitise.ts`.
 */

import type { PlacementModule } from '@/lib/placement/types';

export const PLACEMENT_MODULES: readonly PlacementModule[] = [
  {
    "id": "ROUTER-V1",
    "title": "Routingstest",
    "kind": "router",
    "stages": ["router"],
    "itemIds": ["ROUTER-LU-A1-001", "ROUTER-RD-A1-001", "ROUTER-LS-A1-001", "ROUTER-LU-A2-001", "ROUTER-RD-A2-001", "ROUTER-LS-A2-001", "ROUTER-LU-B1-001", "ROUTER-RD-B1-001", "ROUTER-LS-B1-001", "ROUTER-LU-B2-001", "ROUTER-RD-B2-001", "ROUTER-LS-B2-001", "ROUTER-LU-C1-001", "ROUTER-RD-C1-001", "ROUTER-LS-C1-001"],
  },
  {
    "id": "LEVEL-A1",
    "title": "Niveaumodul A1",
    "kind": "level",
    "stages": ["foundation", "stretch"],
    "itemIds": ["A1-LU-FOUND-001", "A1-LU-FOUND-002", "A1-LU-FOUND-003", "A1-LU-STRETCH-001", "A1-LU-STRETCH-002", "A1-LU-STRETCH-003", "A1-RD-FOUND-001", "A1-RD-FOUND-002", "A1-RD-FOUND-003", "A1-RD-STRETCH-001", "A1-RD-STRETCH-002", "A1-RD-STRETCH-003", "A1-LS-FOUND-001", "A1-LS-FOUND-002", "A1-LS-FOUND-003", "A1-LS-STRETCH-001", "A1-LS-STRETCH-002", "A1-LS-STRETCH-003"],
  },
  {
    "id": "LEVEL-A2",
    "title": "Niveaumodul A2",
    "kind": "level",
    "stages": ["foundation", "stretch"],
    "itemIds": ["A2-LU-FOUND-001", "A2-LU-FOUND-002", "A2-LU-FOUND-003", "A2-LU-STRETCH-001", "A2-LU-STRETCH-002", "A2-LU-STRETCH-003", "A2-RD-FOUND-001", "A2-RD-FOUND-002", "A2-RD-FOUND-003", "A2-RD-STRETCH-001", "A2-RD-STRETCH-002", "A2-RD-STRETCH-003", "A2-LS-FOUND-001", "A2-LS-FOUND-002", "A2-LS-FOUND-003", "A2-LS-STRETCH-001", "A2-LS-STRETCH-002", "A2-LS-STRETCH-003"],
  },
  {
    "id": "LEVEL-B1",
    "title": "Niveaumodul B1",
    "kind": "level",
    "stages": ["foundation", "stretch"],
    "itemIds": ["B1-LU-FOUND-001", "B1-LU-FOUND-002", "B1-LU-FOUND-003", "B1-LU-STRETCH-001", "B1-LU-STRETCH-002", "B1-LU-STRETCH-003", "B1-RD-FOUND-001", "B1-RD-FOUND-002", "B1-RD-FOUND-003", "B1-RD-STRETCH-001", "B1-RD-STRETCH-002", "B1-RD-STRETCH-003", "B1-LS-FOUND-001", "B1-LS-FOUND-002", "B1-LS-FOUND-003", "B1-LS-STRETCH-001", "B1-LS-STRETCH-002", "B1-LS-STRETCH-003"],
  },
  {
    "id": "LEVEL-B1P",
    "title": "CASA-Brückenmodul B1+",
    "kind": "level",
    "stages": ["foundation", "stretch"],
    "itemIds": ["B1P-LU-FOUND-001", "B1P-LU-FOUND-002", "B1P-LU-FOUND-003", "B1P-LU-STRETCH-001", "B1P-LU-STRETCH-002", "B1P-LU-STRETCH-003", "B1P-RD-FOUND-001", "B1P-RD-FOUND-002", "B1P-RD-FOUND-003", "B1P-RD-STRETCH-001", "B1P-RD-STRETCH-002", "B1P-RD-STRETCH-003", "B1P-LS-FOUND-001", "B1P-LS-FOUND-002", "B1P-LS-FOUND-003", "B1P-LS-STRETCH-001", "B1P-LS-STRETCH-002", "B1P-LS-STRETCH-003"],
  },
  {
    "id": "LEVEL-B2",
    "title": "Niveaumodul B2",
    "kind": "level",
    "stages": ["foundation", "stretch"],
    "itemIds": ["B2-LU-FOUND-001", "B2-LU-FOUND-002", "B2-LU-FOUND-003", "B2-LU-STRETCH-001", "B2-LU-STRETCH-002", "B2-LU-STRETCH-003", "B2-RD-FOUND-001", "B2-RD-FOUND-002", "B2-RD-FOUND-003", "B2-RD-STRETCH-001", "B2-RD-STRETCH-002", "B2-RD-STRETCH-003", "B2-LS-FOUND-001", "B2-LS-FOUND-002", "B2-LS-FOUND-003", "B2-LS-STRETCH-001", "B2-LS-STRETCH-002", "B2-LS-STRETCH-003"],
  },
  {
    "id": "LEVEL-C1",
    "title": "Niveaumodul C1",
    "kind": "level",
    "stages": ["foundation", "stretch"],
    "itemIds": ["C1-LU-FOUND-001", "C1-LU-FOUND-002", "C1-LU-FOUND-003", "C1-LU-STRETCH-001", "C1-LU-STRETCH-002", "C1-LU-STRETCH-003", "C1-RD-FOUND-001", "C1-RD-FOUND-002", "C1-RD-FOUND-003", "C1-RD-STRETCH-001", "C1-RD-STRETCH-002", "C1-RD-STRETCH-003", "C1-LS-FOUND-001", "C1-LS-FOUND-002", "C1-LS-FOUND-003", "C1-LS-STRETCH-001", "C1-LS-STRETCH-002", "C1-LS-STRETCH-003"],
  },
  {
    "id": "BOUNDARY-A1-A2",
    "title": "Grenzmodul A1.2 / A2.1",
    "kind": "boundary",
    "stages": ["lower_exit", "upper_entry"],
    "itemIds": ["BA1A2-LU-LOW-001", "BA1A2-LU-LOW-002", "BA1A2-RD-LOW-001", "BA1A2-LS-LOW-001", "BA1A2-LU-UP-001", "BA1A2-RD-UP-001", "BA1A2-RD-UP-002", "BA1A2-LS-UP-001"],
  },
  {
    "id": "BOUNDARY-A2-B1",
    "title": "Grenzmodul A2.2 / B1.1",
    "kind": "boundary",
    "stages": ["lower_exit", "upper_entry"],
    "itemIds": ["BA2B1-LU-LOW-001", "BA2B1-LU-LOW-002", "BA2B1-RD-LOW-001", "BA2B1-LS-LOW-001", "BA2B1-LU-UP-001", "BA2B1-RD-UP-001", "BA2B1-RD-UP-002", "BA2B1-LS-UP-001"],
  },
  {
    "id": "BOUNDARY-B1-B1P",
    "title": "Grenzmodul B1.2 / B1+",
    "kind": "boundary",
    "stages": ["lower_exit", "upper_entry"],
    "itemIds": ["BB1B1P-LU-LOW-001", "BB1B1P-LU-LOW-002", "BB1B1P-RD-LOW-001", "BB1B1P-LS-LOW-001", "BB1B1P-LU-UP-001", "BB1B1P-RD-UP-001", "BB1B1P-RD-UP-002", "BB1B1P-LS-UP-001"],
  },
  {
    "id": "BOUNDARY-B1P-B2",
    "title": "Grenzmodul B1+ / B2.1",
    "kind": "boundary",
    "stages": ["lower_exit", "upper_entry"],
    "itemIds": ["BB1PB2-LU-LOW-001", "BB1PB2-LU-LOW-002", "BB1PB2-RD-LOW-001", "BB1PB2-LS-LOW-001", "BB1PB2-LU-UP-001", "BB1PB2-RD-UP-001", "BB1PB2-RD-UP-002", "BB1PB2-LS-UP-001"],
  },
  {
    "id": "BOUNDARY-B2-C1",
    "title": "Grenzmodul B2.2 / C1.1",
    "kind": "boundary",
    "stages": ["lower_exit", "upper_entry"],
    "itemIds": ["BB2C1-LU-LOW-001", "BB2C1-LU-LOW-002", "BB2C1-RD-LOW-001", "BB2C1-LS-LOW-001", "BB2C1-LU-UP-001", "BB2C1-RD-UP-001", "BB2C1-RD-UP-002", "BB2C1-LS-UP-001"],
  },
] as const;
