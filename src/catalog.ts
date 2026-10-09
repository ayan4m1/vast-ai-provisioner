import { existsSync } from 'fs';
import { join } from 'path';
import { readdir, readFile } from 'fs/promises';

import { Module, Template } from './types.js';
import { getPackageRoot } from './package.js';

const getTemplatesPath = (): string => join(getPackageRoot(), 'templates');

const getModulesPath = (): string => join(getPackageRoot(), 'modules');

const getScriptsPath = (): string => join(getPackageRoot(), 'scripts');

const getUrlSize = async (url: string): Promise<number> => {
  const res = await fetch(url);

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
 * Loads the modules compatible with a template and fetches the size of each
 * of their files.
 */
export const loadModules = async (template: Template): Promise<Module[]> => {
  console.log('Reading module JSON from ./modules');

  const moduleMap = await parseJsonInDir<Module>(getModulesPath());

  console.log('Fetching file sizes...');

  return Promise.all(
    Array.from(moduleMap.values())
      .filter((module) => module.template === template.name)
      .map(async (module) => {
        module.fileSizes = new Map<string, number>();
        module.totalSize = 0;

        for (const [, urls] of Object.entries(module.files)) {
          if (!urls) {
            continue;
          }

          for (const url of urls) {
            const size = await getUrlSize(url);

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
