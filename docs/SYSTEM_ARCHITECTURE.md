# POLAR-NAV AI: System Architecture

## 1. High-Level Architecture Overview
The platform consists of a **Dual-Tier Distributed Architecture**:

`
+-----------------------------------------------------------------------------------+
|                           CLOUD GEOSPATIAL PIPELINE (NCPOR HQ)                    |
|                                                                                   |
|  [Satellite & Climate Ingestion]  -->  [Pre-processing & Harmonization]           |
|  - Sentinel-1 SAR (ESA NRT)            - Radiometric calibration                  |
|  - AMSR2 / SSMIS (NSIDC)               - Landmasking & EPSG:3031 projection       |
|  - ERA5 / GFS (ECMWF)                  - Temporal fusion                          |
|  - HYCOM / CMEMS (Copernicus)                                                     |
|                                                     |                             |
|                                                     v                             |
|                                        [AI Macro-Forecast Engine]                 |
|                                        - 7-Day Sea-Ice Concentration (SIC)        |
|                                        - Calved Iceberg Lagrangian Drift          |
|                                        - Macro-Route Strategic Waypoints          |
+-----------------------------------------------------+-----------------------------+
                                                      |
                                       Satellite Uplink (<50 KB / Day)
                                       MQTT / Zarr Deltas over Iridium
                                                      |
                                                      v
+-----------------------------------------------------------------------------------+
|                        SHIPBOARD EDGE CONSOLE (VESSEL BRIDGE)                     |
|                                                                                   |
|  [Local Edge Inference Engine]    <--  [Shipboard Sensor Ingestion]               |
|  - ONNX Quantized Local Routing        - GPS / Gyro / AIS (NMEA-0183/2000)        |
|  - Tactical What-If Detours            - Anemometer & Water Temp                  |
|  - POLARIS RIO Dynamic Calculator      - Marine X-Band Radar (Growler detection)  |
|                                                                                   |
|                                                     |                             |
|                                                     v                             |
|  [Navigation Bridge Outputs]                                                      |
|  - Rugged Touchscreen 4D Decision Console (Deck.gl / CesiumJS)                    |
|  - Standard IHO S-411 / S-100 Vector Layers sent to primary certified ECDIS       |
+-----------------------------------------------------------------------------------+
`

## 2. Core AI Engines
1. **Sea-Ice Concentration Forecaster (SIC)**
   - Inputs: Multi-channel tensor [SAR backscatter, AMSR2 brightness temp, 10m wind (u,v), SST, 2m air temp].
   - Model: Spatiotemporal Conv-U-Net with temporal attention.
   - Output: 24h-168h lead-time ice concentration grids (0.0 to 1.0).

2. **Iceberg Drift Engine (PINN)**
   - Forces: Air drag, Water drag, Coriolis acceleration, Sea surface slope, Wave radiation stress.
   - Dynamic parameter learning for submerged keel geometry and form drag.

3. **POLARIS Risk & Route Optimizer**
   - Cost function: J = integral (w1 * P_engine(v, H_ice) + w2 * RiskPenalty(RIO)) dt
   - Hard constraint: RIO >= 0.
