# POLAR-NAV AI: demonstration script

A five-minute walkthrough that shows the system doing real work, in an order that survives
questions. Written for whoever is presenting, and for anyone who wants to verify the claims
themselves.

**Before you start:** run it once. The first route plan builds lookup tables and integrates the
iceberg catalogue, so it takes about 30 seconds; every plan after that takes about 12. Do that
warm-up before you stand up.

```bash
pip install -r requirements.txt
uvicorn src.api.main:app --port 8000     # terminal 1
cd frontend && npm install && npm run dev # terminal 2
```

---

## 0. The one thing to say first (15 seconds)

> "The ship physics, the IMO POLARIS risk tables and the Antarctic coastline are real. The
> weather and sea-ice fields are simulated stand-ins for ERA5, CMEMS and OSI-SAF. Every number
> you are about to see is computed when I press the button, and anything simulated is labelled
> as simulated in the interface."

Saying this first turns the biggest weakness into a demonstration of rigour. If you skip it and
a judge finds out later, everything else you said becomes suspect.

---

## 1. Plan a passage (90 seconds)

**Voyage Planner → Cape Town → Bharati Station → MV Vasiliy Golovnin → Plan.**

While it computes, explain what it is doing: two independent A* searches over a lattice with the
real coastline as a hard constraint, one with full ice knowledge and one with none, then both
tracks sailed through identical physics.

When it returns:

| Route | Distance | Time | Fuel | min RIO |
| :--- | ---: | ---: | ---: | ---: |
| Ice-blind shortest navigable | 2853 nm | 719 h | 301 t | 6 |
| POLARIS-constrained optimised | 3018 nm | 306 h | 292 t | 12 |

> "The safe route is 165 miles longer and arrives seventeen days sooner, because it goes around
> the thick ice instead of grinding through it. And its worst-case Polar Code risk index is 12
> rather than 6."

**The line that wins the room:** point at the fuel number and say it out loud:

> "On this leg we save 2.8% of fuel. On the Maitri leg we *lose* 8% — the safe route burns more,
> because the extra distance costs more than the ice it avoids. We report that, because the
> saving is the difference between two model runs, not a percentage we chose. The previous
> version of this prototype multiplied the answer by 1.22 and called it a 22% saving. That is
> the bug we came back and fixed."

---

## 2. Show the map is real (45 seconds)

**Bridge Console.** Zoom into Prydz Bay.

- The projection is EPSG:3031 Antarctic Polar Stereographic, not Web Mercator, which is unusable
  at 70°S.
- The coastline is 97 Natural Earth polygons, and it is the *same geometry* the planner uses as
  its land mask — the map cannot show something the optimiser does not respect.
- No tile server. Nothing loads from the internet. Pull the network cable and it keeps working.

**Click anywhere on the ice.** The readout shows concentration, thickness, WMO stage of
development, drift vector, divergence and the POLARIS risk index at that exact point.

> "Maitri is 80 km inland, so no ship can sail to it. Each station carries a validated seaward
> anchorage — ships route to India Bay and move cargo overland. The system checks that against
> the real coastline at start-up."

---

## 3. Sail it (90 seconds)

**Press play on the voyage.**

Let it run into the ice edge. Point out, as they happen:

- Speed falling from 14 knots to 6 and then 2 as the ice thickens — that is the Lindqvist power
  and propeller-thrust balance being solved every tick, not a scripted animation.
- The RIO gauge dropping as concentration rises.
- Alerts appearing: `HEAVY_WEATHER`, then `GROWLER_CONTACT`, then `COMPRESSION_BESETTING`.

> "That compression alert is the answer to 'what if the lead closes behind us'. We compute the
> divergence of the ice drift field. Where it is convergent, floes are being driven together,
> leads close and ships get beset. The planner penalises those regions and the voyage engine
> alerts on them."

**Open the radar scope.**

