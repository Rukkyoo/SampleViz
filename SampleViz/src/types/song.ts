export interface SongEntry {
  id: string;
  relationshipType: RelationshipType;
  spotifyUrl: string;
  artistName: string;
  songTitle: string;
}

export type RelationshipType = "sample" | "interpolation" | "parody";