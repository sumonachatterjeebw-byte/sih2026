/**
 * Voyage Planner: configure a passage, plan it, and see it measured against the route a ship
 * would sail with no ice information.
 *
 * The comparison table is the point of the screen, and it is deliberately unflattering. The
 * saving is the difference between two model runs, so it is allowed to come out negative — and
 * on some legs it does, because going around the ice costs more fuel than it saves. Showing that
 * honestly is worth more than a number that always looks good.
 */
import { useState } from 'react';
import { AlertTriangle, Play, Route } from 'lucide-react';
import { optimizeRoute } from '../api/client';
import { useEndpoints, useVessels } from '../api/queries';
import { MapCanvas } from '../map/MapCanvas';
import {
  Badge,
  ComputeOverlay,
  EmptyState,
  ErrorNote,
  KeyValue,
  Panel,
  Select,
  Slider,
  Stat,
  Toggle,
} from '../components/ui';
import { useScene } from '../hooks/useScene';
import { hoursToDhm, num, signed } from '../lib/format';
import { rioColor } from '../map/palette';
import { useAppStore } from '../store/useAppStore';
import type { IceClassKey, RouteEvaluation } from '../api/types';

const ICE_CLASSES: IceClassKey[] = [
  'PC1', 'PC2', 'PC3', 'PC4', 'PC5', 'PC6', 'PC7',
  'IA_Super', 'IA', 'IB', 'IC', 'Not_Ice_Strengthened',
];

