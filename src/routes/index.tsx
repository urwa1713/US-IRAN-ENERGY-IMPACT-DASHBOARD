import { createFileRoute } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  ComposedChart,
  Area,
  LabelList,
} from "recharts";
import {
  LayoutDashboard,
  Database,
  LineChart as LineIcon,
  Cpu,
  FileText,
  Filter,
  RefreshCw,
  Share2,
  Download,
  ChevronDown,
  Search,
  Bell,
  TrendingUp,
  TrendingDown,
  Minus,
  Pin,
  MoreHorizontal,
  Fuel,
  DollarSign,
  Activity,
  Target,
  Menu,
  X,
  Check,
  Info,
  Loader2,
} from "lucide-react";
import {
  MONTHLY,
  aggregate,
  TIME_RANGES,
  COMMODITIES,
  type CommodityId,
  EVENTS,
  EVENT_COLORS,
  CORRELATIONS,
  LAGS,
  INTENSITY,
  MODEL_PERF,
  REGIONS,
} from "@/lib/dashboard-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "U.S.–Iran Conflict & Pakistan Energy Prices · BI Report" },
      {
        name: "description",
        content:
          "Interactive BI dashboard on how U.S.–Iran conflict events transmit into Brent crude and Pakistani fuel prices, with EDA and model benchmarks.",
      },
      { property: "og:title", content: "U.S.–Iran Conflict & Pakistan Energy Prices" },
      {
        property: "og:description",
        content:
          "Event studies, transmission lags and Random Forest forecasts on Brent crude and OGRA fuel prices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

// ————————————————————————————————————————————
// Global dashboard state
// ————————————————————————————————————————————

const NAV_PAGES = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "sources", label: "Data Sources", icon: Database },
  { id: "eda", label: "Exploratory Analysis", icon: LineIcon },
  { id: "models", label: "Model Performance", icon: Cpu },
  { id: "policy", label: "Policy Report", icon: FileText },
] as const;

type PageId = (typeof NAV_PAGES)[number]["id"];

type Filters = {
  range: (typeof TIME_RANGES)[number]["id"];
  commodities: CommodityId[];
  eventType: "All" | "Military" | "Sanctions" | "Diplomatic";
  region: (typeof REGIONS)[number];
  frequency: "Monthly" | "Quarterly";
};

const DEFAULT_FILTERS: Filters = {
  range: "full",
  commodities: ["brent", "petrol", "diesel"],
  eventType: "All",
  region: "Pakistan",
  frequency: "Monthly",
};

type Ctx = {
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  page: PageId;
  goToPage: (p: PageId) => void;
  refreshKey: number;
  refreshing: boolean;
  refresh: () => void;
  lastRefreshed: Date;
  toast: (msg: string) => void;
  highlight: string | null;
  series: ReturnType<typeof aggregate>;
  events: typeof EVENTS[number][];
};

const DashCtx = createContext<Ctx | null>(null);
const useDash = () => useContext(DashCtx)!;

// ————————————————————————————————————————————
// Shell
// ————————————————————————————————————————————

