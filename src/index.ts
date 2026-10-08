try {
  process.loadEnvFile();
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  }
}

import { program } from '@commander-js/extra-typings';

import { getPackageInfo, provision } from './utils.js';

try {
  const { name, version, description } = await getPackageInfo();

  await program
    .name(name ?? 'vast-ai-provisioner')
    .version(version ?? '0.1.0')
    .description(description ?? '')
    .argument('[template]', 'Specify template to deploy')
    .option(
      '--min-vram <gb>',
      'Min. amount of GPU VRAM in GB',
      (val) => parseInt(val, 10),
      16
    )
    .option(
      '--max-hourly-cost <cost>',
      'Max. instance cost in $/hr',
      (val) => parseInt(val, 10),
      1
    )
    .option(
      '--max-ports <count>',
      'Max. number of ports on machine',
      (val) => parseInt(val, 10),
      1000
    )
    .action((template, opts) =>
      provision({
        template,
        ...opts
      })
    )
    .parseAsync();
} catch (error) {
  console.error(error);
  process.exit(1);
}
