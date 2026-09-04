# Polar Datasets Guide for Antarctic Maritime Navigation

This guide details the exact open data sources used in the POLAR-NAV AI system.

## 1. Synthetic Aperture Radar (SAR)
* **Satellite:** Sentinel-1A / 1C (ESA Copernicus)
* **Instrument:** C-band SAR (5.405 GHz)
* **Product:** Level-1 Ground Range Detected (GRD), Extra Wide Swath (EW) mode
* **Resolution:** 40m spatial resolution, 400km swath
* **Latency:** ~1.5 - 3 hours from satellite pass via Copernicus Data Space Ecosystem (CDSE)
* **Key Strength:** All-weather, day-and-night imagery unaffected by polar night or cloud cover.

## 2. Passive Microwave Sea Ice Concentration
* **Satellites:** AMSR2 (JAXA GCOM-W1) and SSMIS (DMSP-F18)
* **Provider:** NASA / NSIDC & University of Bremen
* **Resolution:** 3.125 km (AMSR2 89 GHz) and 12.5 km (SSMIS)
* **Product:** Daily polar gridded sea-ice concentration (Antarctic South Pole Stereographic: EPSG:3031)
* **Key Strength:** Wide continuous regional coverage of Southern Ocean pack ice.

## 3. Atmospheric Meteorological Reanalysis & Forecasts
* **Provider:** ECMWF (European Centre for Medium-Range Weather Forecasts)
* **Products:** ERA5 Reanalysis (historical training) & HRES / IFS (operational forecasting)
* **Parameters:** 
  - u10, v10: 10-meter zonal and meridional wind components (m/s)
  - t2m: 2-meter air temperature (K)
  - msl: Mean sea-level pressure (Pa)
* **Resolution:** 0.1 deg to 0.25 deg grid, hourly / 3-hourly intervals.

## 4. Oceanographic Currents & Temperature
* **Provider:** Copernicus Marine Service (CMEMS)
* **Model:** Global Ocean Physics Analysis and Forecast (GLOBAL_ANALYSISFORECAST_PHY_001_024)
* **Parameters:** 
  - uo, vo: Eastward and northward sea water velocities (surface to 50m depth)
  - thetao: Sea water potential temperature (SST)
  - siconc: Sea ice area fraction
  - sithick: Sea ice thickness
* **Resolution:** 1/12 deg (~8 km grid), daily / 6-hourly updates.

## 5. Iceberg Tracking Database
* **Provider:** US National Ice Center (USNIC) & Antarctic Iceberg Tracking Database (BYU)
* **Data:** Positions, length, width, and drift tracks for all named icebergs >= 10 nautical miles (e.g., A-68, D-28).
