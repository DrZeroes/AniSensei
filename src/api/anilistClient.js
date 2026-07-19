const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 300;

function isRetryableStatus(status) {
  return status === 429 || status >= 500;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function anilistQuery(query, variables = {}, attempt = 0) {
  const response = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok && isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
    const retryAfter = Number(response.headers?.get?.('Retry-After'));
    const delayMs = retryAfter > 0 ? retryAfter * 1000 : BASE_DELAY_MS * 2 ** attempt;
    await wait(delayMs);
    return anilistQuery(query, variables, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`AniList a répondu avec le statut ${response.status}`);
  }

  const payload = await response.json();

  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors.map((error) => error.message).join(', '));
  }

  return payload.data;
}