export function VoyagePlanner(): JSX.Element {
  const { scene, fitTargets } = useScene();
  const { endpoints, loading: endpointsLoading } = useEndpoints();
  const vessels = useVessels();

  const planner = useAppStore((s) => s.planner);
  const setPlanner = useAppStore((s) => s.setPlanner);
  const plan = useAppStore((s) => s.plan);
  const setPlan = useAppStore((s) => s.setPlan);
  const phase = useAppStore((s) => s.planPhase);
  const planError = useAppStore((s) => s.planError);
  const setPhase = useAppStore((s) => s.setPlanPhase);
  const setInspect = useAppStore((s) => s.setInspect);

  const [elapsed, setElapsed] = useState(0);

  const options = endpoints.map((e) => ({
    value: e.id,
    label: `${e.name}${e.inland ? ' (inland — routes to anchorage)' : ''}`,
  }));
  const vesselOptions = (vessels.data?.vessels ?? []).map((v) => ({
    value: v.key,
    label: `${v.display_name} — ${v.ice_class}, ${num(v.installed_power_kw / 1000, 1)} MW`,
  }));

  async function runPlan(): Promise<void> {
    setPhase('planning');
    setElapsed(0);
    const started = performance.now();
    const timer = window.setInterval(() => setElapsed(performance.now() - started), 100);
    try {
      const result = await optimizeRoute({
        origin_id: planner.originId,
        destination_id: planner.destinationId,
        vessel_key: planner.vesselKey,
        ice_class: planner.iceClass,
        weights: planner.weights,
        grid_resolution_deg: planner.gridResolutionDeg,
        avoid_icebergs: planner.avoidIcebergs,
        departure_time_hours: planner.departureTimeHours,
      });
      setPlan(result);
      setPhase('ready');
    } catch (err) {
      setPhase('error', err instanceof Error ? err.message : String(err));
    } finally {
      window.clearInterval(timer);
    }
  }

  const destination = endpoints.find((e) => e.id === planner.destinationId);

  return (
    <div className="grid h-full grid-cols-1 gap-2 p-2 xl:grid-cols-[340px_1fr]">
      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-0.5">
        <Panel title="Passage" subtitle="Origin and destination">
          {endpointsLoading ? (
            <EmptyState title="Loading" detail="Fetching stations and ports." />
          ) : (
            <div className="space-y-2">
              <Select
                label="Origin"
                value={planner.originId}
                options={options}
                onChange={(v) => setPlanner({ originId: v })}
              />
              <Select
                label="Destination"
                value={planner.destinationId}
                options={options}
                onChange={(v) => setPlanner({ destinationId: v })}
              />
              {destination?.inland && (
                <p className="text-2xs text-caution">
                  {destination.name} is inland. Ships route to its anchorage at{' '}
                  {num(destination.anchorageLat, 2)}, {num(destination.anchorageLon, 2)} —{' '}
                  {destination.portApproach || 'the shelf-ice edge'} — and cargo moves overland.
                </p>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Vessel">
          <div className="space-y-2">
            <Select
              label="Ship"
              value={planner.vesselKey}
              options={vesselOptions.length ? vesselOptions : [{ value: planner.vesselKey, label: 'Loading…' }]}
              onChange={(v) => setPlanner({ vesselKey: v })}
            />
            <Select
              label="Ice class for POLARIS"
              value={planner.iceClass}
              options={ICE_CLASSES.map((c) => ({ value: c, label: c.replace(/_/g, ' ') }))}
              onChange={(v) => setPlanner({ iceClass: v })}
            />
          </div>
        </Panel>

        <Panel title="Objective weights" subtitle="What the optimiser is trading off">
          <div className="space-y-2">
            <Slider
              label="Fuel"
              value={planner.weights.fuel}
              min={0}
              max={4}
              step={0.1}
              display={num(planner.weights.fuel, 1)}
              onChange={(v) => setPlanner({ weights: { ...planner.weights, fuel: v } })}
            />
            <Slider
              label="Time"
              value={planner.weights.time}
              min={0}
              max={4}
              step={0.05}
              display={num(planner.weights.time, 2)}
              onChange={(v) => setPlanner({ weights: { ...planner.weights, time: v } })}
            />
            <Slider
              label="Risk"
              value={planner.weights.risk}
              min={0}
              max={8}
              step={0.1}
              display={num(planner.weights.risk, 1)}
              onChange={(v) => setPlanner({ weights: { ...planner.weights, risk: v } })}
            />
            <Slider
              label="Lattice resolution"
              value={planner.gridResolutionDeg}
              min={0.25}
              max={1.5}
              step={0.25}
              display={`${num(planner.gridResolutionDeg, 2)}°`}
              onChange={(v) => setPlanner({ gridResolutionDeg: v })}
            />
            <Toggle
              label="Avoid tracked icebergs"
              checked={planner.avoidIcebergs}
              onChange={(v) => setPlanner({ avoidIcebergs: v })}
              hint="Keep-out zones follow each berg's forecast drift track, not its position today."
            />
          </div>

          <button
            type="button"
            className="btn btn-accent mt-3 w-full"
            disabled={phase === 'planning'}
            onClick={() => void runPlan()}
          >
            <Play size={13} />
            {phase === 'planning' ? 'Planning…' : 'Plan voyage'}
          </button>
          <p className="mt-1 text-2xs text-ink-3">
            Two independent searches, then both tracks sailed through identical physics. Takes 15
            to 30 seconds.
          </p>
          {planError && <ErrorNote message={planError} onRetry={() => void runPlan()} />}
        </Panel>

        {plan?.search && (
          <Panel title="Search diagnostics">
            <KeyValue label="Nodes expanded" value={num(plan.search.nodes_expanded, 0)} />
            <KeyValue label="Rejected: land" value={num(plan.search.nodes_rejected_land, 0)} />
            <KeyValue label="Rejected: POLARIS" value={num(plan.search.nodes_rejected_rio, 0)} />
            <KeyValue label="Rejected: icebergs" value={num(plan.search.nodes_rejected_iceberg, 0)} />
            <KeyValue label="Rejected: clearance" value={num(plan.search.nodes_rejected_clearance, 0)} />
            <KeyValue label="Lattice cells" value={num(plan.search.lattice_cells, 0)} />
            <KeyValue label="A* time" value={num(plan.search.search_ms, 0)} unit="ms" />
            <KeyValue label="Goal reached" value={plan.search.goal_reached ? 'yes' : 'no'} />
          </Panel>
        )}
      </div>

      <div className="flex min-h-0 flex-col gap-2">
        <div className="relative min-h-[280px] flex-1 overflow-hidden rounded border border-hair bg-panel">
          <MapCanvas scene={scene} fitTargets={fitTargets} onClickPoint={(ll) => setInspect(ll)} />
          {phase === 'planning' && (
            <ComputeOverlay
              title="Planning"
              elapsedMs={elapsed}
              expectedMs={30_000}
              steps={[
                'Building the search lattice and ice field cache',
                'Integrating iceberg drift tracks for the corridor',
                'Searching the ice-blind baseline route',
                'Searching the POLARIS-constrained route',
                'Sailing both tracks through the physics',
              ]}
            />
          )}
        </div>

        <Panel
          title="Optimised against the ice-blind baseline"
          subtitle={plan?.savings_method}
          right={plan ? <Badge tone="accent">{plan.vessel_name}</Badge> : undefined}
          className="shrink-0"
        >
          {!plan ? (
            <EmptyState
              title="No plan yet"
              detail="Configure the passage and press Plan voyage."
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Stat
                  label="Fuel saved"
                  value={signed(plan.fuel_saved_percentage, 2)}
                  unit="%"
                  size="lg"
                  tone={plan.fuel_saved_percentage >= 0 ? 'ok' : 'danger'}
                  hint={plan.fuel_saved_percentage < 0 ? 'The safe route burns more' : undefined}
                />
                <Stat
                  label="Time saved"
                  value={num(plan.time_saved_hours, 0)}
                  unit="h"
                  size="lg"
                  tone={plan.time_saved_hours >= 0 ? 'ok' : 'danger'}
                  hint={hoursToDhm(Math.abs(plan.time_saved_hours))}
                />
                <Stat
                  label="CO2 avoided"
                  value={signed(plan.co2_saved_tonnes, 1)}
                  unit="t"
                  tone={plan.co2_saved_tonnes >= 0 ? 'ok' : 'danger'}
                />
                <Stat
                  label="Extra distance"
                  value={signed(plan.distance_delta_nm, 0)}
                  unit="nm"
                  tone="muted"
                />
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-xs2">
                  <thead>
                    <tr className="text-2xs uppercase tracking-[0.1em] text-ink-3">
                      <th className="py-1 text-left font-normal">Route</th>
                      <th className="py-1 text-right font-normal">Distance</th>
                      <th className="py-1 text-right font-normal">Time</th>
                      <th className="py-1 text-right font-normal">Fuel</th>
                      <th className="py-1 text-right font-normal">min RIO</th>
                      <th className="py-1 text-right font-normal">Max compr.</th>
                      <th className="py-1 text-right font-normal">Feasible</th>
                    </tr>
                  </thead>
                  <tbody className="num">
                    {[plan.baseline, plan.optimized].filter(Boolean).map((r) => (
                      <RouteRow key={(r as RouteEvaluation).label} evaluation={r as RouteEvaluation} />
                    ))}
                  </tbody>
                </table>
              </div>

              {plan.baseline_would_be_prohibited && (
                <div className="mt-2 flex items-start gap-2 rounded-sm border border-danger/40 bg-danger/10 p-2 text-2xs text-danger">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>
                    The ice-blind baseline enters ice where POLARIS prohibits operation. Its fuel
                    figure is what the passage would cost if it were survivable.
                  </span>
                </div>
              )}

              {plan.warnings.map((w) => (
                <div
                  key={w}
                  className="mt-2 flex items-start gap-2 rounded-sm border border-caution/40 bg-caution/10 p-2 text-2xs text-caution"
                >
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

function RouteRow({ evaluation }: { evaluation: RouteEvaluation }): JSX.Element {
  const optimised = evaluation.label.toLowerCase().includes('optimised');
  return (
    <tr className={`border-t border-hair ${optimised ? 'text-ink' : 'text-ink-2'}`}>
      <td className="py-1.5 pr-2 font-sans">
        <span className="flex items-center gap-1.5">
          <Route size={11} className={optimised ? 'text-accent' : 'text-ink-3'} />
          {evaluation.label}
        </span>
      </td>
      <td className="py-1.5 text-right">{num(evaluation.total_distance_nm, 0)} nm</td>
      <td className="py-1.5 text-right">{num(evaluation.total_transit_hours, 0)} h</td>
      <td className="py-1.5 text-right">{num(evaluation.total_fuel_burn_tonnes, 0)} t</td>
      <td className="py-1.5 text-right" style={{ color: rioColor(evaluation.minimum_rio) }}>
        {evaluation.minimum_rio}
      </td>
      <td className="py-1.5 text-right">{num(evaluation.max_compression_index, 2)}</td>
      <td className="py-1.5 text-right">
        {evaluation.is_feasible ? (
          <span className="text-ok">yes</span>
        ) : (
          <span className="text-danger" title={evaluation.infeasible_reason}>
            no
          </span>
        )}
      </td>
    </tr>
  );
}
