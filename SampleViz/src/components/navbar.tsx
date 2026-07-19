import { NavLink } from "react-router";

const links = [
    { to: "/", label: "Home" },
    { to: "/create", label: "Create" },
    { to: "/my-viz", label: "My Viz" },
];

export function Navbar() {
    return (
        <header className="border-b border-slate-800/70 bg-slate-950/95 sticky top-0 z-40 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                <NavLink to="/" className="flex items-center gap-3 text-slate-100">
                    <div>
                        <p className="text-2xl font-semibold">SAMPLE<span className="text-green-500">VIZ</span></p>
                        <p className="text-xs text-slate-400">Music Sample Relationship Visualizer</p>
                    </div>
                </NavLink>

                <nav className="flex flex-wrap items-center gap-2">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) =>
                                `rounded-full px-4 py-2 text-sm font-medium transition ${isActive
                                    ? "bg-cyan-500 text-slate-950"
                                    : "text-slate-300 hover:bg-slate-900/80 hover:text-slate-100"
                                }`
                            }
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </header>
    );
}
