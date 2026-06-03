export default function MyVizPage() {
    return (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-10 shadow-xl">
                <div className="max-w-3xl space-y-6">
                    <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">My Viz</p>
                    <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
                        Your saved relationship graphs.
                    </h1>
                    <p className="text-base leading-8 text-slate-400 sm:text-lg">
                        This page is ready to show the visualizations you create. Navigate back to Create to build a new graph.
                    </p>
                </div>
            </div>
        </section>
    );
}