function Dashboard() {
  const [page, setPage] = useState<PageId>("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const setFilters = useCallback(
    (f: Partial<Filters>) => setFiltersState((prev) => ({ ...prev, ...f })),
    [],
  );

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshKey((k) => k + 1);
      setLastRefreshed(new Date());
      setRefreshing(false);
      toast("Report refreshed");
    }, 700);
  }, [toast]);

  const goToPage = useCallback((p: PageId) => {
    setPage(p);
    setNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const searchTo = useCallback(
    (p: PageId, label: string) => {
      goToPage(p);
      setHighlight(label);
      window.setTimeout(() => {
        const el = document.querySelector(`[data-tile="${CSS.escape(label)}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
      window.setTimeout(() => setHighlight(null), 4000);
    },
    [goToPage],
  );

  // Filtered + aggregated series
  const series = useMemo(() => {
    const r = TIME_RANGES.find((t) => t.id === filters.range)!;
    const rows = MONTHLY.filter((p) => p.key >= r.start && p.key <= r.end);
    return aggregate(rows, filters.frequency);
  }, [filters.range, filters.frequency]);

  const events = useMemo(
    () =>
      filters.eventType === "All"
        ? [...EVENTS]
        : EVENTS.filter((e) => e.name === filters.eventType),
    [filters.eventType],
  );

  const ctx: Ctx = {
    filters,
    setFilters,
    page,
    goToPage,
    refreshKey,
    refreshing,
    refresh,
    lastRefreshed,
    toast,
    highlight,
    series,
    events,
  };

  return (
    <DashCtx.Provider value={ctx}>
      <div className="min-h-screen flex bg-canvas text-ink font-sans">
        <SidebarNav open={navOpen} onClose={() => setNavOpen(false)} />
        {navOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-hidden
          />
        )}
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onMenu={() => setNavOpen(true)} onSearchPick={searchTo} reportRef={reportRef} />
          <FilterBar />
          <main
            ref={reportRef}
            className="flex-1 p-3 sm:p-4 overflow-x-hidden bg-canvas relative"
          >
            {refreshing && (
              <div className="absolute inset-0 z-20 bg-canvas/60 backdrop-blur-[1px] grid place-items-center">
                <div className="flex items-center gap-2 text-[12.5px] text-ink-soft bg-tile border border-hairline rounded px-3 py-2 shadow-md">
                  <Loader2 className="w-4 h-4 animate-spin text-brand" /> Refreshing report…
                </div>
              </div>
            )}
            <div key={refreshKey}>
              {page === "overview" && <OverviewPage />}
              {page === "sources" && <SourcesPage />}
              {page === "eda" && <EdaPage />}
              {page === "models" && <ModelsPage />}
              {page === "policy" && <PolicyPage />}
            </div>
          </main>
          <StatusBar />
        </div>
        {toastMsg && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-[12.5px] px-4 py-2 rounded shadow-lg animate-in fade-in slide-in-from-bottom-2">
            {toastMsg}
          </div>
        )}
      </div>
    </DashCtx.Provider>
  );
}

// ——— Bookmarks ————————————————————————————————
const BOOKMARKS: { label: string; page: PageId; filters: Partial<Filters>; note: string }[] = [
  {
    label: "Q1 briefing",
    page: "overview",
    filters: { range: "d24", frequency: "Quarterly", eventType: "All", commodities: ["brent", "petrol"] },
    note: "Q1 briefing view applied",
  },
  {
    label: "Escalation view",
    page: "eda",
    filters: { range: "d2022", frequency: "Monthly", eventType: "Military", commodities: ["brent", "petrol", "diesel"] },
    note: "Escalation view applied — Military events only",
  },
  {
    label: "Model card",
    page: "models",
    filters: { range: "full", frequency: "Monthly" },
    note: "Model card view applied",
  },
];

// ——— Sidebar ————————————————————————————————
function SidebarNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { page, goToPage, setFilters, toast } = useDash();
  return (
    <aside
      className={`w-[240px] shrink-0 bg-tile border-r border-hairline flex flex-col fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 lg:static lg:translate-x-0 lg:w-[220px] ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="h-12 px-4 flex items-center gap-2 border-b border-hairline">
        <div className="w-6 h-6 shrink-0 rounded-sm bg-brand grid place-items-center text-white text-[11px] font-bold">
          G1
        </div>
        <div className="leading-tight min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-ink truncate">Gulf Transmission</div>
          <div className="text-[10.5px] text-muted-foreground truncate">DS-110 · Group 01</div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 hover:bg-muted rounded shrink-0"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4 text-ink-soft" />
        </button>
      </div>

      <div className="px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        Pages
      </div>
      <nav className="px-2 flex flex-col gap-0.5">
        {NAV_PAGES.map((n) => {
          const active = n.id === page;
          return (
            <button
              key={n.id}
              onClick={() => goToPage(n.id)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 px-3 py-2 text-[13px] rounded text-left transition-colors active:scale-[0.99] ${
                active
                  ? "bg-brand-soft text-brand font-medium border-l-2 border-brand pl-[10px]"
                  : "text-ink-soft hover:bg-muted"
              }`}
            >
              <n.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{n.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto p-3 border-t border-hairline">
        <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Bookmarks
        </div>
        {BOOKMARKS.map((b) => (
          <button
            key={b.label}
            onClick={() => {
              setFilters(b.filters);
              goToPage(b.page);
              toast(b.note);
            }}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-[12.5px] text-ink-soft hover:bg-muted hover:text-brand rounded transition-colors"
          >
            <Pin className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="truncate">{b.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

// ——— Search index ————————————————————————————————
const SEARCH_INDEX: { label: string; page: PageId; kind: string }[] = [
  ...NAV_PAGES.map((p) => ({ label: p.label, page: p.id as PageId, kind: "Page" })),
  { label: "Random Forest R²", page: "overview", kind: "KPI" },
  { label: "OGRA Petrol · latest", page: "overview", kind: "KPI" },
  { label: "USD / PKR", page: "overview", kind: "KPI" },
  { label: "Brent Crude", page: "overview", kind: "KPI" },
  { label: "Brent Crude vs. OGRA fuels vs. USD/PKR", page: "overview", kind: "Chart" },
  { label: "Key insight", page: "overview", kind: "Tile" },
  { label: "Research questions", page: "overview", kind: "Tile" },
  { label: "Correlation with Brent Crude", page: "overview", kind: "Chart" },
  { label: "Five-day Brent reaction by event type", page: "overview", kind: "Chart" },
  { label: "Source inventory", page: "sources", kind: "Table" },
  { label: "Pipeline · 7 cleaning operations", page: "sources", kind: "Tile" },
  { label: "Transmission lag (Brent → OGRA Petrol)", page: "eda", kind: "Chart" },
  { label: "Median Brent by conflict intensity tercile", page: "eda", kind: "Chart" },
  { label: "Brent → OGRA Petrol regression", page: "eda", kind: "Tile" },
  { label: "Event distribution", page: "eda", kind: "Chart" },
  { label: "Sentiment vs. price reaction", page: "eda", kind: "Chart" },
  { label: "Analyst notes", page: "eda", kind: "Tile" },
  { label: "Regression model comparison", page: "models", kind: "Chart" },
  { label: "Executive summary", page: "policy", kind: "Tile" },
  { label: "Team & attribution", page: "policy", kind: "Tile" },
];

// ——— Top bar ————————————————————————————————
function TopBar({
  onMenu,
  onSearchPick,
  reportRef,
}: {
  onMenu: () => void;
  onSearchPick: (p: PageId, label: string) => void;
  reportRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { refresh, refreshing, toast, page } = useDash();
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [exporting, setExporting] = useState(false);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return SEARCH_INDEX.filter((r) => r.label.toLowerCase().includes(s)).slice(0, 8);
  }, [q]);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied!");
    } catch {
      toast("Copy failed — " + url);
    }
  };

  const exportPng = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(reportRef.current, {
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#F3F2F1",
        pixelRatio: 2,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `us-iran-energy-${page}.png`;
      a.click();
      toast("Exported PNG");
    } catch {
      toast("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <header className="relative h-12 shrink-0 bg-tile border-b border-hairline flex items-center px-3 sm:px-4 gap-2 z-30">
      <button
        onClick={onMenu}
        className="lg:hidden p-1.5 hover:bg-muted rounded shrink-0 z-10"
        aria-label="Open navigation"
      >
        <Menu className="w-4 h-4 text-ink-soft" />
      </button>

      <div
        className={`text-[12.5px] sm:text-[13.5px] font-semibold text-ink truncate min-w-0 transition-opacity ${
          searchOpen ? "opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto" : ""
        }`}
      >
        <span className="hidden sm:inline">
          Impact of U.S.–Iran Conflict on Global Energy Markets &amp; Pakistan's Economy
        </span>
        <span className="sm:hidden">U.S.–Iran Energy Impact</span>
      </div>
      <div className="hidden xl:block text-[11.5px] text-muted-foreground border-l border-hairline pl-3 ml-1 shrink-0">
        Workspace · <span className="text-ink-soft">DS-110 / Phase 2–3</span>
      </div>

      <div className="ml-auto flex items-center gap-1 shrink-0">
        <div className="hidden md:flex items-center gap-1">
          <ToolbarBtn icon={refreshing ? Loader2 : RefreshCw} label="Refresh" onClick={refresh} spinning={refreshing} />
          <ToolbarBtn icon={Share2} label="Share" onClick={share} />
          <ToolbarBtn
            icon={exporting ? Loader2 : Download}
            label={exporting ? "Exporting…" : "Export"}
            onClick={exportPng}
            spinning={exporting}
          />
          <div className="w-px h-6 bg-hairline mx-1" />
        </div>
        <button
          onClick={refresh}
          className="md:hidden p-1.5 hover:bg-muted rounded active:bg-muted"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-ink-soft ${refreshing ? "animate-spin" : ""}`} />
        </button>

        {/* Responsive search */}
        <div
          className={`flex items-center ${
            searchOpen ? "absolute inset-x-3 top-1.5 z-20" : "relative w-auto"
          } sm:static sm:z-auto sm:w-auto`}
        >
          <div className={`relative ${searchOpen ? "w-full" : "hidden sm:block w-36 md:w-40 xl:w-56"}`}>
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search this report"
              className="w-full pl-7 pr-8 h-7 text-[12px] bg-canvas border border-hairline rounded focus:outline-none focus:border-brand"
            />
            {(searchOpen || q) && (
              <button
                onClick={() => {
                  setQ("");
                  setSearchOpen(false);
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
                aria-label="Close search"
              >
                <X className="w-3 h-3 text-ink-soft" />
              </button>
            )}
            {q.trim() && (
              <div className="absolute top-9 right-0 w-full min-w-[240px] bg-tile border border-hairline rounded shadow-lg overflow-hidden">
                {results.length === 0 && (
                  <div className="px-3 py-2 text-[12px] text-muted-foreground">No matches</div>
                )}
                {results.map((r) => (
                  <button
                    key={r.kind + r.label}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSearchPick(r.page, r.label);
                      setQ("");
                      setSearchOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                  >
                    <span className="text-[9.5px] uppercase tracking-wider text-muted-foreground w-10 shrink-0">
                      {r.kind}
                    </span>
                    <span className="text-[12px] text-ink truncate">{r.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {!searchOpen && (
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden p-1.5 hover:bg-muted rounded shrink-0"
            aria-label="Open search"
          >
            <Search className="w-4 h-4 text-ink-soft" />
          </button>
        )}

        <button
          onClick={() => toast("No new alerts")}
          className="hidden sm:block p-1.5 hover:bg-muted rounded"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-ink-soft" />
        </button>
        <div className="w-7 h-7 rounded-full bg-brand text-white grid place-items-center text-[11px] font-semibold ml-1 shrink-0">
          UA
        </div>
      </div>
    </header>
  );
}

function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
  spinning,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  spinning?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 h-7 text-[12px] text-ink-soft hover:bg-muted hover:text-brand active:bg-brand-soft rounded transition-colors"
    >
      <Icon className={`w-3.5 h-3.5 ${spinning ? "animate-spin" : ""}`} />
      {label}
    </button>
  );
}

// ——— Dropdown primitive ————————————————————————————————
function Dropdown({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const width = 240;
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      top: r.bottom + 6,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = () => place();
    document.addEventListener("mousedown", h);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", h);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, place]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-tile border rounded text-[11.5px] min-h-[28px] transition-colors ${
          open ? "border-brand ring-1 ring-brand/30" : "border-hairline hover:border-brand"
        }`}
      >
        <span className="text-muted-foreground hidden sm:inline">{label}:</span>
        <span className="text-ink font-medium truncate max-w-[140px] sm:max-w-[220px]">{value}</span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 9999 }}
              className="min-w-[240px] max-h-[60vh] overflow-y-auto bg-tile border border-hairline rounded shadow-lg py-1"
            >
              {children(() => setOpen(false))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function MenuItem({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left hover:bg-muted whitespace-nowrap"
    >
      <Check className={`w-3.5 h-3.5 shrink-0 ${active ? "text-brand" : "opacity-0"}`} />
      <span className={active ? "text-ink font-medium" : "text-ink-soft"}>{children}</span>
    </button>
  );
}

// ——— Filter bar ————————————————————————————————
function FilterBar() {
  const { filters, setFilters, lastRefreshed, toast } = useDash();
  const range = TIME_RANGES.find((t) => t.id === filters.range)!;
  const commodityLabel =
    filters.commodities.length === 0
      ? "None"
      : COMMODITIES.filter((c) => filters.commodities.includes(c.id))
          .map((c) => c.label)
          .join(" · ");

  const toggleCommodity = (id: CommodityId) => {
    const next = filters.commodities.includes(id)
      ? filters.commodities.filter((c) => c !== id)
      : [...filters.commodities, id];
    setFilters({ commodities: next });
  };

  return (
    <div className="bg-tile-2 border-b border-hairline relative z-[1000]">
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 overflow-x-auto whitespace-nowrap scrollbar-thin">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold pr-2 shrink-0">
          <Filter className="w-3 h-3 shrink-0" /> Filters
        </div>

        <Dropdown label="Time range" value={range.label}>
          {(close) =>
            TIME_RANGES.map((t) => (
              <MenuItem
                key={t.id}
                active={t.id === filters.range}
                onClick={() => {
                  setFilters({ range: t.id });
                  close();
                }}
              >
                {t.label}
              </MenuItem>
            ))
          }
        </Dropdown>

        <Dropdown label="Commodity" value={commodityLabel}>
          {() =>
            COMMODITIES.map((c) => (
              <MenuItem
                key={c.id}
                active={filters.commodities.includes(c.id)}
                onClick={() => toggleCommodity(c.id)}
              >
                {c.label} <span className="text-muted-foreground">({c.unit})</span>
              </MenuItem>
            ))
          }
        </Dropdown>

        <Dropdown
          label="Event type"
          value={
            filters.eventType === "All" ? "All (Military · Sanctions · Diplomatic)" : filters.eventType
          }
        >
          {(close) =>
            (["All", "Military", "Sanctions", "Diplomatic"] as const).map((e) => (
              <MenuItem
                key={e}
                active={filters.eventType === e}
                onClick={() => {
                  setFilters({ eventType: e });
                  close();
                }}
              >
                {e}
              </MenuItem>
            ))
          }
        </Dropdown>

        <Dropdown label="Region" value={filters.region}>
          {(close) =>
            REGIONS.map((r) => (
              <MenuItem
                key={r}
                active={filters.region === r}
                onClick={() => {
                  setFilters({ region: r });
                  close();
                }}
              >
                {r}
              </MenuItem>
            ))
          }
        </Dropdown>

        <Dropdown label="Frequency" value={filters.frequency}>
          {(close) =>
            (["Monthly", "Quarterly"] as const).map((f) => (
              <MenuItem
                key={f}
                active={filters.frequency === f}
                onClick={() => {
                  setFilters({ frequency: f });
                  close();
                }}
              >
                {f}
              </MenuItem>
            ))
          }
        </Dropdown>

        <button
          onClick={() => {
            setFilters(DEFAULT_FILTERS);
            toast("Filters reset");
          }}
          className="px-2.5 py-1.5 text-[11.5px] text-ink-soft hover:text-brand hover:bg-muted rounded shrink-0"
        >
          Reset
        </button>

        <div className="hidden xl:block ml-auto text-[11px] text-muted-foreground font-mono shrink-0">
          Last refreshed: <ClientStamp d={lastRefreshed} />
        </div>
      </div>
    </div>
  );
}

function ClientStamp({ d }: { d: Date }) {
  const [t, setT] = useState("");
  useEffect(() => setT(formatStamp(d)), [d]);
  return <span suppressHydrationWarning>{t}</span>;
}

function formatStamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ——— Status bar ————————————————————————————————
function StatusBar() {
  const { page, series, events } = useDash();
  const idx = NAV_PAGES.findIndex((p) => p.id === page) + 1;
  return (
    <footer className="h-7 shrink-0 bg-tile border-t border-hairline px-3 sm:px-4 flex items-center gap-2 sm:gap-4 text-[10.5px] sm:text-[11px] text-muted-foreground font-mono overflow-hidden">
      <span className="shrink-0">
        Page {idx}/{NAV_PAGES.length}
      </span>
      <span className="hidden sm:inline">·</span>
      <span className="hidden sm:inline shrink-0">
        {series.length} periods · {events.reduce((a, e) => a + e.n, 0)} events · 3 models
      </span>
      <span className="hidden md:inline">·</span>
      <span className="text-pos hidden md:flex items-center gap-1 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-pos inline-block" /> Refresh OK
      </span>
      <div className="ml-auto hidden lg:flex items-center gap-3 shrink-0">
        <span>Air University · Rawalpindi</span>
        <span>·</span>
        <span>Dr. Qurat-ul-Ain</span>
      </div>
      <span className="ml-auto lg:hidden truncate text-right">Air University</span>
    </footer>
  );
}

// ————————————————————————————————————————————
// Tile primitives
// ————————————————————————————————————————————

function Tile({
  title,
  subtitle,
  children,
  className = "",
  action,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  const { highlight } = useDash();
  const isHit = !!title && highlight === title;
  return (
    <div
      data-tile={title}
      className={`tile flex flex-col transition-shadow ${isHit ? "ring-2 ring-brand shadow-lg" : ""} ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between px-4 pt-3 pb-2">
          <div className="min-w-0">
            {title && <div className="text-[13.5px] font-semibold text-ink truncate">{title}</div>}
            {subtitle && (
              <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {action}
            <MoreMenu title={title ?? "tile"} />
          </div>
        </div>
      )}
      <div className="flex-1 px-4 pb-3 min-h-0">{children}</div>
    </div>
  );
}

function MoreMenu({ title }: { title: string }) {
  const { toast, refresh } = useDash();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1 hover:bg-muted rounded"
        aria-label="More options"
      >
        <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-40 min-w-[150px] bg-tile border border-hairline rounded shadow-lg py-1">
          <button
            className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-muted"
            onClick={() => {
              refresh();
              setOpen(false);
            }}
          >
            Refresh visual
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-muted"
            onClick={() => {
              navigator.clipboard?.writeText(title);
              toast("Visual name copied");
              setOpen(false);
            }}
          >
            Copy visual name
          </button>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  trend,
  icon: Icon,
  format,
  info,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon: React.ComponentType<{ className?: string }>;
  format?: string;
  info?: string;
}) {
  const [open, setOpen] = useState(false);
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "text-pos" : trend === "down" ? "text-neg" : "text-muted-foreground";
  return (
    <div className="tile p-3.5 relative">
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <button
          type="button"
          title={info ?? label}
          onClick={() => info && setOpen((o) => !o)}
          onMouseEnter={() => info && setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          aria-label={`About ${label}`}
          className={`w-7 h-7 shrink-0 rounded bg-brand-soft grid place-items-center transition-colors ${
            info ? "hover:bg-brand hover:text-white cursor-help" : ""
          }`}
        >
          <Icon className="w-3.5 h-3.5 text-brand" />
        </button>
        {open && info && (
          <div className="absolute right-2 top-10 z-30 w-56 bg-ink text-white text-[11.5px] leading-snug rounded px-3 py-2 shadow-lg">
            <div className="flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-[2px] shrink-0" />
              <span>{info}</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <div className="text-[26px] font-semibold text-ink leading-none tabular-nums">{value}</div>
        {format && <div className="text-[11px] text-muted-foreground">{format}</div>}
      </div>
      {delta && (
        <div className={`mt-2 flex items-center gap-1 text-[11.5px] ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span className="font-medium">{delta}</span>
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————————————————
// PAGE 1 · Overview
// ————————————————————————————————————————————

function OverviewPage() {
  const { series, events, filters } = useDash();
  const last = series[series.length - 1];
  const prev = series[series.length - 2] ?? last;
  const pct = (a: number, b: number) => `${b >= a ? "+" : ""}${(((b - a) / a) * 100).toFixed(1)}%`;
  const show = (id: CommodityId) => filters.commodities.includes(id);
  const localVisible = filters.region !== "Global";
  const per = filters.frequency === "Monthly" ? "MoM" : "QoQ";

  return (
    <div className="grid grid-cols-12 gap-3 auto-rows-min">
      {/* KPI row */}
      <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Random Forest R²"
          value="0.985"
          delta="+0.041 vs. Linear"
          trend="up"
          icon={Target}
          info="Coefficient of determination of the 200-tree Random Forest on the 20% held-out test set — 98.5% of petrol-price variance explained."
        />
        <KpiCard
          label="OGRA Petrol · latest"
          value={last ? String(last.petrol) : "—"}
          format="PKR / L"
          delta={last ? `${pct(prev.petrol, last.petrol)} ${per}` : undefined}
          trend={last && last.petrol >= prev.petrol ? "up" : "down"}
          icon={Fuel}
          info="Latest OGRA notified motor-gasoline retail price for the selected period and time range, in Pakistani rupees per litre."
        />
        <KpiCard
          label="USD / PKR"
          value={last ? String(last.usd) : "—"}
          delta={last ? `${pct(prev.usd, last.usd)} ${per}` : undefined}
          trend={last && last.usd >= prev.usd ? "up" : "down"}
          icon={DollarSign}
          info="Interbank rupee-per-dollar rate. The rupee channel amplifies imported oil shocks (R = 0.51 with Brent)."
        />
        <KpiCard
          label="Brent Crude"
          value={last ? String(last.brent) : "—"}
          format="USD / bbl"
          delta={last ? `${pct(prev.brent, last.brent)} ${per}` : undefined}
          trend={last && last.brent >= prev.brent ? "up" : "down"}
          icon={Activity}
          info="Brent benchmark spot price — the global reference crude used throughout the event studies."
        />
      </div>

      {/* Main trend chart */}
      <Tile
        title="Brent Crude vs. OGRA fuels vs. USD/PKR"
        subtitle={`${filters.frequency} · ${TIME_RANGES.find((t) => t.id === filters.range)!.label} · ${filters.region}`}
        className="col-span-12 lg:col-span-8 h-[340px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
            <CartesianGrid stroke="var(--color-hairline)" strokeDasharray="2 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={{ stroke: "var(--color-hairline)" }}
              tickLine={false}
              interval={Math.max(0, Math.floor(series.length / 10))}
            />
            <YAxis
              yAxisId="pkr"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <YAxis
              yAxisId="usd"
              orientation="right"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontSize: 11 }} />
            {show("petrol") && localVisible && (
              <Area
                yAxisId="pkr"
                type="monotone"
                dataKey="petrol"
                stroke="var(--color-chart-1)"
                fill="var(--color-chart-1)"
                fillOpacity={0.14}
                strokeWidth={2}
                name="OGRA Petrol (PKR/L)"
              />
            )}
            {show("diesel") && localVisible && (
              <Line
                yAxisId="pkr"
                type="monotone"
                dataKey="diesel"
                stroke="var(--color-chart-2)"
                strokeWidth={1.6}
                dot={false}
                name="OGRA Diesel (PKR/L)"
              />
            )}
            {localVisible && (
              <Line
                yAxisId="pkr"
                type="monotone"
                dataKey="usd"
                stroke="var(--color-chart-3)"
                strokeWidth={1.8}
                dot={false}
                name="USD/PKR"
              />
            )}
            {show("brent") && (
              <Line
                yAxisId="usd"
                type="monotone"
                dataKey="brent"
                stroke="var(--color-chart-4)"
                strokeWidth={1.8}
                dot={false}
                name="Brent (USD/bbl)"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        <ChartLegend
          items={[
            ...(show("petrol") && localVisible
              ? [{ color: "var(--color-chart-1)", label: "OGRA Petrol (PKR/L)" }]
              : []),
            ...(show("diesel") && localVisible
              ? [{ color: "var(--color-chart-2)", label: "OGRA Diesel (PKR/L)" }]
              : []),
            ...(localVisible ? [{ color: "var(--color-chart-3)", label: "USD/PKR" }] : []),
            ...(show("brent") ? [{ color: "var(--color-chart-4)", label: "Brent (USD/bbl)" }] : []),
          ]}
        />
      </Tile>

      <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
        <Tile title="Key insight" subtitle="Auto-generated summary">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Every <b className="text-ink">$1/bbl</b> rise in Brent is associated with a{" "}
            <b className="text-ink">3.24 PKR/L</b> rise in OGRA petrol (
            <span className="font-mono">p &lt; 0.001</span>). The transmission peaks at{" "}
            <b className="text-ink">lag 0</b>, consistent with OGRA's fortnightly revision cycle.
            Military escalations lift Brent by <b className="text-ink">+3.84%</b> over the following
            five trading days.
          </p>
        </Tile>

        <Tile title="Research questions" subtitle="3 tracked">
          <ol className="space-y-2.5 text-[12.5px]">
            {[
              "Do conflict events move Brent short-term?",
              "How fast does Brent transmit into Pakistani pumps?",
              "Do event types (military / sanctions / diplomatic) differ in impact?",
            ].map((q, i) => (
              <li key={i} className="flex gap-2.5 items-start">
                <span className="w-4 h-4 rounded-sm bg-brand-soft text-brand text-[10px] font-semibold grid place-items-center shrink-0 mt-[1px]">
                  {i + 1}
                </span>
                <span className="text-ink-soft leading-snug">{q}</span>
              </li>
            ))}
          </ol>
        </Tile>
      </div>

      {/* Correlation + event impact */}
      <Tile
        title="Correlation with Brent Crude"
        subtitle="Pearson R · monthly · all merged variables"
        className="col-span-12 lg:col-span-6 h-[300px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={CORRELATIONS}
            layout="vertical"
            margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
          >
            <CartesianGrid stroke="var(--color-hairline)" strokeDasharray="2 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 0.75]}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }}
              axisLine={false}
              tickLine={false}
              width={110}
            />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v.toFixed(3)} />
            <Bar dataKey="value" radius={[0, 2, 2, 0]} barSize={14}>
              {CORRELATIONS.map((row, i) => (
                <Cell
                  key={i}
                  fill={
                    row.value > 0.5
                      ? "var(--color-chart-1)"
                      : row.value > 0.2
                        ? "var(--color-chart-2)"
                        : "var(--color-hairline)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Tile>

      <Tile
        title="Five-day Brent reaction by event type"
        subtitle="Mean % change in Brent settlement over the 5 trading days after each event"
        className="col-span-12 lg:col-span-6 h-[300px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={events} margin={{ top: 12, right: 12, left: -8, bottom: 4 }}>
            <CartesianGrid stroke="var(--color-hairline)" strokeDasharray="2 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }}
              axisLine={{ stroke: "var(--color-hairline)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={42}
              domain={[-2, 5]}
              tickFormatter={(v) => `${v}%`}
            />
            <ReferenceLine y={0} stroke="var(--color-ink-soft)" />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, _n, p: any) => [
                `${v > 0 ? "+" : ""}${v}% (σ ±${p.payload.sd}%, n=${p.payload.n}, VADER ${p.payload.vaderCompound})`,
                "5-day Brent reaction",
              ]}
            />
            <Bar dataKey="avgReaction" radius={[3, 3, 0, 0]} barSize={64}>
              <LabelList
                dataKey="avgReaction"
                position="top"
                formatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`}
                style={{ fontSize: 11, fontWeight: 600, fill: "var(--color-ink)" }}
              />
              {events.map((e, i) => (
                <Cell key={i} fill={EVENT_COLORS[e.name]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Tile>
    </div>
  );
}

// ————————————————————————————————————————————
// PAGE 2 · Data Sources
// ————————————————————————————————————————————

function SourcesPage() {
  const { series, events, filters } = useDash();
  const sources = [
    ["Brent Crude", "FRED", "Weekly", "USD / bbl", 574, "OK"],
    ["Exchange Rates", "Central banks", "Daily", "USD/PKR · USD/IRR", 4102, "OK"],
    ["OGRA Fuel Prices", "OGRA (PK)", "Monthly", "PKR / L", 136, "OK"],
    ["Conflict Events", "Scraped + VADER", "Event", "Sentiment score", 110, "OK"],
    ["World Bank Macro", "WB Open Data", "Annual", "GDP · Inflation", 12, "OK"],
  ] as const;

  const cleaning = [
    "Date standardization across five formats",
    "Duplicate detection & removal",
    "Missing values — forward-fill",
    "String cleaning & type casting",
    "Precision rounding (2dp / 4dp)",
    "IQR outlier capping on USD/PKR",
    "Frequency-aligned monthly merge",
  ];

  return (
    <div className="grid grid-cols-12 gap-3 auto-rows-min">
      <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Raw sources"
          value="5"
          icon={Database}
          info="Number of independent raw feeds merged into the master dataframe."
        />
        <KpiCard
          label="Cleaning ops"
          value="7"
          icon={RefreshCw}
          info="Sequential cleaning operations applied in Phase 2 before the merge."
        />
        <KpiCard
          label="Periods in view"
          value={String(series.length)}
          icon={FileText}
          info="Rows currently in scope after applying the time-range and frequency filters."
        />
        <KpiCard
          label="Events in view"
          value={String(events.reduce((a, e) => a + e.n, 0))}
          icon={Activity}
          info={`Conflict events matching the current event-type filter (${filters.eventType}).`}
        />
      </div>

      <Tile
        title="Source inventory"
        subtitle="All raw feeds merged into the master monthly dataframe"
        className="col-span-12 lg:col-span-8"
      >
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full min-w-[560px] text-[12.5px]">
            <thead className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-hairline">
              <tr>
                <Th>Source</Th>
                <Th>Provider</Th>
                <Th>Frequency</Th>
                <Th>Measure</Th>
                <Th className="text-right">Rows</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s, i) => (
                <tr key={i} className="border-b border-hairline last:border-b-0 hover:bg-muted/40">
                  <Td className="font-medium text-ink">{s[0]}</Td>
                  <Td>{s[1]}</Td>
                  <Td>{s[2]}</Td>
                  <Td className="font-mono text-[11.5px] text-muted-foreground">{s[3]}</Td>
                  <Td className="text-right font-mono tabular-nums">{s[4].toLocaleString()}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 text-pos text-[11.5px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-pos" /> {s[5]}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tile>

      <Tile
        title="Pipeline · 7 cleaning operations"
        subtitle="Applied in sequence before merge"
        className="col-span-12 lg:col-span-4"
      >
        <ol className="space-y-2">
          {cleaning.map((c, i) => (
            <li key={i} className="flex gap-2.5 items-start text-[12.5px] text-ink-soft">
              <span className="font-mono text-[10px] text-brand pt-[3px] shrink-0 w-5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{c}</span>
            </li>
          ))}
        </ol>
      </Tile>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`py-2 px-2 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`py-2 px-2 text-ink-soft ${className}`}>{children}</td>;
}

// ————————————————————————————————————————————
// PAGE 3 · EDA
// ————————————————————————————————————————————

function EdaPage() {
  const { events, series, filters } = useDash();
  const brentMin = Math.min(...series.map((s) => s.brent));
  const brentMax = Math.max(...series.map((s) => s.brent));

  return (
    <div className="grid grid-cols-12 gap-3 auto-rows-min">
      <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Peak correlation lag"
          value="0"
          format="months"
          icon={Activity}
          info="Lag at which the Brent → OGRA petrol cross-correlation is strongest. Zero means same-month pass-through."
        />
        <KpiCard
          label="Brent ↔ OGRA Petrol R"
          value="0.680"
          icon={LineIcon}
          info="Pearson correlation between monthly Brent and OGRA petrol prices over 2015–2026."
        />
        <KpiCard
          label="Slope"
          value="3.24"
          format="PKR/L per $1"
          icon={Target}
          info="OLS slope: each additional dollar per barrel of Brent adds ~3.24 rupees per litre at the pump."
        />
        <KpiCard
          label="Brent range in view"
          value={`${brentMin}–${brentMax}`}
          format="USD / bbl"
          icon={Activity}
          info="Minimum and maximum Brent price across the currently filtered time range."
        />
      </div>

      <Tile
        title="Transmission lag (Brent → OGRA Petrol)"
        subtitle="Cross-correlation R at 0–6 month lags"
        className="col-span-12 lg:col-span-7 h-[300px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={LAGS} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
            <CartesianGrid stroke="var(--color-hairline)" strokeDasharray="2 3" vertical={false} />
            <XAxis
              dataKey="m"
              tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }}
              axisLine={{ stroke: "var(--color-hairline)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              domain={[0, 0.75]}
              width={40}
            />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v.toFixed(3)} />
            <Bar dataKey="v" radius={[3, 3, 0, 0]} barSize={44}>
              {LAGS.map((l, i) => (
                <Cell
                  key={i}
                  fill={i === 0 ? "var(--color-brand)" : "var(--color-chart-2)"}
                  fillOpacity={i === 0 ? 1 : 0.55}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Tile>

      <Tile
        title="Median Brent by conflict intensity tercile"
        subtitle="Low / Medium / High-intensity months (USD/bbl)"
        className="col-span-12 lg:col-span-5 h-[300px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={INTENSITY} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
            <CartesianGrid stroke="var(--color-hairline)" strokeDasharray="2 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }}
              axisLine={{ stroke: "var(--color-hairline)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              domain={[50, 90]}
              width={36}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, _n, p: any) => [`$${v} (n=${p.payload.n})`, "Median Brent"]}
            />
            <Bar dataKey="price" radius={[3, 3, 0, 0]} barSize={56}>
              <LabelList
                dataKey="price"
                position="top"
                formatter={(v: number) => `$${v}`}
                style={{ fontSize: 11, fontWeight: 600, fill: "var(--color-ink)" }}
              />
              {INTENSITY.map((r, i) => (
                <Cell
                  key={i}
                  fill={
                    r.name === "High"
                      ? "var(--color-chart-5)"
                      : r.name === "Medium"
                        ? "var(--color-chart-3)"
                        : "var(--color-chart-2)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Tile>

      <Tile
        title="Brent → OGRA Petrol regression"
        subtitle={`Monthly frequency · ${filters.region}`}
        className="col-span-12 lg:col-span-4"
      >
        <dl className="divide-y divide-hairline border-t border-hairline">
          {[
            ["Pearson R", "0.680"],
            ["R²", "0.462"],
            ["p-value", "< 0.001"],
            ["Slope", "3.24 PKR/L per $1"],
            ["Intercept", "42.7 PKR/L"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 text-[12.5px]">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-mono font-semibold text-ink tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </Tile>

      <Tile
        title="Event distribution"
        subtitle="Count by conflict event type"
        className="col-span-12 lg:col-span-4 h-[240px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={events} layout="vertical" margin={{ top: 8, right: 24, left: -8, bottom: 4 }}>
            <CartesianGrid stroke="var(--color-hairline)" strokeDasharray="2 3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }}
              axisLine={false}
              tickLine={false}
              width={78}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="n" radius={[0, 2, 2, 0]} barSize={20}>
              {events.map((e, i) => (
                <Cell key={i} fill={EVENT_COLORS[e.name]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Tile>

      <Tile
        title="Sentiment vs. price reaction"
        subtitle="VADER compound (news tone) vs. 5-day Brent % change — opposite signs by design"
        className="col-span-12 lg:col-span-4"
      >
        <div className="divide-y divide-hairline border-t border-hairline">
          {events.map((e) => (
            <div key={e.name} className="py-2 text-[12.5px] flex items-center justify-between gap-3">
              <span className="text-ink font-medium">{e.name}</span>
              <span className="font-mono text-[11.5px] text-muted-foreground">
                VADER {e.vaderCompound > 0 ? "+" : ""}
                {e.vaderCompound}
              </span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  e.avgReaction >= 0 ? "text-pos" : "text-neg"
                }`}
              >
                {e.avgReaction > 0 ? "+" : ""}
                {e.avgReaction}%
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-muted-foreground leading-snug">
          Negative sentiment ≠ negative price impact: military escalation reads as hostile news tone
          yet pushes Brent <b className="text-ink">up</b> through the supply-risk premium.
        </p>
      </Tile>

      <Tile title="Analyst notes" subtitle="EDA takeaways" className="col-span-12">
        <ul className="space-y-2.5 text-[12.5px] text-ink-soft leading-relaxed">
          <li>
            <b className="text-ink">Prices track Brent tightly</b> — OGRA petrol R = 0.638, diesel R
            = 0.642.
          </li>
          <li>
            <b className="text-ink">Rupee amplifies the shock</b> — USD/PKR correlates 0.51 with
            Brent.
          </li>
          <li>
            <b className="text-ink">Military events dominate</b> — highest mean 5-day Brent reaction
            (+3.84%) and the widest dispersion (σ ± 5.83%).
          </li>
        </ul>
      </Tile>
    </div>
  );
}

// ————————————————————————————————————————————
// PAGE 4 · Models
// ————————————————————————————————————————————

function ModelsPage() {
  return (
    <div className="grid grid-cols-12 gap-3 auto-rows-min">
      <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Best R²"
          value="0.985"
          delta="Random Forest"
          trend="up"
          icon={Target}
          info="Highest test-set R² across all benchmarked algorithms."
        />
        <KpiCard
          label="Best RMSE"
          value="9.35"
          format="PKR / L"
          icon={Activity}
          info="Root mean squared error of the best model, in rupees per litre of petrol."
        />
        <KpiCard
          label="Algorithms benchmarked"
          value="3"
          icon={Cpu}
          info="Linear Regression, Naïve Bayes and Random Forest (the outside algorithm)."
        />
        <KpiCard
          label="Train / test split"
          value="80 / 20"
          icon={LineIcon}
          info="Chronological hold-out split used for all model evaluation."
        />
      </div>

      <Tile
        title="Regression model comparison"
        subtitle="Random Forest vs. Linear Regression on held-out test set"
        className="col-span-12 lg:col-span-7 h-[300px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={MODEL_PERF} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
            <CartesianGrid stroke="var(--color-hairline)" strokeDasharray="2 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }}
              axisLine={{ stroke: "var(--color-hairline)" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="l"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              domain={[0, 1]}
              width={40}
            />
            <YAxis
              yAxisId="r"
              orientation="right"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar yAxisId="l" dataKey="r2" name="R²" fill="var(--color-brand)" barSize={40} radius={[3, 3, 0, 0]} />
            <Bar
              yAxisId="r"
              dataKey="rmse"
              name="RMSE (PKR/L)"
              fill="var(--color-chart-5)"
              barSize={40}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        <ChartLegend
          items={[
            { color: "var(--color-brand)", label: "R² (higher is better)" },
            { color: "var(--color-chart-5)", label: "RMSE PKR/L (lower is better)" },
          ]}
        />
      </Tile>

      <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">
        <ModelSummaryTile
          tag="In-class"
          title="Linear Regression"
          r2="0.945"
          rows={[
            ["RMSE", "17.98 PKR/L"],
            ["MAE", "14.87 PKR/L"],
            ["Brent coef.", "+0.947"],
            ["USD/PKR coef.", "+1.149"],
          ]}
        />
        <ModelSummaryTile
          tag="In-class"
          title="Naïve Bayes (classifier)"
          r2="31.3%"
          r2Label="Test accuracy"
          rows={[
            ["5-fold CV", "28.3%"],
            ["Test n", "16"],
            ["Best-recalled class", "Military (0.40)"],
          ]}
        />
        <ModelSummaryTile
          tag="Outside algorithm"
          highlighted
          title="Random Forest (200 trees)"
          r2="0.985"
          rows={[
            ["RMSE", "9.35 PKR/L"],
            ["MAE", "6.40 PKR/L"],
            ["vs. Linear", "+0.041 R² · −48% RMSE"],
            ["Top features", "Brent, USD/PKR"],
          ]}
        />
      </div>
    </div>
  );
}

function ModelSummaryTile({
  tag,
  title,
  r2,
  r2Label = "R² · Test",
  rows,
  highlighted = false,
}: {
  tag: string;
  title: string;
  r2: string;
  r2Label?: string;
  rows: [string, string][];
  highlighted?: boolean;
}) {
  return (
    <div className={`tile p-3.5 ${highlighted ? "ring-1 ring-brand" : ""}`}>
      <div className="flex items-center justify-between mb-1">
        <div
          className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
            highlighted ? "bg-brand text-white" : "bg-muted text-muted-foreground"
          }`}
        >
          {tag}
        </div>
        <div className="text-[10.5px] text-muted-foreground uppercase tracking-wider">{r2Label}</div>
      </div>
      <div className="flex items-baseline justify-between">
        <h4 className="text-[14px] font-semibold text-ink">{title}</h4>
        <span
          className={`font-mono font-semibold tabular-nums text-[22px] ${
            highlighted ? "text-brand" : "text-ink"
          }`}
        >
          {r2}
        </span>
      </div>
      <dl className="mt-2 pt-2 border-t border-hairline space-y-1">
        {rows.map(([k, v], i) => (
          <div key={i} className="flex justify-between text-[11.5px]">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-mono text-ink tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ————————————————————————————————————————————
// PAGE 5 · Policy
// ————————————————————————————————————————————

function PolicyPage() {
  const recs = [
    {
      k: "Pricing",
      lead: "Adopt a dual-index pricing formula.",
      body: "OGRA revisions should weight both Brent crude and USD/PKR directly, rather than ad-hoc adjustment — the two variables jointly explain the bulk of petrol price movement.",
    },
    {
      k: "Monitoring",
      lead: "Prioritise military-escalation signals.",
      body: "Military events raise Brent by +3.84% on average over five trading days and carry the widest dispersion (σ ± 5.83%) — early-warning systems should treat them as the primary upside price risk.",
    },
    {
      k: "Forecasting",
      lead: "Deploy the Random Forest model.",
      body: "At R² ≈ 0.985 it is accurate enough to support real-time fuel-price forecasting for government economic planners.",
    },
  ];
  return (
    <div className="grid grid-cols-12 gap-3 auto-rows-min">
      <Tile title="Executive summary" subtitle="Findings from Phase 2 & 3" className="col-span-12">
        <p className="text-[13.5px] leading-relaxed text-ink-soft max-w-3xl">
          U.S.–Iran conflict pulses transmit into Pakistan's pump prices predominantly through the{" "}
          <b className="text-ink">Brent crude → USD/PKR</b> chain, with same-month latency. A Random
          Forest ensemble reaches R² = 0.985 on held-out data, materially outperforming the linear
          baseline. Military escalation is the strongest upside driver of crude (+3.84% over five
          days), while sanctions announcements are close to neutral (−0.63%).
        </p>
      </Tile>

      {recs.map((r, i) => (
        <Tile key={i} title={`${String(i + 1).padStart(2, "0")} · ${r.k}`} className="col-span-12 md:col-span-4">
          <div className="text-[14px] font-semibold text-ink leading-snug mb-2">{r.lead}</div>
          <p className="text-[12.5px] text-ink-soft leading-relaxed">{r.body}</p>
        </Tile>
      ))}

      <Tile title="Team & attribution" className="col-span-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12.5px] text-ink-soft">
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
              Team
            </div>
            Urwa Asif Qureshi · Maira · Fatima Bukhari
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
              Department
            </div>
            Creative Technologies · Air University, Rawalpindi
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
              Course
            </div>
            DS-110 Introduction to Data Science · Dr. Qurat-ul-Ain
          </div>
        </div>
      </Tile>
    </div>
  );
}

// ————————————————————————————————————————————
// Small helpers
// ————————————————————————————————————————————

const tooltipStyle: React.CSSProperties = {
  background: "var(--color-tile)",
  border: "1px solid var(--color-hairline)",
  borderRadius: 4,
  fontSize: 11.5,
  padding: "6px 10px",
  boxShadow: "var(--shadow-tile-hover)",
};

function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 pt-2 mt-1 border-t border-hairline">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}
