import { useEffect, useState, useCallback } from "react";
import { GlowingCards, GlowingCard } from "../components/lightswind/glowing-cards";
import { FaTrashAlt } from "react-icons/fa";
import {
    ReactFlow,
    applyNodeChanges,
    applyEdgeChanges,
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
    Background,
    Controls
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardDescription, CardTitle } from "../components/lightswind/card";
import type { RelationshipType, SavedVizPayload } from "../types/song";

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
        const centerX = 400;
        const centerY = 180;
        const radius = 120;
        const originalId = payload.original.id || `orig-${Math.random().toString(36).slice(2, 9)}`;

        const nodes: Node[] = [
            {
                id: originalId,
                data: { label: `${payload.original.artistName} — ${payload.original.songTitle}` },
                position: { x: centerX, y: centerY },
            },
        ];

        const len = Math.max(1, payload.connectedSongs.length);
        payload.connectedSongs.forEach((song, i) => {
            const angle = (i / len) * Math.PI * 2 - Math.PI / 2;
            const x = Math.round(centerX + Math.cos(angle) * radius);
            const y = Math.round(centerY + Math.sin(angle) * radius);
            nodes.push({ id: song.id, data: { label: `${song.artistName} — ${song.songTitle}` }, position: { x, y } });
        });

        const colorFor = (type: string) =>
            type === 'sample' ? '#06b6d4' : type === 'interpolation' ? '#8b5cf6' : '#f59e0b';

        const edges: Edge[] = payload.connectedSongs.map((song) => ({
            id: `e-${originalId}-${song.id}`,
            source: originalId,
            target: song.id,
            style: { stroke: colorFor(song.relationshipType) },
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

                            return (
                                <GlowingCard
                                    key={payload.original.id}
                                    glowColor={selectedIndex === index ? "#38bdf8" : "#8b5cf6"}
                                    className={`rounded-3xl w-[80vw] md:w-[40vw] h-[75vh] md:h-[45vh] lg:h-[60vh] border border-slate-700/80 bg-slate-950/90 p-6 ${selectedIndex === index ? "scale-[1.01] border-cyan-400/80 bg-slate-900/95" : " hover:border-slate-500/80"
                                        }`}

                                >
                                    <div className="space-y-5">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-2">
                                                <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/70">Original Artist</p>
                                                <h2 className="text-2xl font-semibold text-slate-100 space-grotesk">{payload.original.artistName}</h2>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(payload.original.id);
                                                }}
                                                className="rounded-full p-2 cursor-pointer text-slate-500 hover:bg-slate-900 hover:text-red-400 transition"
                                                title="Delete Visualization"
                                            >
                                                <FaTrashAlt />
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/70">Original Song</p>
                                            <p className="text-lg font-medium text-slate-200">{payload.original.songTitle}</p>
                                            <p
                                                className="text-cyan-300/70 hover:text-cyan-400 cursor-pointer underline"
                                                onClick={() => {
                                                    const g = mapPayloadToFlow(payload);
                                                    setNodes(g.nodes);
                                                    setEdges(g.edges);
                                                    setSelectedIndex(index);
                                                }}
                                            >
                                                View Connections
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4">
                                            <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/70">Total Connections</p>
                                            <p className="mt-2 text-3xl font-bold text-cyan-400">{payload.connectedSongs.length}</p>
                                        </div>

                                        <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                                            {(['sample', 'interpolation', 'parody'] as RelationshipType[]).map((type) => (
                                                <div key={type} className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-3 text-wrap">
                                                    <p className="font-semibold text-[9px] text-slate-100">{connectionLabels[type]}</p>
                                                    <p className="mt-1 text-xl text-cyan-300">{connectionCounts[type]}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex  text-sm flex-wrap gap-2">
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
                                                    <div key={type} className={`rounded-full border px-3 w-fit py-2 text-center font-semibold ${color}`}>
                                                        {connectionLabels[type]}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </GlowingCard>
                            );
                        })}
                    </GlowingCards>
                )}

                {selectedPayload && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="relative h-96 w-full max-w-2xl rounded-3xl border border-slate-700/80 bg-slate-900/95 shadow-2xl">
                            <button
                                onClick={() => setSelectedIndex(null)}
                                className="absolute right-4 top-4 text-slate-400 hover:text-slate-100 transition"
                                aria-label="Close modal"
                            >
                                <span className="text-3xl cursor-pointer">×</span>
                            </button>
                            <div className="h-full overflow-y-auto p-8 mx-2">
                                <ReactFlow colorMode="dark" nodes={nodes}
                                    edges={edges}
                                    onNodesChange={onNodesChange}
                                    onEdgesChange={onEdgesChange} fitView>
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
