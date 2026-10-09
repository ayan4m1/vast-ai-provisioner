import chalk from 'chalk';
import { filesize } from 'filesize';
import { sprintf } from 'sprintf-js';
import { interpolateRgb } from 'd3-interpolate';
import { formatDistanceToNow, fromUnixTime } from 'date-fns';
import { checkbox, confirm, select } from '@inquirer/prompts';

import { Module, Offer, ProvisionOptions, Template } from './types.js';
import { loadModules, loadTemplate, loadTemplates } from './catalog.js';

const rtx5000Regex = /rtx\s*5[0-9]{3}/i;

export const chooseTemplate = async (
  options: ProvisionOptions
): Promise<Template> => {
  if (options.template) {
    return loadTemplate(options.template);
  }

  const templateMap = await loadTemplates();
  const chosenTemplate = await select<string>({
    message: 'Please choose a template to deploy.',
    choices: Array.from(
      templateMap.entries().map(([path, contents]) => ({
        name: contents.description
          ? `${contents.name} - ${contents.description}`
          : contents.name,
        value: path
      }))
    )
  });

  return loadTemplate(chosenTemplate);
};

export const chooseModules = async (template: Template): Promise<Module[]> => {
  const modules = await loadModules(template);

  if (!modules.length) {
    return [];
  }

  return checkbox<Module>({
    loop: false,
    message: 'Please choose the modules you would like to include.',
    choices: modules.map((module) => ({
      name: `${module.name} (${filesize(module.totalSize)})`,
      value: module
    }))
  });
};

const formatOffers = (options: ProvisionOptions, offers: Offer[]) => {
  const minPrice = offers.reduce(
    (prev, curr) =>
      prev < curr.search.totalHour ? prev : curr.search.totalHour,
    100
  );
  const maxPrice = offers.reduce(
    (prev, curr) =>
      prev > curr.search.totalHour ? prev : curr.search.totalHour,
    0
  );

  return offers
    .filter((offer) => !rtx5000Regex.test(offer.gpu_name))
    .filter(
      (offer) => offer.search.totalHour <= (options.maxHourlyCost ?? 1000)
    )
    .map((offer) => {
      // convert GB to bytes, then format as rounded GB
      const vramGb = filesize(offer.gpu_ram * 1e6, {
        exponent: 3,
        round: 0,
        roundingMethod: 'floor'
      });
      // interpolate relative cost from cheapest to most expensive
      const costRgb = interpolateRgb(
        '#00ff00',
        '#ff0000'
      )((offer.search.totalHour - minPrice) / (maxPrice - minPrice))
        .replace('rgb(', '')
        .replace(')', '')
        .split(',')
        .map((val) => parseInt(val, 10));
      const costHex = `#${((1 << 24) + (costRgb[0] << 16) + (costRgb[1] << 8) + costRgb[2]).toString(16).slice(1)}`;

      return {
        name: sprintf(
          '%-6s %-12s %-16s %8s %s',
          vramGb,
          offer.gpu_name,
          offer.geolocation,
          `${Math.floor(offer.inet_down)} Mbps`,
          chalk.bgHex(costHex)(`$${offer.search.totalHour.toFixed(3)}/hr`)
        ),
        value: offer
      };
    });
};

export const chooseOffer = (
  options: ProvisionOptions,
  offers: Offer[]
): Promise<Offer> =>
  select<Offer>({
    message: 'Choose the instance you would like to request.',
    choices: formatOffers(options, offers),
    loop: false
  });

export type DeploymentSummary = {
  template: Template;
  modules: Module[];
  offer: Offer;
  diskSizeBytes: number;
  hourlyCosts: { running: number; stopped: number };
};

export const confirmDeployment = ({
  template,
  modules,
  offer,
  diskSizeBytes,
  hourlyCosts
}: DeploymentSummary): Promise<boolean> => {
  const hourlyCost = `$${hourlyCosts.running.toFixed(3)}/hr`;
  const storageCost = `$${hourlyCosts.stopped.toFixed(3)}/hr`;
  const message = `
Template: ${template.name}
Modules:
${modules.map((module) => `  * ${module.name} (${filesize(module.totalSize)})`).join('\n')}
Disk Size: ${filesize(diskSizeBytes)}

Are you SURE you want create the instance?

It will be automatically destroyed in ${formatDistanceToNow(fromUnixTime(offer.end_date))}.

You will be charged ${hourlyCost} while it is running and ${storageCost} while it is stopped!

It is YOUR responsibility to make sure that it has been stopped or destroyed correctly!
`;

  return confirm({
    message,
    default: false
  });
};
