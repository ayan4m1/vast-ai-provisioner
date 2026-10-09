import uniq from 'lodash.uniq';

import { Module, ModuleDependencies, Template } from './types.js';

const formatBashArray = (items: string[]) =>
  items ? items.map((item) => `    "${item}"`).join('\n') : '';

/**
 * Fills the {{ FILETYPE }} placeholders in a provisioning script with the
 * deduplicated files required by the chosen modules.
 */
export const buildScript = (
  template: Template,
  modules: Module[],
  script: string
): string => {
  if (!template.fileTypes.length || !modules.length) {
    return script;
  }

  // add all module deps together and then deduplicate
  const sumModule: ModuleDependencies = Object.fromEntries(
    template.fileTypes.map((val) => [val, []])
  );

  for (const module of modules) {
    for (const key of template.fileTypes) {
      if (!sumModule[key]) {
        continue;
      }

      sumModule[key] = uniq([...sumModule[key], ...(module.files[key] ?? [])]);
    }
  }

  for (const key of template.fileTypes) {
    if (!sumModule[key]?.length) {
      continue;
    }

    script = script.replace(
      `{{ ${key.toUpperCase()} }}`,
      formatBashArray(sumModule[key])
    );
  }

  return script;
};
