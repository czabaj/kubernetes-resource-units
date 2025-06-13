import { expect, test } from "bun:test";

import {
  compareResourceStrings,
  formatBaseUnitCpu,
  formatBaseUnitMemory,
  resourceStringToBaseUnit,
} from "./index.ts";

test.each([
  [`1`, `1`, 0], // resource-less, same numbers, equal
  [`1m`, `1`, -1], // 1milli vs 1, 1milli is smaller
  [`100m`, `120m`, -1], // 100milli vs 120milli, 100milli is smaller
  [`1Mi`, `1M`, 1], // 1mebi vs 1mega, 1mebi is bigger (1024 vs 1000)
  [`512`, `0.5Ki`, 0], // 512 vs 0.5kibi, equal
  [`1Mi`, `1Gi`, -1], // 1mebi vs 1gigi, 1mebi is smaller
  [`0.5Mi`, `512Ki`, 0], // 0.5mebi vs 512kibi, equal
  [`0.5Ei`, `512Pi`, 0], // 0.5exbi vs 512pebi, equal, test BigInt
  [`4`, `5`, -1], // 4 vs 5, 4 is smaller
] as [string, string, number][])(
  `.compareResources(%s, %s)`,
  (a, b, expected) => {
    expect(compareResourceStrings(a, b)).toBe(expected);
  }
);

test.each([
  [`500m`, 0.5],
  [`202782720131072u`, 202782720.131072],
  [`10P`, BigInt(10) ** BigInt(16)],
] as [string, number | bigint][])(
  `.getNumberFromResourceString(%s)`,
  (s, expected) => {
    if (typeof expected === `number`) {
      expect(resourceStringToBaseUnit(s)).toBeCloseTo(expected, 5);
    } /* BigInt */ else {
      expect(resourceStringToBaseUnit(s)).toBe(expected);
    }
  }
);

test.each([
  [0.5, `500m`],
  [202782720.131072, `202.782720131072M`],
  [2_000_000, `2M`],
  [BigInt(10), `10`],
  [BigInt(10) ** BigInt(17), `100P`],
] as [number | bigint, string][])(`.formatCpu(%s)`, (n, expected) => {
  expect(formatBaseUnitCpu(n)).toBe(expected);
});

test.each([
  [20, `20`],
  [1024, `1Ki`],
  [202782720.131072, `193.388672Mi`],
] as [number | bigint, string][])(`.formatMemory(%s)`, (n, expected) => {
  expect(formatBaseUnitMemory(n)).toBe(expected);
});
