import { Module, Offer, Template } from './types.js';

/**
 * Sums the template size and every unique module file size, rounded up to the
 * nearest gigabyte. Returns bytes.
 */
export const calculateDiskSize = (
  template: Template,
  modules: Module[]
): number => {
  let diskSizeBytes = template.size;
  const seenUrls = new Set<string>();

  // do not count any URL more than once, sum up total added size
  for (const module of modules) {
    for (const [url, size] of module.fileSizes.entries()) {
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        diskSizeBytes += size;
      }
    }
  }

  // round up to nearest gigabyte
  return Math.ceil(diskSizeBytes / 1e9) * 1e9;
};

/**
 * Returns the $/hr cost of an offer while running and while stopped.
 */
export const calculateHourlyCosts = (
  offer: Offer,
  diskSizeBytes: number
): { running: number; stopped: number } => {
  const hourlyDiskCost = offer.search.diskHour * (diskSizeBytes / 1e10); // convert to GB/hr

  return {
    running: offer.search.gpuCostPerHour + hourlyDiskCost,
    stopped: hourlyDiskCost
  };
};
