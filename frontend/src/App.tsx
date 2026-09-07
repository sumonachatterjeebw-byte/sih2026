/**
 * Application shell: the masthead, the screen tabs, the first-run guide, and the provenance bar
 * that states which layers are simulated.
 *
 * Two presentation modes. **Simple** is the default and shows the two screens that tell the
 * story — plan a passage, watch it sail — because a first-time user shown five dense instrument
 * tabs learns nothing. **Full** adds the three analytical screens. The toggle is always visible,
 * so nothing is hidden, only deferred.
 *
 * All screens stay mounted and are hidden rather than unmounted. The chart holds a canvas and a
 * viewport the user has panned and zoomed; rebuilding that on every tab change would lose their
 * place, and a bridge instrument that forgets where you were looking is an irritating one.
 */
import { Activity, BarChart3, HelpCircle, Layers, Ship, Snowflake, Workflow } from 'lucide-react';
import { ProvenanceBar } from './components/ProvenanceBar';
import { Guide } from './components/Guide';
import { useHealth } from './api/queries';
import { Analytics } from './screens/Analytics';
import { BridgeConsole } from './screens/BridgeConsole';
import { IceForecast } from './screens/IceForecast';
import { IcebergTracker } from './screens/IcebergTracker';
import { SystemFlow } from './screens/SystemFlow';
import { VoyagePlanner } from './screens/VoyagePlanner';
import { useAppStore, type ScreenId } from './store/useAppStore';

interface Tab {
  id: ScreenId;
  label: string;
  plain: string;
  icon: typeof Ship;
  simple: boolean;
}

/** `plain` is the beginner-facing label; `label` is the one an ice navigator would expect. */
const TABS: Tab[] = [
  { id: 'flow', label: 'System Flow', plain: 'How it works', icon: Workflow, simple: true },
  { id: 'planner', label: 'Voyage Planner', plain: '1. Plan a route', icon: Layers, simple: true },
  { id: 'bridge', label: 'Bridge Console', plain: '2. Sail it', icon: Ship, simple: true },
  { id: 'forecast', label: 'Ice Forecast', plain: 'Ice forecast', icon: Snowflake, simple: false },
  { id: 'icebergs', label: 'Iceberg Tracker', plain: 'Icebergs', icon: Activity, simple: false },
  { id: 'analytics', label: 'Analytics', plain: 'The evidence', icon: BarChart3, simple: false },
];

export function App(): JSX.Element {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const simpleMode = useAppStore((s) => s.simpleMode);
  const setSimpleMode = useAppStore((s) => s.setSimpleMode);
  const setGuideOpen = useAppStore((s) => s.setGuideOpen);
  const health = useHealth();

  const online = health.isSuccess;
  const visibleTabs = simpleMode ? TABS.filter((t) => t.simple) : TABS;

  // If the user switches to Simple while on an advanced screen, move them somewhere that exists.
  const activeScreen: ScreenId = visibleTabs.some((t) => t.id === screen) ? screen : 'flow';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ground text-ink">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-hair bg-panel px-4 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-[0.2em] text-accent">POLAR-NAV AI</span>
          <span className="hidden text-2xs text-ink-3 sm:inline">
            Antarctic route planning for Maitri and Bharati
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {visibleTabs.map(({ id, label, plain, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setScreen(id)}
              title={label}
              className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-2xs uppercase tracking-[0.1em] transition-colors ${
                activeScreen === id
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-transparent text-ink-3 hover:border-hair-2 hover:text-ink-2'
              }`}
            >
              <Icon size={13} />
              <span>{simpleMode ? plain : label}</span>
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => setGuideOpen(true)}
            title="What is this and how do I use it?"
          >
            <HelpCircle size={13} />
            Help
          </button>

          <button
            type="button"
            onClick={() => setSimpleMode(!simpleMode)}
            className={`rounded-sm border px-2.5 py-1.5 text-2xs uppercase tracking-[0.1em] transition-colors ${
              simpleMode
                ? 'border-hair-2 bg-panel-2 text-ink-2 hover:text-ink'
                : 'border-violet/50 bg-violet/10 text-violet'
            }`}
            title={
              simpleMode
                ? 'Show the ice forecast, iceberg and analytics screens'
                : 'Hide the analytical screens and show only the main flow'
            }
          >
            {simpleMode ? 'Simple view' : 'Full view'}
          </button>

          <div className="flex items-center gap-1.5 border-l border-hair pl-2">
            <span
              className={`block h-1.5 w-1.5 rounded-full ${online ? 'bg-ok' : 'bg-danger'}`}
              aria-hidden
            />
            <span className="text-2xs uppercase tracking-[0.1em] text-ink-3">
              {online ? 'Connected' : 'Backend offline'}
            </span>
          </div>
        </div>
      </header>

      <ProvenanceBar />

      <main className="relative min-h-0 flex-1">
        <Screen id="flow" active={activeScreen}>
          <SystemFlow />
        </Screen>
        <Screen id="bridge" active={activeScreen}>
          <BridgeConsole />
        </Screen>
        <Screen id="planner" active={activeScreen}>
          <VoyagePlanner />
        </Screen>
        <Screen id="forecast" active={activeScreen}>
          <IceForecast />
        </Screen>
        <Screen id="icebergs" active={activeScreen}>
          <IcebergTracker />
        </Screen>
        <Screen id="analytics" active={activeScreen}>
          <Analytics />
        </Screen>
        <Guide />
      </main>
    </div>
  );
}

function Screen({
  id,
  active,
  children,
}: {
  id: ScreenId;
  active: ScreenId;
  children: React.ReactNode;
}): JSX.Element {
  const visible = id === active;
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ visibility: visible ? 'visible' : 'hidden', pointerEvents: visible ? 'auto' : 'none' }}
      aria-hidden={!visible}
    >
      {children}
    </div>
  );
}
