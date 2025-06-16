# kubernetes-resource-units

A dependency-free TypeScript parser and formatter for Kubernetes resource units. This library helps you parse, convert, format, and compare CPU and memory resource strings used in Kubernetes manifests.

## Features

- 🚀 **Zero dependencies** - Lightweight and fast
- 📏 **Complete unit support** - All Kubernetes CPU and memory units
- 🔢 **BigInt support** - Handles very large values safely
- 🎯 **TypeScript-first** - Full type safety and IntelliSense
- 🧮 **Precise calculations** - Maintains precision for decimal values
- 📊 **Comparison utilities** - Perfect for sorting and aggregation
- 🎨 **Flexible formatting** - Customizable output with Intl.NumberFormat

## Installation

```bash
npm install kubernetes-resource-units
```

## Quick Start

```typescript
import { 
  parseResource, 
  resourceStringToBaseUnit, 
  compareResourceStrings,
  formatBaseUnitCpu,
  formatBaseUnitMemory 
} from 'kubernetes-resource-units';

// Parse resource strings
const parsed = parseResource('500m');
console.log(parsed); // { number: 500, unit: 'm' }

// Convert to base units
const cpuCores = resourceStringToBaseUnit('500m'); // 0.5
const memoryBytes = resourceStringToBaseUnit('1Gi'); // 1073741824

// Compare resources (useful for sorting)
const comparison = compareResourceStrings('1Gi', '1024Mi'); // 0 (equal)

// Format base units back to human-readable strings
const cpuString = formatBaseUnitCpu(1.5); // "1.5"
const memoryString = formatBaseUnitMemory(1073741824); // "1Gi"
```

## Supported Units

### CPU Units (Decimal SI)
- `u` (micro) = 0.000001 cores
- `m` (milli) = 0.001 cores  
- `k` (kilo) = 1,000 cores
- `M` (mega) = 1,000,000 cores
- `G` (giga) = 1,000,000,000 cores
- `T` (tera) = 1,000,000,000,000 cores
- `P` (peta) = 1,000,000,000,000,000 cores
- `E` (exa) = 1,000,000,000,000,000,000 cores
- _(no unit)_ = 1 core

### Memory Units
**Binary (base 1024):**
- `B` (bytes) = 1 byte
- `Ki` (kibibytes) = 1,024 bytes
- `Mi` (mebibytes) = 1,048,576 bytes
- `Gi` (gibibytes) = 1,073,741,824 bytes
- `Ti` (tebibytes) = 1,099,511,627,776 bytes
- `Pi` (pebibytes) = 1,125,899,906,842,624 bytes
- `Ei` (exbibytes) = 1,152,921,504,606,846,976 bytes

## API Reference

### Types

#### `K8sResourceUnit`
```typescript
type K8sResourceUnit = "u" | "m" | "k" | "M" | "G" | "T" | "P" | "E" | "B" | "Ki" | "Mi" | "Gi" | "Ti" | "Pi" | "Ei" | "";
```
Union type of all supported Kubernetes resource units.

#### `K8sParsedResource`
```typescript
type K8sParsedResource = {
  number: number;
  unit: K8sResourceUnit | undefined;
};
```
Represents a parsed resource with separate number and unit components.

#### `CpuUnit`
```typescript
type CpuUnit = "u" | "m" | "k" | "" | "M" | "G" | "T" | "P" | "E";
```
CPU-specific resource units.

#### `MemoryUnit`
```typescript
type MemoryUnit = "" | "Ki" | "Mi" | "Gi" | "Ti" | "Pi" | "Ei";
```
Memory-specific resource units (binary units only).

### Parsing Functions

#### `parseResource(k8sResource: string): K8sParsedResource`
Parses a Kubernetes resource string into number and unit components.

```typescript
parseResource('500m');     // { number: 500, unit: 'm' }
parseResource('1.5Gi');    // { number: 1.5, unit: 'Gi' }
parseResource('100');      // { number: 100, unit: undefined }
parseResource('invalid');  // throws Error
```

#### `resourceStringToBaseUnit(s: string): number | bigint`
Converts a resource string directly to its base unit value.

```typescript
resourceStringToBaseUnit('500m');     // 0.5 (CPU cores)
resourceStringToBaseUnit('1Gi');      // 1073741824 (bytes)
resourceStringToBaseUnit('10P');      // BigInt (very large values)
```

#### `parsedResourceToBaseUnit(resource: K8sParsedResource): number | bigint`
Converts a parsed resource object to its base unit value.

```typescript
const parsed = parseResource('2Gi');
parsedResourceToBaseUnit(parsed);     // 2147483648
```

### Comparison Functions

#### `compareResourceStrings(a: string, b: string): number`
Compares two resource strings. Returns -1, 0, or 1 (suitable for Array.sort).

```typescript
compareResourceStrings('500m', '0.5');    // 0 (equal)
compareResourceStrings('1Gi', '1024Mi');  // 0 (equal)
compareResourceStrings('100m', '200m');   // -1 (a < b)
compareResourceStrings('2Gi', '1Gi');     // 1 (a > b)

// Perfect for sorting
const resources = ['2Gi', '500Mi', '1.5Gi'];
resources.sort(compareResourceStrings);
// Result: ['500Mi', '1.5Gi', '2Gi']
```

#### `compareParsedResources(a: K8sParsedResource, b: K8sParsedResource): number`
Compares two parsed resource objects.

```typescript
const a = parseResource('1Gi');
const b = parseResource('1024Mi');
compareParsedResources(a, b);  // 0 (equal)
```

