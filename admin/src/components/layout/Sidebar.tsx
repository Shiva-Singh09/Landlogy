import {
    BarChart3,
    Building2,
    ChevronLeft,
    ClipboardList,
    FileText,
    LayoutDashboard,
    Settings,
    Users,
    X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { BrandLockup } from "../brand/BrandLockup";

type SidebarProps = {
    open: boolean;
    collapsed: boolean;
    onClose: () => void;
    onCollapseToggle: () => void;
};

const navigation = [
    {
        section: "MAIN",
        items: [
            {
                label: "Dashboard",
                path: "/dashboard",
                icon: LayoutDashboard,
            },
        ],
    },
    {
        section: "PROPERTIES",
        items: [
            {
                label: "Properties",
                path: "/properties",
                icon: Building2,
            },
        ],
    },
    {
        section: "LEADS",
        items: [
            {
                label: "Enquiries",
                path: "/enquiries",
                icon: ClipboardList,
            },
        ],
    },
    {
        section: "USERS",
        items: [
            {
                label: "Clients",
                path: "/clients",
                icon: Users,
            },
        ],
    },
    {
        section: "INSIGHTS",
        items: [
            {
                label: "Analytics",
                path: "/analytics",
                icon: BarChart3,
            },
            {
                label: "Recent Activity",
                path: "/recent-activity",
                icon: FileText,
            },
        ],
    },
    {
        section: "SYSTEM",
        items: [
            {
                label: "Account Settings",
                path: "/account-settings",
                icon: Settings,
            },
        ],
    },
];

function Sidebar({ open, collapsed, onClose, onCollapseToggle, }: SidebarProps) {
    return (
        <>
            {open && (
                <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={onClose}
                    className="fixed inset-0 z-40 bg-land-ink/30 backdrop-blur-[2px] lg:hidden"
                />
            )}

            <aside
                className={[
                    "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col overflow-hidden border-r border-white/10 bg-land-ink bg-[radial-gradient(115%_70%_at_0%_0%,color-mix(in_srgb,var(--indigo)_45%,transparent),transparent_58%),radial-gradient(95%_60%_at_100%_100%,color-mix(in_srgb,var(--emerald)_18%,transparent),transparent_62%)]",
                    "isolate",
                    "before:pointer-events-none before:absolute before:-right-24 before:-top-28 before:-z-10 before:h-80 before:w-80 before:rounded-full before:border-2 before:border-white/[0.10] before:content-[''] after:pointer-events-none after:absolute after:-bottom-32 after:-left-20 after:-z-10 after:h-96 after:w-96 after:rounded-full after:border-2 after:border-white/[0.08] after:content-['']",
                    "transition-transform duration-300 lg:translate-x-0 lg:transition-[width]",
                    collapsed ? "lg:w-[84px]" : "lg:w-[260px]",
                    open ? "translate-x-0" : "-translate-x-full",
                ].join(" ")}
            >
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
                    <div className={collapsed ? "lg:hidden" : ""}>
                        <BrandLockup
                            variant="lockup"
                            tone="light"
                            aria-label="LANDLOGY — Real Estate Ecosystem"
                            className="h-9 w-auto"
                        />
                    </div>
                    {collapsed ? (
                        <BrandLockup
                            variant="mark"
                            tone="light"
                            aria-label="LANDLOGY"
                            className="hidden h-9 w-9 shrink-0 lg:block"
                        />
                    ) : null}

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close navigation"
                            className="rounded-lg p-2 text-land-subtle transition-colors hover:bg-white/10 hover:text-white lg:hidden"
                        >
                            <X size={20} />
                        </button>

                        <button
                            type="button"
                            onClick={onCollapseToggle}
                            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            className="hidden rounded-lg border border-transparent p-2 text-land-subtle transition-all hover:bg-white/10 hover:text-white lg:block"
                        >
                            <ChevronLeft
                                size={19}
                                className={collapsed ? "rotate-180 transition-transform" : ""}
                            />
                        </button>
                    </div>
                </div>

                <nav className="sidebar-scrollbar flex-1 overflow-y-auto px-3 py-5">
                    {navigation.map((group) => (
                        <div key={group.section} className="mb-6">
                            <p
                                className={[
                                    "mb-2 px-3 text-[10px] font-extrabold tracking-[0.18em] text-white/45",
                                    collapsed ? "lg:hidden" : "",
                                ].join(" ")}
                            >
                                {group.section}
                            </p>

                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            onClick={onClose}
                                            title={collapsed ? item.label : undefined}
                                            className={({ isActive }: { isActive: boolean }) =>
                                                [
                                                    "group relative flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-semibold",
                                                    "transition-all duration-200 motion-reduce:transition-none",
                                                    collapsed ? "lg:justify-center lg:px-0" : "",
                                                    isActive
                                                        ? "border-land-emerald/30 bg-land-emerald/20 text-white"
                                                        : "text-white/70 hover:bg-white/10 hover:text-white",
                                                ].join(" ")
                                            }
                                        >
                                            {({ isActive }: { isActive: boolean }) => (
                                                <>
                                                    {isActive && (
                                                        <span className="absolute left-0 h-6 w-1 rounded-r-full bg-land-emerald" />
                                                    )}

                                                    <Icon
                                                        size={19}
                                                        strokeWidth={isActive ? 2.3 : 1.9}
                                                        className={`shrink-0 ${isActive ? "text-white" : "text-white/70 group-hover:text-white"}`}
                                                    />

                                                    <span className={`${collapsed ? "lg:hidden" : ""} ${isActive ? "text-white" : "text-white/70 group-hover:text-white"}`}>
                                                        {item.label}
                                                    </span>
                                                </>
                                            )}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div
                    className={[
                        "border-t border-white/10 p-4",
                        collapsed ? "lg:px-3" : "",
                    ].join(" ")}
                >
                    <div
                        className={[
                            "rounded-xl border border-white/10 bg-white/5 p-3",
                            collapsed ? "lg:flex lg:justify-center lg:border-transparent lg:bg-transparent lg:p-0" : "",
                        ].join(" ")}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-land-emerald text-xs font-bold text-white">
                                A
                            </div>

                            <div className={collapsed ? "lg:hidden" : ""}>
                                <p className="text-xs font-bold text-white">Administrator</p>
                                <p className="mt-0.5 text-[11px] text-land-subtle">
                                    LANDLOGY
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;
