import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { GlowingCards } from "../components/lightswind/glowing-cards";
import { FaTrashAlt, FaCompactDisc, FaClock, FaFire, FaPaperPlane, FaRobot, FaUser, FaInfoCircle } from "react-icons/fa";
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
import { formatDate } from "../lib/utils";
import { getSpotifyTrackId } from "../lib/spotify";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
function SpotifyNode({ data }: { data: { label: string; spotifyUrl?: string } }) {
    const spotifyId = data.spotifyUrl ? getSpotifyTrackId(data.spotifyUrl) : null;

    return (
        <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-2xl shadow-2xl w-60 text-center text-slate-200 backdrop-blur-sm">
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

            <Handle type="source" position={Position.Bottom} className="!bg-cyan-400 !w-2.5 !h-2.5" />
        </div>
    );
}

const nodeTypes = {
    spotifyNode: SpotifyNode,
};

function ConnectionsModalContent({
    payload,
    onClose,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    nodeTypes,
}: {
    payload: SavedVizPayload;
    onClose: () => void;
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    nodeTypes: any;
}) {
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState('');
    const [graphExpanded, setGraphExpanded] = useState(false);

    const { messages, sendMessage, error, status } = useChat({
        transport: useMemo(() => new DefaultChatTransport({
            api: '/api/chat',
            body: {
                songData: payload,
            }
        }), [payload]),
        messages: [
            {
                id: 'welcome',
                role: 'assistant',
                parts: [{
                    type: 'text',
                    text: `Hi! I'm your Music Historian. I've loaded the connection graph for **${payload.original.songTitle}** by **${payload.original.artistName}**. 

I can explain:
- What these relationships mean for these tracks.
- How the newer songs (like **${payload.connectedSongs.map(s => s.songTitle).join(', ')}**) sample or interpolate the original.
- The historical significance and trivia of these connections.

Ask me any questions about the samples!`
                }],
            },
        ],
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim()) return;
        sendMessage({ text: input });
        setInput('');
    };

    const isLoading = status === 'streaming' || status === 'submitted';

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="relative h-[100dvh] sm:h-[90vh] w-full max-w-6xl rounded-none sm:rounded-3xl border-0 sm:border border-slate-800 bg-slate-900/95 shadow-2xl flex flex-col overflow-hidden animate duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 sm:px-6 sm:py-4 shrink-0 bg-slate-950/40">
                <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-slate-100 space-grotesk truncate">Constellation Analysis</h3>
                    <p className="text-[11px] sm:text-xs text-cyan-400">Interactive Connections &amp; Historian Chat</p>
                </div>
                <button
                    onClick={onClose}
                    className="rounded-full p-1 cursor-pointer text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition shrink-0"
                    aria-label="Close modal"
                >
                    <span className="text-2xl px-2 font-bold">×</span>
                </button>
            </div>

            {/* Split Screen Layout */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
                {/* Left Side: ReactFlow Connection Graph */}
                <div
                    className={`relative border-r border-slate-800/50 bg-slate-950/20 shrink-0 transition-[height] duration-200 ${graphExpanded ? "h-[65vh]" : "h-[34vh]"
                        } lg:h-auto lg:flex-1`}
                >
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
                    <span className="absolute bottom-2 left-4 text-[10px] text-slate-600 select-none hidden sm:inline">
                        Interactive Constellation Graph
                    </span>
                    {/* Mobile-only expand/collapse toggle for the graph area */}
                    <button
                        onClick={() => setGraphExpanded((v) => !v)}
                        className="lg:hidden absolute bottom-2 right-2 rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1 text-[10px] font-semibold text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition"
                    >
                        {graphExpanded ? "Shrink graph" : "Expand graph"}
                    </button>
                </div>

                {/* Right Side: Chat Assistant Panel */}
                <div className="w-full lg:w-[400px] xl:w-[440px] flex-1 lg:flex-none flex flex-col bg-slate-950/50 backdrop-blur-sm overflow-hidden min-h-0 border-t lg:border-t-0 border-slate-800">
                    {/* Chat Messages */}
                    <div
                        ref={chatContainerRef}
                        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 text-xs min-h-0"
                    >
                        {messages.map((message: UIMessage) => {
                            const isAssistant = message.role === 'assistant';
                            return (
                                <div
                                    key={message.id}
                                    className={`flex gap-2.5 max-w-[85%] sm:max-w-[90%] ${isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                                >
                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] shrink-0 ${isAssistant ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                                        }`}>
                                        {isAssistant ? <FaRobot /> : <FaUser />}
                                    </div>
                                    <div className={`rounded-2xl px-3.5 py-2.5 leading-relaxed overflow-hidden ${isAssistant
                                        ? 'bg-slate-900/90 border border-slate-800 text-slate-200'
                                        : 'bg-cyan-500 text-slate-950 font-medium'
                                        }`}>
                                        {message.parts?.map((part, i) => {
                                            if (part.type === 'text') {
                                                return (
                                                    <div
                                                        key={i}
                                                        className="prose prose-invert prose-sm max-w-none
                           prose-p:my-2 prose-ul:my-2 prose-ul:pl-4 prose-li:my-0.5
                           prose-strong:text-cyan-300 prose-headings:text-slate-100
                           prose-a:text-cyan-400"
                                                    >
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {part.text}
                                                        </ReactMarkdown>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {error && (
                            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 p-3">
                                <FaInfoCircle className="shrink-0" />
                                <span>Failed to generate: {error.message || "Quota exceeded or network issue."}</span>
                            </div>
                        )}
                    </div>

                    {/* Chat Input form */}
                    <form
                        onSubmit={handleSubmit}
                        className="border-t border-slate-800/80 p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4 bg-slate-950/80 shrink-0 flex items-center gap-2"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Ask the Music Historian about these samples..."
                            className="flex-1 min-w-0 rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                            disabled={isLoading}
                            required
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="rounded-full bg-cyan-500 p-2 text-slate-950 hover:bg-cyan-400 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            <FaPaperPlane className="text-[10px]" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

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
        const originY = 60;
        const spreadY = 380;
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

            <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 grid grid-row-2">
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
                        <ConnectionsModalContent
                            payload={selectedPayload}
                            onClose={() => setSelectedIndex(null)}
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            nodeTypes={nodeTypes}
                        />
                    </div>
                )}
            </section>
        </main>
    );
}