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
  console.log(
    '\nPress Ctrl-D to stop the instance, or Ctrl-C to destroy it...'
  );
  process.stdin.resume();
  process.on('SIGQUIT', async () => {
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
  });
  process.on('SIGINT', async () => {
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
  });
};

export const provision = async (options: ProvisionOptions): Promise<void> => {
  try {
    const template = await chooseTemplate(options);
    const modules = await chooseModules(template);
    const offers = await searchOffers(options);
    const offer = await chooseOffer(options, offers);

    const diskSizeBytes = calculateDiskSize(template, modules);
    const confirmed = await confirmDeployment({
      template,
      modules,
      offer,
      diskSizeBytes,
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
