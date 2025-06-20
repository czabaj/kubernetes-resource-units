const reK8sResource =
  /^(?<number>\d+(?:\.\d+)?(?:e\d+)?)(?<unit>u|m|k|M|G|T|P|E|B|Ki|Mi|Gi|Ti|Pi|Ei)?$/;

const unitMultiplier = {
  // CPU units (10-base)
  u: 1e-6,
  m: 1e-3,
  k: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
  P: 1e15,
  E: BigInt(10) ** BigInt(18),
  "": 1, // no unit
  // Memory units (2-base)
  B: 1, // byte
  Ki: 1 << 10,
  Mi: 1 << 20,
  Gi: 1 << 30,
  // bitwise operators supports only 32-bit integers
  Ti: (1 << 30) * (1 << 10),
  Pi: BigInt(1 << 30) * BigInt(1 << 20),
  Ei: BigInt(1 << 30) * BigInt(1 << 30),
} as const;

/**
 * K8sResourceUnit contains all possible Kubernetes resource units for CPU and
 * memory.
 */
export type K8sResourceUnit = keyof typeof unitMultiplier;

/**
 * K8sParsedResource is Kubernetes resource string parsed into a number part and
 * a resource unit part.
 */
export type K8sParsedResource = {
  number: number;
  unit: K8sResourceUnit | undefined;
};

/**
 * parseResource parses a Kubernetes resource string into a number part and unit.
 */
export const parseResource = (k8sResource: string): K8sParsedResource => {
  const match = k8sResource.match(reK8sResource);
  if (!match) {
    throw new Error(
      `The value "${k8sResource}" is not a valid resource string.`
    );
  }
  const { number: numberPart, unit: unitPart } = match.groups as {
    number: string;
    unit: undefined | keyof typeof unitMultiplier;
  };
  const number = parseFloat(numberPart);
  if (!Number.isFinite(number)) {
    throw new Error(
      `Error when parsing a number from value "${k8sResource}". `
    );
  }

  return { number, unit: unitPart };
};

const getPrecision = (n: number): number => {
  const sNum = String(n);
  const dotIndex = sNum.indexOf(`.`);
  if (dotIndex === -1) return 0; // no decimal part
  return sNum.length - dotIndex - 1; // number of digits after decimal point
};

/**
 * parsedResourceToBaseUnit scales K8sParsedResource to a base unit number,
 * i.e. a number without any unit.
 * Example: `{ number: 1.5, unit: 'G' }` will be scaled to `1500000000` (1.5 * 10^9).
 */
export const parsedResourceToBaseUnit = ({
  number,
  unit,
}: K8sParsedResource): number | bigint => {
  const uMul = unit === undefined ? 1 : unitMultiplier[unit];
  if (typeof uMul === "bigint") {
    const precision = getPrecision(number);
    const pMul = 10 ** precision;
    return (BigInt(number * pMul) * uMul) / BigInt(pMul);
  }
  const result = number * uMul;
  if (result <= Number.MAX_SAFE_INTEGER) {
    return result;
  }
  const precision = getPrecision(number);
  const mul = 10 ** precision;
  return (BigInt(number * mul) * BigInt(uMul)) / BigInt(mul);
};

/**
 * resourceStringToBaseUnit scales a Kubernetes resource string to a base unit
 * number, i.e. a number without any unit.
 * Example: `1.5G` will be scaled to `1_500_000_000` (1.5 * 10^9).
 */
export const resourceStringToBaseUnit = (s: string): number | bigint =>
  parsedResourceToBaseUnit(parseResource(s));

/**
 * compareParsedResources compares two parsed Kubernetes resources. Can be
 * used in sorting functions.
 */
export const compareParsedResources = (
  a: K8sParsedResource,
  b: K8sParsedResource
): number => {
  if (a.unit === b.unit) {
    return a.number === b.number ? 0 : a.number > b.number ? 1 : -1;
  }
  const baseUnitA = parsedResourceToBaseUnit(a);
  const baseUnitB = parsedResourceToBaseUnit(b);
  if (typeof baseUnitA !== `bigint` && typeof baseUnitB !== `bigint`) {
    return baseUnitA === baseUnitB ? 0 : baseUnitA > baseUnitB ? 1 : -1;
  }
  const bigA = BigInt(baseUnitA);
  const bigB = BigInt(baseUnitB);
  return bigA === bigB ? 0 : bigA > bigB ? 1 : -1;
};

/**
 * compareResourceStrings compares two Kubernetes resource strings. Can be used
 * in sorting functions.
 */
export const compareResourceStrings = (a: string, b: string): number => {
  return compareParsedResources(parseResource(a), parseResource(b));
};

/**
 * formatParsedResource formats a parsed Kubernetes resource back into a string.
 * The function takes options for `Intl.NumberFormat` to customize the
 * formatting of the number part, such as `maximumFractionDigits`,
 * `useGrouping`, etc.
 */
export const formatParsedResource = (
  parsedResource: K8sParsedResource,
  options?: Omit<Intl.NumberFormatOptions, `style` | `unit` | `unitDisplay`>,
  locale: string = `en-US`
) => {
  const formattedNumber = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 100, // default for NumberFormat is 3, but we want avoid default rounding
    useGrouping: false, // default for NumberFormat is "auto", but we want to avoid grouping
    ...options,
  }).format(parsedResource.number);
  return `${formattedNumber}${parsedResource.unit ?? ``}`;
};

const cpuUnits = [
  `u`,
  `m`,
  `k`,
  ``,
  `M`,
  `G`,
  `T`,
  `P`,
  `E`,
] as const satisfies K8sResourceUnit[];

