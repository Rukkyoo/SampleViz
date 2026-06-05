import { useState } from "react";
import { Button } from "../components/lightswind/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/lightswind/card";
import { Tooltip, TooltipTrigger } from '../components/lightswind/tooltip';
import { Input } from "../components/lightswind/input";
import type { SongEntry, RelationshipType, SavedVizPayload } from "../types/song";


const createSongEntry = (): SongEntry => ({
  id: crypto.randomUUID(),
  relationshipType: "sample",
  spotifyUrl: "",
  artistName: "",
  songTitle: "",
});

export default function CreatePage() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [originalArtist, setOriginalArtist] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [connectedSongs, setConnectedSongs] = useState<SongEntry[]>([createSongEntry()]);

  const totalCounts = connectedSongs.reduce(
    (counts, song) => {
      counts[song.relationshipType] += 1;
      return counts;
    },
    { sample: 0, interpolation: 0, parody: 0 } as Record<RelationshipType, number>,
  );

  const handleSongChange = (id: string, field: keyof SongEntry, value: string) => {
    setConnectedSongs((current) =>
      current.map((song) => (song.id === id ? { ...song, [field]: value } : song)),
    );
  };

  const handleRelationshipType = (id: string, type: RelationshipType) => {
    setConnectedSongs((current) =>
      current.map((song) => (song.id === id ? { ...song, relationshipType: type } : song)),
    );
  };

  const addSong = () => {
    setConnectedSongs((current) => [...current, createSongEntry()]);
  };

  const removeSong = (id: string) => {
    setConnectedSongs((current) => current.filter((song) => song.id !== id));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: SavedVizPayload = {
      original: {
        id: crypto.randomUUID(),
        spotifyUrl: originalUrl,
        artistName: originalArtist,
        songTitle: originalTitle,
      },
      connectedSongs,
    };    
    let list: SavedVizPayload[] = [];
    const stored = localStorage.getItem("musicPayload");
    if (stored) { // check if there is existing data before parsing
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) { // if it's already an array, use it directly
          list = parsed;
        } else if (parsed && typeof parsed === "object") { // if it's a single object, wrap it in an array
          list = [parsed];
        }
      } catch {
        // ignore
      }
    }
    list.push(payload);
    localStorage.setItem("musicPayload", JSON.stringify(list));
    
    setOriginalUrl("");
    setOriginalArtist("");
    setOriginalTitle("");
    setConnectedSongs([createSongEntry()]);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 xl:grid-cols-[1.55fr_0.95fr]">
          <div className="space-y-8">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Create Your Sample Visualizer here</p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl space-grotesk">
                Start with the original song, then add the songs that either <a className="underline text-blue-200 cursor-pointer" href="https://en.wikipedia.org/wiki/Sampling_(music)" target="_blank" rel="noopener noreferrer">sampled,</a> <a className="underline text-blue-200 cursor-pointer" href="https://en.wikipedia.org/wiki/Interpolation_(popular_music)" target="_blank" rel="noopener noreferrer">interpolated,</a> or <a className="underline text-blue-200 cursor-pointer" href="https://en.wikipedia.org/wiki/Parody_music" target="_blank" rel="noopener noreferrer">parodied</a> it.
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <section aria-labelledby="original-song-heading" className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p id="original-song-heading" className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-300">
                      1. Original Song
                    </p>
                    <p className="mt-2 max-w-2xl text-sm text-slate-400">
                      The source — the song that was sampled, interpolated, or parodied.
                    </p>
                  </div>
                  <Tooltip
                    content="Only available for spotify users, for now."
                    side="top"
                  >
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-pointer rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-cyan-300 ring-1 ring-cyan-300/20">
                        Spotify integration*
                      </span>
                    </TooltipTrigger>
                  </Tooltip>
                </div>

                <Card className="border border-slate-800/80 py-5 bg-slate-900/80 shadow-xl">
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <label htmlFor="original-spotify-url" className="text-sm font-medium text-slate-200">
                          Spotify URL
                        </label>
                        <div className="relative">
                          <Input
                            id="original-spotify-url"
                            value={originalUrl}
                            onChange={(event) => setOriginalUrl(event.target.value)}
                            placeholder="https://open.spotify.com/track/..."
                            autoComplete="off"
                            required
                          />
                          {/*  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/80 px-3 py-1 text-xs text-slate-300 ring-1 ring-slate-700">
                            {originalUrl ? "Matched" : "Paste a Spotify track URL"}
                          </span> */}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <label htmlFor="original-artist-name" className="text-sm font-medium text-slate-200">
                            Artist Name
                          </label>
                          <Input
                            id="original-artist-name"
                            value={originalArtist}
                            onChange={(event) => setOriginalArtist(event.target.value)}
                            placeholder="e.g. Marvin Gaye"
                            autoComplete="off"
                            required
                          />
                        </div>

                        <div className="grid gap-2">
                          <label htmlFor="original-song-title" className="text-sm font-medium text-slate-200">
                            Song Title
                          </label>
                          <Input
                            id="original-song-title"
                            value={originalTitle}
                            onChange={(event) => setOriginalTitle(event.target.value)}
                            placeholder="e.g. Distant Lover"
                            autoComplete="off"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section aria-labelledby="connected-songs-heading" className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p id="connected-songs-heading" className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-300">
                      2. Connected Songs
                    </p>
                    <p className="mt-2 max-w-2xl text-sm text-slate-400">
                      Add each song that samples, interpolates, or parodies the original.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {connectedSongs.map((song, index) => (
                    <Card key={song.id} className="border border-slate-800/80 bg-slate-900/80 shadow-xl">
                      <CardHeader className="flex flex-col gap-4 border-b border-slate-800/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">
                            Song {index + 1}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-white bg-red-500 hover:bg-red-800 hover:text-white cursor-pointer border-slate-700 hover:border-slate-500 animate duration-300"
                          onClick={() => removeSong(song.id)}
                        >
                          Remove
                        </Button>
                      </CardHeader>

                      <CardContent className="space-y-5">
                        <fieldset className="space-y-4">
                          <legend className="sr-only">Relationship type for song {index + 1}</legend>
                          <div className="grid grid-cols-3 gap-3 mt-5 w-fit">
                            {(["sample", "interpolation", "parody"] as RelationshipType[]).map((type) => {
                              const labelText =
                                type === "sample"
                                  ? "Sample"
                                  : type === "interpolation"
                                    ? "Interpolation"
                                    : "Parody";
                              const isActive = song.relationshipType === type;
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => handleRelationshipType(song.id, type)}
                                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${isActive
                                    ? type === "sample"
                                      ? "border-cyan-400 bg-cyan-500/10 text-cyan-200"
                                      : type === "interpolation"
                                        ? "border-violet-400 bg-violet-500/10 text-violet-200"
                                        : "border-amber-400 bg-amber-500/10 text-amber-200"
                                    : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500 hover:bg-slate-900"
                                    }`}
                                >
                                  {labelText}
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>

                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <label htmlFor={`connected-url-${song.id}`} className="text-sm font-medium text-slate-200">
                              Spotify URL
                            </label>
                            <Input
                              id={`connected-url-${song.id}`}
                              value={song.spotifyUrl}
                              onChange={(event) => handleSongChange(song.id, "spotifyUrl", event.target.value)}
                              placeholder="https://open.spotify.com/track/..."
                              autoComplete="off"
                              required
                            />
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                              <label htmlFor={`connected-artist-${song.id}`} className="text-sm font-medium text-slate-200">
                                Artist Name
                              </label>
                              <Input
                                id={`connected-artist-${song.id}`}
                                value={song.artistName}
                                onChange={(event) => handleSongChange(song.id, "artistName", event.target.value)}
                                placeholder="e.g. Kanye West"
                                autoComplete="off"
                                required
                              />
                            </div>

                            <div className="grid gap-2">
                              <label htmlFor={`connected-title-${song.id}`} className="text-sm font-medium text-slate-200">
                                Song Title
                              </label>
                              <Input
                                id={`connected-title-${song.id}`}
                                value={song.songTitle}
                                onChange={(event) => handleSongChange(song.id, "songTitle", event.target.value)}
                                placeholder="e.g. Spaceship"
                                autoComplete="off"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-between flex-col gap-4 sm:flex-row">
                  <Button type="button" variant="secondary" size="lg" className="w-80 rounded-full cursor-pointer justify-center bg-cyan-500 text-slate-950 hover:bg-cyan-800 transition duration-300" onClick={addSong}>
                    + Add Another Song
                  </Button>
                  <Button
                    type="submit"
                    variant="custom"
                    size="lg"
                    className="rounded-full bg-cyan-500 px-8 py-3 font-semibold text-slate-950 cursor-pointer hover:bg-cyan-300 transition duration-300"
                  >
                    Create Visualization
                  </Button>
                </div>
              </section>

              <section aria-labelledby="visualize-heading" className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p id="visualize-heading" className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-300">
                      3. Visualize
                    </p>
                    <p className="mt-2 max-w-2xl text-sm text-slate-400">
                      Generate your constellation graph.
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-300 ring-1 ring-slate-700">
                    Your graph will open in the interactive constellation viewer
                  </span>
                </div>

                <Card className="border border-slate-800/80 bg-slate-900/80 shadow-xl">
                  <CardContent className="space-y-4 py-5">
                    <div className="rounded-3xl border border-slate-800/70 bg-slate-950/90 px-4 py-4 text-sm text-slate-300">
                      <div className="font-medium text-slate-100">Distant Lover — Marvin Gaye</div>
                      <div className="mt-2 text-sm text-slate-400">
                        1 original · {totalCounts.sample} sample · {totalCounts.interpolation} interpolation · {totalCounts.parody} parody
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </form>
          </div>

          <aside className="space-y-6">
            <Card className="border border-slate-800/80 bg-slate-900/80 shadow-xl">
              <CardHeader spacing="compact">
                <CardTitle as="h2" size="lg" className="space-grotesk text-white">
                  Relationship Legend
                </CardTitle>
                <CardDescription>
                  Choose how each connected song relates to the original.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-950/90 px-4 py-3">
                    <span className="inline-flex h-3 w-3 shrink-0 rounded-full bg-cyan-400" />
                    <p className="text-sm text-slate-300">Sample — uses a portion of the original recording.</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-950/90 px-4 py-3">
                    <span className="inline-flex h-3 w-3 shrink-0 rounded-full bg-violet-400" />
                    <p className="text-sm text-slate-300">Interpolation — re-records elements without using original audio.</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-950/90 px-4 py-3">
                    <span className="inline-flex h-3 w-3 shrink-0 rounded-full bg-amber-400" />
                    <p className="text-sm text-slate-300">Parody — imitates the work for comic or critical effect.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-800/80 bg-slate-900/80 shadow-xl">
              <CardHeader spacing="compact">
                <CardTitle as="h2" size="lg" className="space-grotesk text-white">
                  Quick Example
                </CardTitle>
                <CardDescription>
                  Distant Lover is a classic source track. Add related songs to build your graph.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl bg-slate-950/90 p-4 text-sm text-slate-300">
                  <p className="font-medium text-slate-100">Distant Lover — Marvin Gaye</p>
                  <p className="mt-2 text-slate-400">Sampled by Kanye West on this popular track from his College Dropout album — Spaceship.</p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </main>
  );
}