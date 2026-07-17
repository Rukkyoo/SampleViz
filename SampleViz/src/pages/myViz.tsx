import { useEffect, useState, useCallback } from "react";
import { GlowingCards, GlowingCard } from "../components/lightswind/glowing-cards";
import { FaTrashAlt, FaCompactDisc, FaClock, FaFire } from "react-icons/fa";
import {
    ReactFlow,
    applyNodeChanges,
    applyEdgeChanges,
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
    Background,
    Controls,
    Handle,
    Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardDescription, CardTitle } from "../components/lightswind/card";
import type { RelationshipType, SavedVizPayload } from "../types/song";
import { getSpotifyTrackId } from "../lib/spotify";

const connectionLabels: Record<RelationshipType, string> = {
    sample: "Sample",
    interpolation: "Interpolation",
    parody: "Parody",
};

const initialNodes: Node[] = [
    { id: '1', data: { label: 'Node 1' }, position: { x: 5, y: 5 } },
    { id: '2', data: { label: 'Node 2' }, position: { x: 5, y: 100 } },
];

const initialEdges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

function formatDuration(ms?: number): string {
    if (!ms) return "";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Custom ReactFlow node to render the Spotify player directly inside the graph
// References: https://reactflow.dev/docs/guides/custom-nodes/
function SpotifyNode({ data }: { data: { label: string; spotifyUrl?: string } }) {
    const spotifyId = data.spotifyUrl ? getSpotifyTrackId(data.spotifyUrl) : null;

    return (
        <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl shadow-2xl w-60 text-center text-slate-200 backdrop-blur-sm">
            {/* Target handle (incoming connections) */}
            <Handle type="target" position={Position.Top} className="!bg-cyan-400 !w-2.5 !h-2.5" />
            
            <div className="text-[11px] font-bold text-slate-200 mb-2 truncate leading-tight select-none px-1" title={data.label}>
                {data.label}
            </div>
            
            {spotifyId ? (
                <div className="rounded-xl overflow-hidden border border-slate-950 bg-black h-[80px]">
                    <iframe
                        src={`https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0`}
                        width="100%"
                        height="80"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                    ></iframe>
                </div>
            ) : (
                <div className="text-[10px] text-slate-500 italic p-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 select-none">
                    No Spotify Track URL
                </div>
            )}
            
            {/* Source handle (outgoing connections) */}
            <Handle type="source" position={Position.Bottom} className="!bg-cyan-400 !w-2.5 !h-2.5" />
        </div>
    );
}

const nodeTypes = {
    spotifyNode: SpotifyNode,
};

export default function MyVizPage() {
    const [savedPayloads, setSavedPayloads] = useState<SavedVizPayload[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>(initialEdges);


    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes],
    );
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [setEdges],
    );


    useEffect(() => {
        const stored = localStorage.getItem("musicPayload");
        console.log("Loaded from localStorage:", stored);
        if (!stored) return;
        try {
            const parsed = JSON.parse(stored);
            let normalized: SavedVizPayload[] = [];
            if (Array.isArray(parsed)) {
                normalized = parsed;
            } else if (parsed && typeof parsed === "object") {
                normalized = [parsed];
            }
            const cleaned = normalized.map((item) => ({
                ...item,
                original: {
                    ...item.original,
                    id: item.original.id || crypto.randomUUID()
                }
            }));

            setSavedPayloads(cleaned);
        } catch {
            setSavedPayloads([]);
        }
    }, []);

    function mapPayloadToFlow(payload: SavedVizPayload) {
        const centerX = 450;
        const originY = 60;  // Original song sits at the top
        const spreadY = 380; // Connected songs fan out below
        const radius = 280;
        const originalId = payload.original.id || `orig-${Math.random().toString(36).slice(2, 9)}`;

        const nodes: Node[] = [
            {
                id: originalId,
                type: 'spotifyNode',
                data: {
                    label: `${payload.original.artistName} — ${payload.original.songTitle}`,
                    spotifyUrl: payload.original.spotifyUrl
                },
                position: { x: centerX, y: originY },
            },
        ];

        const len = Math.max(1, payload.connectedSongs.length);
        payload.connectedSongs.forEach((song, i) => {
            // Spread connected songs in a downward semicircle (0 to π)
            const angle = (len === 1 ? Math.PI / 2 : (i / (len - 1)) * Math.PI);
            const x = Math.round(centerX + Math.cos(Math.PI - angle) * radius);
            const y = Math.round(spreadY + Math.sin(angle) * (radius * 0.5));
            nodes.push({
                id: song.id,
                type: 'spotifyNode',
                data: {
                    label: `${song.artistName} — ${song.songTitle}`,
                    spotifyUrl: song.spotifyUrl
                },
                position: { x, y }
            });
        });

        const colorFor = (type: string) =>
            type === 'sample' ? '#06b6d4' : type === 'interpolation' ? '#8b5cf6' : '#f59e0b';

        const edges: Edge[] = payload.connectedSongs.map((song) => ({
            id: `e-${originalId}-${song.id}`,
            source: originalId,
            target: song.id,
            style: { stroke: colorFor(song.relationshipType), strokeWidth: 2 },
        } as Edge));

        return { nodes, edges };
    }

    const selectedPayload = selectedIndex !== null ? savedPayloads[selectedIndex] : null;

    const handleDelete = (idToDelete: string) => {
        const updated = savedPayloads.filter((payload) => payload.original.id !== idToDelete);
        setSavedPayloads(updated);
        localStorage.setItem("musicPayload", JSON.stringify(updated));

        if (selectedPayload && selectedPayload.original.id === idToDelete) {
            setSelectedIndex(null);
        } else if (selectedIndex !== null) {
            const newIndex = updated.findIndex((p) => p.original.id === selectedPayload?.original.id);
            setSelectedIndex(newIndex !== -1 ? newIndex : null);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-10 shadow-xl">
                    <div className="max-w-3xl space-y-6">
                        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">My Viz</p>
                        <h1 className="text-4xl space-grotesk font-semibold tracking-tight text-slate-50 sm:text-5xl">
                            Your saved relationship graphs.
                        </h1>
                        <p className="text-base leading-8 text-slate-400 sm:text-lg">
                            Click any card to inspect the original song and its relationship summary.
                        </p>
                    </div>
                </div>
            </section>

            <section className="mx-auto  max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 grid grid-row-2">
                {savedPayloads.length === 0 ? (
                    <Card className="border border-slate-800/80 bg-slate-900/80 shadow-xl">
                        <CardContent className="space-y-4 p-10 text-slate-300">
                            <CardTitle className="text-white">No saved visualizations yet</CardTitle>
                            <CardDescription>
                                Submit the create form first, then return here to see your cards.
                            </CardDescription>
                        </CardContent>
                    </Card>
                ) : (
                    <GlowingCards className="bg-[rgba(15,23,42,0.8)]" responsive enableGlow gap="1.5rem" padding="2rem">
                        {savedPayloads.map((payload, index) => {
                            const connectionCounts = payload.connectedSongs.reduce(
                                (counts, song) => {
                                    counts[song.relationshipType] += 1;
                                    return counts;
                                },
                                { sample: 0, interpolation: 0, parody: 0 } as Record<RelationshipType, number>,
                            );

                            const spotifyId = getSpotifyTrackId(payload.original.spotifyUrl);

                            return (
                                <div
                                    key={payload.original.id}
                                    /* glowColor={selectedIndex === index ? "#38bdf8" : "#8b5cf6"} */
                                    className={`rounded-3xl w-[80vw] md:w-[40vw] border border-slate-700/80 bg-slate-950/90 p-6 flex flex-col justify-between ${selectedIndex === index ? "scale-[1.01] border-cyan-400/80 bg-slate-900/95" : " hover:border-slate-500/80"
                                        }`}

                                >
                                    <div className="space-y-5 flex-1 flex flex-col justify-between">
                                        <div className="space-y-4">
                                            {/* Header Section with Album Artwork */}
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    {payload.original.albumArtUrl ? (
                                                        <div className="relative shrink-0 group">
                                                            <img
                                                                src={payload.original.albumArtUrl}
                                                                alt={payload.original.albumName}
                                                                className="h-14 w-14 rounded-xl object-cover border border-slate-800/80 shadow"
                                                            />
                                                            <FaCompactDisc className="absolute -bottom-1 -right-1 text-slate-400 bg-slate-950 rounded-full text-sm p-0.5 animate-spin duration-10000" />
                                                        </div>
                                                    ) : (
                                                        <div className="h-14 w-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                                                            <FaCompactDisc className="text-slate-600 text-xl" />
                                                        </div>
                                                    )}
                                                    <div className="overflow-hidden leading-tight">
                                                        <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/70">Original Track</p>
                                                        <h2 className="text-lg font-bold text-slate-100 truncate mt-0.5">{payload.original.songTitle}</h2>
                                                        <p className="text-xs text-slate-400 truncate mt-0.5">{payload.original.artistName}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(payload.original.id);
                                                    }}
                                                    className="rounded-full p-2 cursor-pointer text-slate-500 hover:bg-slate-900 hover:text-red-400 transition shrink-0"
                                                    title="Delete Visualization"
                                                >
                                                    <FaTrashAlt />
                                                </button>
                                            </div>

                                            {/* Spotify Player Embed */}
                                            {spotifyId && (
                                                <div className="rounded-2xl overflow-hidden border border-slate-800/80 shadow-md bg-slate-950/30">
                                                    <iframe
                                                        src={`https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator&theme=0`}
                                                        width="100%"
                                                        height="80"
                                                        frameBorder="0"
                                                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                                        loading="lazy"
                                                    ></iframe>
                                                </div>
                                            )}

                                            {/* Metadata Badges */}
                                            {(payload.original.albumName || payload.original.releaseYear || payload.original.durationMs) && (
                                                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800/60 p-3 leading-tight">
                                                    {payload.original.albumName && (
                                                        <div className="col-span-2 truncate">
                                                            <span className="text-slate-500 uppercase tracking-wider text-[9px]">Album:</span> {payload.original.albumName}
                                                        </div>
                                                    )}
                                                    {payload.original.releaseYear && (
                                                        <div>
                                                            <span className="text-slate-500 uppercase tracking-wider text-[9px]">Released:</span> {payload.original.releaseYear}
                                                        </div>
                                                    )}
                                                    {payload.original.durationMs && (
                                                        <div className="flex items-center gap-1">
                                                            <FaClock className="text-slate-500 text-[10px]" />
                                                            <span>{formatDuration(payload.original.durationMs)}</span>
                                                        </div>
                                                    )}
                                                    {payload.original.popularity !== undefined && (
                                                        <div className="col-span-2 mt-1 flex items-center gap-2">
                                                            <span className="text-slate-500 uppercase tracking-wider text-[9px] flex items-center gap-1">
                                                                <FaFire className="text-amber-500" /> Popularity:
                                                            </span>
                                                            <div className="h-1.5 flex-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                                                <div
                                                                    className="h-full bg-emerald-500 rounded-full"
                                                                    style={{ width: `${payload.original.popularity}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-semibold text-emerald-400">{payload.original.popularity}%</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between border-t border-slate-800/60 pt-3">
                                                <span className="text-xs text-slate-400">
                                                    Original · {connectionCounts.sample} sample · {connectionCounts.interpolation} interpolation · {connectionCounts.parody} parody
                                                </span>
                                                <button
                                                    className="text-xs text-cyan-300 hover:text-cyan-400 cursor-pointer underline font-medium flex items-center gap-1"
                                                    onClick={() => {
                                                        const g = mapPayloadToFlow(payload);
                                                        setNodes(g.nodes);
                                                        setEdges(g.edges);
                                                        setSelectedIndex(index);
                                                    }}
                                                >
                                                    View Connections
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex text-sm flex-wrap gap-2">
                                            {(['sample', 'interpolation', 'parody'] as RelationshipType[]).map((type) => {
                                                const present = connectionCounts[type] > 0;
                                                if (!present) return null;
                                                const color =
                                                    type === 'sample'
                                                        ? 'bg-cyan-500/10 text-cyan-200 border-cyan-500/25'
                                                        : type === 'interpolation'
                                                            ? 'bg-violet-500/10 text-violet-200 border-violet-500/25'
                                                            : 'bg-amber-500/10 text-amber-200 border-amber-500/25';
                                                return (
                                                    <div key={type} className={`rounded-full border px-3 w-fit py-1.5 text-center font-semibold text-[11px] ${color}`}>
                                                        {connectionLabels[type]} ({connectionCounts[type]})
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </GlowingCards>
                )}

                {selectedPayload && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="relative h-[80vh] w-full max-w-5xl rounded-3xl border border-slate-700/80 bg-slate-900/95 shadow-2xl flex flex-col overflow-hidden">
                            <button
                                onClick={() => setSelectedIndex(null)}
                                className="absolute right-6 top-6 text-slate-400 hover:text-slate-100 transition z-50"
                                aria-label="Close modal"
                            >
                                <span className="text-3xl cursor-pointer">×</span>
                            </button>
                            <div className="flex-1 overflow-hidden p-6 mt-6">
                                <ReactFlow 
                                    colorMode="dark" 
                                    nodes={nodes}
                                    edges={edges}
                                    onNodesChange={onNodesChange}
                                    onEdgesChange={onEdgesChange} 
                                    nodeTypes={nodeTypes}
                                    fitView
                                >
                                    <Background />
                                    <Controls />
                                </ReactFlow>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}
