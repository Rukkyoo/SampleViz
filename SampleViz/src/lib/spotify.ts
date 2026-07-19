import type { SpotifyTrack, SpotifyErrorResponse } from "../types/song";

export function getSpotifyTrackId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  
  if (trimmed.includes("spotify.com/track/")) {
    const parts = trimmed.split("spotify.com/track/");
    if (parts[1]) {
      return parts[1].split("?")[0].split("/")[0].trim();
    }
  }
  
  if (trimmed.startsWith("spotify:track:")) {
    const parts = trimmed.split("spotify:track:");
    if (parts[1]) {
      return parts[1].trim();
    }
  }

  return null;
}

export async function getAccessToken(): Promise<string> {
  const storedToken = localStorage.getItem("spotify_cc_token");
  const storedExpires = localStorage.getItem("spotify_cc_expires");
  
  if (storedToken && storedExpires) {
    const expiresTime = parseInt(storedExpires, 10);
    if (Date.now() < expiresTime - 60000) {
      return storedToken;
    }
  }

  const clientId = process.env.CLIENT_ID || "";
  const clientSecret = process.env.CLIENT_SECRET || "";

  if (!clientId || !clientSecret) {
    throw new Error("Spotify Client ID or Client Secret is not defined in the environment. Please check your .env file.");
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
    })
  });

  if (!response.ok) {
    throw new Error(`Spotify authentication failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log(data)
  const token = data.access_token;
  const expires = Date.now() + data.expires_in * 1000;

  localStorage.setItem("spotify_cc_token", token);
  localStorage.setItem("spotify_cc_expires", expires.toString());

  return token;
}

export async function fetchSpotifyAPI(
  url: string,
  options: RequestInit = {},
  retries: number = 0
): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);

  if (response.status === 429) {
    const retryAfterHeader = response.headers.get('Retry-After');
    const delaySeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : Math.pow(2, retries);
    const delayMs = delaySeconds * 1000 + 100; 
    
    if (retries < 3) {
      console.warn(`[Spotify API] Rate limited (429). Retrying after ${delayMs}ms. Retry count: ${retries + 1}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return fetchSpotifyAPI(url, options, retries + 1);
    }
  }

  return response;
}


export async function getTrackDetails(trackId: string): Promise<SpotifyTrack> {
  const response = await fetchSpotifyAPI(`https://api.spotify.com/v1/tracks/${trackId}`);
  
  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errData = (await response.json()) as SpotifyErrorResponse;
      if (errData.error?.message) {
        errorMessage = errData.error.message;
      }
    } catch {
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<SpotifyTrack>;
}

export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  const encodedQuery = encodeURIComponent(query);
  const response = await fetchSpotifyAPI(
    `https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=6`
  );

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errData = (await response.json()) as SpotifyErrorResponse;
      if (errData.error?.message) {
        errorMessage = errData.error.message;
      }
    } catch {
    }
    throw new Error(errorMessage);
  }

  const data = await response.json() as { tracks: { items: SpotifyTrack[] } };
  return data.tracks?.items || [];
}