export type CpuUnit = (typeof cpuUnits)[number];

/**
 * scaleBaseUnitCpu scales a base unit number to a K8sParsedResource.
 * If you omit the `unit` parameter, it will automatically determine the
 * appropriate unit.
 */
export const scaleBaseUnitCpu = (
  baseUnitNumber: number | bigint,
  unit?: CpuUnit
): K8sParsedResource => {
  const isNumBig = typeof baseUnitNumber === `bigint`;
  let multiplier: number | bigint = 1;
  if (unit) {
    multiplier = isNumBig ? BigInt(unitMultiplier[unit]) : unitMultiplier[unit];
  } else if (Number(baseUnitNumber) === 0) {
    // Special case for 0, we return 0 with no unit
    return { number: 0, unit: undefined };
  } else {
    let i = baseUnitNumber < 1 ? 3 : cpuUnits.length;
    while (i--) {
      // biome-ignore lint/style/noNonNullAssertion: in the iteration the unit is always defined
      unit = cpuUnits[i]!;
      multiplier = unitMultiplier[unit];
      let n = baseUnitNumber;
      if (isNumBig) {
        multiplier = BigInt(multiplier);
      } else {
        if (typeof multiplier === `bigint`) {
          n = BigInt(Math.trunc(baseUnitNumber));
        }
      }
      if (n >= multiplier) break;
    }
  }
  const isUnitBig = typeof multiplier === `bigint`;
  const number =
    isNumBig !== isUnitBig
      ? BigInt(baseUnitNumber) / BigInt(multiplier)
      : (baseUnitNumber as number) / (multiplier as number);
  return { number: Number(number), unit: unit };
};

const memoryUnits = [
  ``,
  `Ki`,
  `Mi`,
  `Gi`,
  `Ti`,
  `Pi`,
  `Ei`,
] as const satisfies K8sResourceUnit[];

export type MemoryUnit = (typeof memoryUnits)[number];

/**
 * scaleBaseUnitMemory scales a base unit number to a K8sParsedResource.
 * If you omit the `unit` parameter, it will automatically determine the
 * appropriate unit.
 */
export const scaleBaseUnitMemory = (
  baseUnitNumber: number | bigint,
  unit?: MemoryUnit
): K8sParsedResource => {
  const isNumBig = typeof baseUnitNumber === `bigint`;
  let multiplier: number | bigint = 1;
  if (unit) {
    multiplier = isNumBig ? BigInt(unitMultiplier[unit]) : unitMultiplier[unit];
  } else {
    let i = memoryUnits.length;
    while (i--) {
      // biome-ignore lint/style/noNonNullAssertion: in the iteration the unit is always defined
      unit = memoryUnits[i]!;
      multiplier = unitMultiplier[unit];
      let n = baseUnitNumber;
      if (isNumBig) {
        multiplier = BigInt(multiplier);
      } else {
        if (typeof multiplier === `bigint`) {
          n = BigInt(Math.trunc(baseUnitNumber));
        }
      }
      if (n >= multiplier) break;
    }
  }
  const isUnitBig = typeof multiplier === `bigint`;
  const number =
    isNumBig !== isUnitBig
      ? BigInt(baseUnitNumber) / BigInt(multiplier)
      : (baseUnitNumber as number) / (multiplier as number);
  return { number: Number(number), unit: unit };
};

/**
 * formatBaseUnitCpu formats a base unit CPU number into a Kubernetes resource
 * string. You can provide a CPU unit to scale the number to, or it will be
 * automatically determined.
 * Other options are passed to the `Intl.NumberFormat` constructor so you can
 * customize the formatting (e.g. `maximumFractionDigits`, `useGrouping`, etc.).
 */
export const formatBaseUnitCpu = (
  baseUnitNumber: number | bigint,
  options?: Omit<Intl.NumberFormatOptions, `style` | `unit` | `unitDisplay`> & {
    unit?: CpuUnit;
  }
): string => {
  let formatOptions: Intl.NumberFormatOptions | undefined;
  let unit: CpuUnit | undefined;
  if (options) ({ unit, ...formatOptions } = options);
  const parsedResource = scaleBaseUnitCpu(baseUnitNumber, unit);
  return formatParsedResource(parsedResource, formatOptions);
};

/**
 * formatBaseUnitMemory formats a base unit memory number into a Kubernetes
 * resource string. You can provide a memory unit to scale the number to, or it
 * will be automatically determined.
 * Other options are passed to the `Intl.NumberFormat` constructor so you can
 * customize the formatting (e.g. `maximumFractionDigits`, `useGrouping`, etc.).
 */
export const formatBaseUnitMemory = (
  baseUnitNumber: number | bigint,
  options?: Omit<Intl.NumberFormatOptions, `style` | `unit` | `unitDisplay`> & {
    unit?: MemoryUnit;
  }
): string => {
  let formatOptions: Intl.NumberFormatOptions | undefined;
  let unit: MemoryUnit | undefined;
  if (options) ({ unit, ...formatOptions } = options);
  const parsedResource = scaleBaseUnitMemory(baseUnitNumber, unit);
  return formatParsedResource(parsedResource, formatOptions);
};

/**
 * A simple add function that works with both numbers and bigints.
 */
export const add = (
  a: number | bigint,
  b: number | bigint
): number | bigint => {
  if (typeof a === `bigint` || typeof b === `bigint`) {
    return BigInt(a) + BigInt(b);
  }
  return a + b;
};
