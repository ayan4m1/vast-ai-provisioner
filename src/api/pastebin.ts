const pastebinApiUrl = 'https://pastebin.com/api/api_post.php';

/**
 * Uploads a bash script as a private paste and returns its raw URL.
 */
export const uploadScript = async (script: string): Promise<string> => {
  if (!process.env.PASTEBIN_API_KEY) {
    throw new Error('Must provide PASTEBIN_API_KEY env var!');
  }

  const postData = new FormData();

  postData.append('api_dev_key', process.env.PASTEBIN_API_KEY);
  postData.append('api_option', 'paste');
  postData.append('api_paste_code', script);
  postData.append('api_paste_private', '1');
  postData.append('api_paste_format', 'bash');
  postData.append('api_paste_name', 'provision.sh');
  postData.append('api_paste_expire_date', '10M');

  const result = await fetch(pastebinApiUrl, {
    method: 'POST',
    body: postData
  });
  const url = await result.text();

  return url.replace('pastebin.com/', 'pastebin.com/raw/');
};
