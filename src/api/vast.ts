import {
  CreateInstanceRequest,
  CreateInstanceResponse,
  Offer,
  Offers,
  ProvisionOptions
} from '../types.js';

const baseApiUrl = 'https://console.vast.ai/api/v0';

export const getVastApiKey = (): string => {
  if (!process.env.VAST_API_KEY) {
    throw new Error('Missing VAST_API_KEY environment variable!');
  }

  return process.env.VAST_API_KEY;
};

export const searchOffers = async (
  options: ProvisionOptions
): Promise<Offer[]> => {
  const response = await fetch(`${baseApiUrl}/search/asks`, {
    method: 'PUT',
    body: JSON.stringify({
      q: {
        type: 'on-demand',
        verified: { eq: true },
        rentable: { eq: true },
        rented: { eq: false },
        num_gpus: { eq: 1 },
        gpu_ram: { gte: (options.minVram ?? 16) * 1024 },
        inet_down: { gte: 1000 },
        direct_port_count: { lte: options.maxPorts },
        limit: 25,
        order: [
          ['dph_total', 'asc'],
          ['inet_down', 'asc']
        ]
      }
    }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    redirect: 'follow'
  });
  const { offers } = (await response.json()) as unknown as Offers;

  return offers;
};

export const createInstance = async (
  offerId: number,
  request: CreateInstanceRequest
): Promise<CreateInstanceResponse> => {
  const response = await fetch(`${baseApiUrl}/asks/${offerId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getVastApiKey()}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  return (await response.json()) as unknown as CreateInstanceResponse;
};

export const stopInstance = async (instanceId: number): Promise<void> => {
  await fetch(`${baseApiUrl}/instances/${instanceId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getVastApiKey()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      state: 'stopped'
    })
  });
};

export const destroyInstance = async (instanceId: number): Promise<void> => {
  await fetch(`${baseApiUrl}/instances/${instanceId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${getVastApiKey()}`,
      'Content-Type': 'application/json'
    }
  });
};
