import { ExitPromptError } from '@inquirer/core';

import {
  createInstance,
  destroyInstance,
  getVastApiKey,
  searchOffers,
  stopInstance
} from './api/vast.js';
import { buildScript } from './script.js';
import { readScript } from './catalog.js';
import { uploadScript } from './api/pastebin.js';
import { calculateDiskSize, calculateHourlyCosts } from './sizing.js';
import { CreateInstanceRequest, ProvisionOptions } from './types.js';
import {
  chooseModules,
  chooseOffer,
  chooseTemplate,
  confirmDeployment
} from './prompts.js';

const registerShutdownHandlers = (instanceId?: number): void => {
  let handling = false;

  const stop = async (): Promise<void> => {
    if (handling) {
      return;
    }
    handling = true;

    if (!instanceId) {
      console.error('No instance to stop! Exiting...');
      return process.exit(0);
    }

    try {
      await stopInstance(instanceId);

      console.log(`Instance ${instanceId} stopped! Exiting...`);
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  };

  const destroy = async (): Promise<void> => {
    if (handling) {
      return;
    }
    handling = true;

    if (!instanceId) {
      console.error('No instance to destroy! Exiting...');
      return process.exit(0);
    }

    try {
      await destroyInstance(instanceId);

      console.log(`Instance ${instanceId} destroyed! Exiting...`);
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  };

  console.log('\nPress S to stop the instance, or Ctrl-C to destroy it...');

  // raw mode delivers single keypresses, and Ctrl-C arrives as data, not SIGINT
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.setEncoding('utf8');
  process.stdin.resume();
  process.stdin.on('data', (key: string) => {
    if (key === 's' || key === 'S') {
      void stop();
    } else if (key === '\u0003') {
      void destroy();
    }
  });
  // fallback for non-TTY stdin, where Ctrl-C is still delivered as a signal
  process.on('SIGINT', () => void destroy());
};

export const provision = async (options: ProvisionOptions): Promise<void> => {
  try {
    const template = await chooseTemplate(options);
    const { modules, hfToken } = await chooseModules(template);
    const offers = await searchOffers(options);
    const offer = await chooseOffer(options, offers);

    const diskSizeBytes = calculateDiskSize(template, modules);
    const confirmed = await confirmDeployment({
      template,
      modules,
      offer,
      diskSizeBytes,
      hfToken,
      hourlyCosts: calculateHourlyCosts(offer, diskSizeBytes)
    });

    if (!confirmed) {
      return console.log('Exiting because user declined to deploy.');
    }

    console.log(
      `Deploying ${template.name} to offer ${offer.id} (${offer.gpu_name})...`
    );

    const environmentVars: Record<string, string> = {
      ...template.environment
    };

    // set after the template defaults so a user-provided token always wins
    if (hfToken) {
      environmentVars.HF_TOKEN = hfToken;
    }

    if (template.script) {
      environmentVars.PROVISIONER_SCRIPT = await uploadScript(
        buildScript(template, modules, await readScript(template))
      );
    }

    const request: CreateInstanceRequest = {
      extra_env: environmentVars,
      disk: diskSizeBytes / 1e9, // convert to GB
      target_state: 'running',
      cancel_unavail: true,
      vm: false
    };

    if (template.hash) {
      request.template_hash_id = template.hash;
    } else if (template.tag) {
      request.image = template.tag;
      request.runtype = template.runType;
    }

    // fail before deploying if the key is missing
    getVastApiKey();

    const result = await createInstance(offer.id, request);

    if (result.success) {
      console.log(`Instance ${result.new_contract} created!`);
    } else {
      console.log('Failed to create instance!');
    }

    registerShutdownHandlers(result.new_contract);
  } catch (error: unknown) {
    if (error instanceof ExitPromptError) {
      console.log('User requested cancellation of the provisioning process...');
    } else {
      console.error(error);
      process.exitCode = 1;
    }
  }
};