### Formatting Functions

#### `formatParsedResource(resource: K8sParsedResource, options?: Intl.NumberFormatOptions, locale?: string): string`
Formats a parsed resource back to a string with customizable number formatting.

```typescript
const resource = { number: 1500.5, unit: 'Mi' as const };

formatParsedResource(resource);
// "1500.5Mi"

formatParsedResource(resource, { maximumFractionDigits: 0 });
// "1501Mi"

formatParsedResource(resource, { useGrouping: true });
// "1,500.5Mi"
```

#### `formatBaseUnitCpu(baseUnitNumber: number | bigint, options?: FormatOptions): string`
Formats a base unit CPU value to a human-readable string with automatic unit selection.

```typescript
formatBaseUnitCpu(0.5);           // "500m"
formatBaseUnitCpu(1.5);           // "1.5"
formatBaseUnitCpu(2000);          // "2k"
formatBaseUnitCpu(1000000);       // "1M"

// With specific unit
formatBaseUnitCpu(1.5, { unit: 'm' });  // "1,500m"

// With formatting options
formatBaseUnitCpu(1.234567, { 
  maximumFractionDigits: 2 
});  // "1.23"
```

#### `formatBaseUnitMemory(baseUnitNumber: number | bigint, options?: FormatOptions): string`
Formats a base unit memory value (bytes) to a human-readable string.

```typescript
formatBaseUnitMemory(1024);           // "1Ki"
formatBaseUnitMemory(1073741824);     // "1Gi"
formatBaseUnitMemory(1500000000);     // "1.396265Gi"

// With specific unit
formatBaseUnitMemory(2048, { unit: 'Ki' });  // "2Ki"

// With formatting options
formatBaseUnitMemory(1500000000, { 
  maximumFractionDigits: 1 
});  // "1.4Gi"
```

### Scaling Functions

#### `scaleBaseUnitCpu(baseUnitNumber: number | bigint, unit?: CpuUnit): K8sParsedResource`
Scales a base unit CPU value to a specific unit or automatically determines the best unit.

```typescript
scaleBaseUnitCpu(0.5);           // { number: 500, unit: 'm' }
scaleBaseUnitCpu(1.5);           // { number: 1.5, unit: '' }
scaleBaseUnitCpu(1000);          // { number: 1, unit: 'k' }

// With specific unit
scaleBaseUnitCpu(1.5, 'm');      // { number: 1500, unit: 'm' }
```

#### `scaleBaseUnitMemory(baseUnitNumber: number | bigint, unit?: MemoryUnit): K8sParsedResource`
Scales a base unit memory value (bytes) to a specific unit or automatically determines the best unit.

```typescript
scaleBaseUnitMemory(1024);       // { number: 1, unit: 'Ki' }
scaleBaseUnitMemory(1073741824); // { number: 1, unit: 'Gi' }

// With specific unit
scaleBaseUnitMemory(2048, 'Ki'); // { number: 2, unit: 'Ki' }
```

### Utility Functions

#### `add(a: number | bigint, b: number | bigint): number | bigint`
Safely adds two values that may be numbers or bigints.

```typescript
add(1.5, 2.5);                    // 4
add(BigInt(123), 456);            // BigInt(579)
add(BigInt(123), BigInt(456));    // BigInt(579)
```

## Common Use Cases

### Sorting Resources in UI
```typescript
const podResources = [
  { name: 'pod-1', cpu: '500m', memory: '1Gi' },
  { name: 'pod-2', cpu: '1.5', memory: '512Mi' },
  { name: 'pod-3', cpu: '200m', memory: '2Gi' }
];

// Sort by CPU
podResources.sort((a, b) => compareResourceStrings(a.cpu, b.cpu));

// Sort by memory  
podResources.sort((a, b) => compareResourceStrings(a.memory, b.memory));
```

### Aggregating Resources
```typescript
const pods = [
  { cpu: '500m', memory: '1Gi' },
  { cpu: '300m', memory: '512Mi' },
  { cpu: '1.2', memory: '2Gi' }
];

// Calculate total CPU in base units (cores)
const totalCpu = pods
  .map(pod => resourceStringToBaseUnit(pod.cpu))
  .reduce((sum, cpu) => add(sum, cpu), 0);

console.log(`Total CPU: ${formatBaseUnitCpu(totalCpu)}`);
// "Total CPU: 2"

// Calculate total memory in base units (bytes)
const totalMemory = pods
  .map(pod => resourceStringToBaseUnit(pod.memory))
  .reduce((sum, memory) => add(sum, memory), 0);

console.log(`Total Memory: ${formatBaseUnitMemory(totalMemory)}`);
// "Total Memory: 3.5Gi"
```

### Converting Between Units
```typescript
// Convert CPU from millicores to cores
const millicores = resourceStringToBaseUnit('1500m'); // 1.5
const formatted = formatBaseUnitCpu(millicores);      // "1.5"

// Convert memory from decimal to binary units
const megabytes = resourceStringToBaseUnit('1000M');  // 1000000000
const inGiB = formatBaseUnitMemory(megabytes);        // "931.323Mi"
```

### Validation and Error Handling
```typescript
function isValidResource(resource: string): boolean {
  try {
    parseResource(resource);
    return true;
  } catch {
    return false;
  }
}

isValidResource('500m');     // true
isValidResource('1.5Gi');    // true
isValidResource('invalid');  // false
```

## Requirements

- Node.js 16+ (for BigInt support)
- TypeScript 4+ (if using TypeScript)

## License

MIT
