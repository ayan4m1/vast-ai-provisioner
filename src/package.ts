import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import packageJsonModule from '@npmcli/package-json';
import type { PackageJson } from '@npmcli/package-json';

const getInstallDirectory = (): string =>
  dirname(fileURLToPath(import.meta.url));

export const getPackageRoot = (): string =>
  resolve(getInstallDirectory(), '..');

export const getPackageInfo = async (): Promise<PackageJson> =>
  (await packageJsonModule.load(getPackageRoot()))?.content;