> "Growlers are the real hull-holing hazard and satellites cannot see them. This is a simulated
> X-band radar, and the honest part is what it *misses*: in a typical pack-ice sweep there are 39
> real targets, it paints 13, and 26 go undetected — one of them inside the three-mile alert
> perimeter. Detection range for a growler collapses from 3.0 nm in calm water to 0.6 nm in heavy
> clutter. A system that claimed to see all of them would be lying."

---

## 4. The AI question (60 seconds)

Someone will ask what is actually AI. Answer directly.

> "Three models are trained, by one command, on data generated from our own physics environment.
> One works and two do not, and I will tell you which."
>
> - **Growler and clutter classifier: works.** F1 0.989 against 0.701 for an SNR threshold. It is
>   used in the serving path, because separating a small ice target from a clutter spike depends
>   on the combination of blob shape, Doppler and sea state, which a threshold cannot do.
> - **Sea-ice forecaster: does not beat the physics.** It ties persistence and stays about 7%
>   behind our semi-Lagrangian scheme, so the API serves the physics. In a world whose ice
>   patterns are generated by advection, an advection scheme is close to the right answer.
> - **Iceberg drift residual corrector: marginal.** It improves the mean position error by 1.3%
>   and makes the median worse. Not used.
>
> "The pipeline is real, the splits are time-based and embargoed, and every number is in
> `models/metrics.json`. On real Copernicus data, retraining is a data-loader change."

If you are asked why keep the failures: because the physics is strong enough to carry the
product, and a system that claims three working AI engines when one works is a system nobody
should trust with a ship.

---

## 5. It works on a ship (30 seconds)

**Analytics → bandwidth panel.**

> "Below 60°S there is no geostationary coverage. Everything goes over Iridium Certus, shared
> with the science and welfare traffic. A full ice raster is 66 KB. We send contours instead:
> 6.2 KB, and four updates a day total 23.4 KB against a 50 KB budget. Those are measured bytes —
> we build both payloads, gzip them and read the lengths."

**Export → GPX.**

> "You cannot install unapproved software inside a type-approved ECDIS. So this runs on a
> separate console and hands the ECDIS standard GPX and S-411-shaped overlays over the ship's
> LAN, read-only."

---

## Verify it yourself

```bash
python -m pytest tests/ -q      # 106 tests
python -m src.cli               # the whole system in a terminal, no browser
python -m scripts.train         # retrain every model and regenerate models/metrics.json
```

---

## Questions worth rehearsing

**"How do you know ice thickness without altimetry?"**
CryoSat-2 and ICESat-2 have narrow swaths and long repeat cycles, so they cannot support
tactical navigation. We use Stefan's Law growth on accumulated Freezing Degree Days plus dynamic
ridging where the drift field converges — the same approach operational ice services use. Growth
saturates near 1.55 m where oceanic heat flux balances conduction through the ice and its snow;
pure Stefan growth would wrongly predict 3 to 4 m by late season.

**"Is your forecast any good?"**
It beats persistence, which is the bar. Skill score +0.08 at 24 h rising to +0.17 at 120 h,
verified against the analysis valid at the same time, with the forecast never seeing it. Inside
a simulated environment, and we say so.

**"What happens if the ice is worse than forecast?"**
The voyage engine resamples conditions at the ship's actual arrival time, not at planning time.
If a hard constraint is violated it re-plans from the present position and records the diversion.
Press the re-route button and it happens live.

**"Why not PyTorch and a U-Net, like IceNet?"**
Because our trained models are tabular and fit in seconds on a CPU, and a bridge PC has no GPU.
A U-Net is the right tool once real satellite rasters replace the synthetic fields, and that is
listed as future work rather than claimed as done.

**"What is the weakest part?"**
The environmental fields are synthetic, so all skill figures are simulated-environment figures.
Everything else — the physics, the risk tables, the coastline, the geodesy, the optimiser — is
real, and the interfaces already match the shape of the Copernicus and NSIDC products.
