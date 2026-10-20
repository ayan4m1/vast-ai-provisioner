import { existsSync } from 'fs';
import { join } from 'path';
import { readdir, readFile } from 'fs/promises';

import { Module, Template } from './types.js';
import { getPackageRoot } from './package.js';
import { getHfAuthHeaders } from './api/huggingface.js';

const getTemplatesPath = (): string => join(getPackageRoot(), 'templates');

const getModulesPath = (): string => join(getPackageRoot(), 'modules');

const getScriptsPath = (): string => join(getPackageRoot(), 'scripts');

const getUrlSize = async (url: string, hfToken?: string): Promise<number> => {
  const res = await fetch(url, {
    method: 'HEAD',
    headers: getHfAuthHeaders(url, hfToken)
  });

  if (!res.ok) {
    console.warn(`Could not size ${url} (HTTP ${res.status}), is it gated?`);
    return 0;
  }

  return parseInt(res.headers.get('Content-Length') ?? '0', 10);
};

const parseJsonInDir = async <T>(basePath: string): Promise<Map<string, T>> => {
  const result = new Map<string, T>();

  const paths = await readdir(basePath);
  const contents = await Promise.all(
    paths.map((path) => readFile(join(basePath, path), 'utf-8'))
  );
  const objects = contents.map(
    (content) => JSON.parse(content) as unknown as T
  );

  for (let i = 0; i < paths.length; i++) {
    result.set(paths[i], objects[i]);
  }

  return result;
};

/**
 * Loads every template, keyed by its filename (e.g. "comfyui.json").
 */
export const loadTemplates = (): Promise<Map<string, Template>> =>
  parseJsonInDir<Template>(getTemplatesPath());

/**
 * Loads a single template by filename, with or without the .json extension.
 */
export const loadTemplate = async (name: string): Promise<Template> => {
  const fileName = name.endsWith('.json') ? name : `${name}.json`;
  const templatePath = join(getTemplatesPath(), fileName);

  if (!existsSync(templatePath)) {
    throw new Error(`Unable to find template at ${templatePath}!`);
  }

  return JSON.parse(
    await readFile(templatePath, 'utf-8')
  ) as unknown as Template;
};

/**
 * Loads the modules compatible with a template.
 */
export const loadModules = async (template: Template): Promise<Module[]> => {
  console.log('Reading module JSON from ./modules');

  const moduleMap = await parseJsonInDir<Module>(getModulesPath());

  return Array.from(moduleMap.values()).filter(
    (module) => module.template === template.name
  );
};

/**
 * Fetches the size of each file in the given modules, authenticating to
 * Hugging Face when a token is provided.
 */
export const fetchModuleSizes = async (
  modules: Module[],
  hfToken?: string
): Promise<Module[]> => {
  console.log('Fetching file sizes...');

  return Promise.all(
    modules.map(async (module) => {
      module.fileSizes = new Map<string, number>();
      module.totalSize = 0;

      for (const [, urls] of Object.entries(module.files)) {
        if (!urls) {
          continue;
        }

        for (const url of urls) {
          const size = await getUrlSize(url, hfToken);

          module.fileSizes.set(url, size);
          module.totalSize += size;
        }
      }

      return module;
    })
  );
};

export const readScript = async (template: Template): Promise<string> => {
  if (!template.script) {
    throw new Error('No template script!');
  }

  const scriptPath = join(getScriptsPath(), template.script);

  if (!existsSync(scriptPath)) {
    throw new Error(`Could not find script at ${scriptPath}!`);
  }

  return readFile(scriptPath, 'utf-8');
};
