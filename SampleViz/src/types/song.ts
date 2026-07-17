export interface SongEntry {
  id: string;
  relationshipType: RelationshipType;
  spotifyUrl: string;
  artistName: string;
  songTitle: string;
  albumName?: string;
  albumArtUrl?: string;
  releaseYear?: string;
  durationMs?: number;
  popularity?: number;
  spotifyId?: string;
}

export type RelationshipType = "sample" | "interpolation" | "parody";

export interface SavedVizPayload {
  original: Omit<SongEntry, "relationshipType">;
  connectedSongs: SongEntry[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; width?: number; height?: number }>;
    release_date: string;
  };
  duration_ms: number;
  popularity: number;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyErrorResponse {
  error: {
    status: number;
    message: string;
  };
}