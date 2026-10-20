const whoamiUrl = 'https://huggingface.co/api/whoami-v2';

// matches the host check in provisioning_download in scripts/*.sh
const huggingFaceUrlRegex =
  /^https:\/\/([a-zA-Z0-9_-]+\.)?huggingface\.co(\/|$|\?)/;

export const isHuggingFaceUrl = (url: string): boolean =>
  huggingFaceUrlRegex.test(url);

/**
 * Returns an Authorization header only for Hugging Face URLs, so the token is
 * never sent to any other host.
 */
export const getHfAuthHeaders = (
  url: string,
  token?: string
): Record<string, string> =>
  token && isHuggingFaceUrl(url) ? { Authorization: `Bearer ${token}` } : {};

export const validateHfToken = async (token: string): Promise<boolean> => {
  const response = await fetch(whoamiUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.ok;
};
