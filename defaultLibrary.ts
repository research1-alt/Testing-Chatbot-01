
import { StoredFile } from './utils/db';

/**
 * MODULE 1: MATEL POWER TRAIN (12V SYSTEM)
 */
const matelContent = `
# MODULE: MATEL POWER TRAIN (12V)
## Operational Procedures
- **Vehicle On Sequence:** 12V From aux Battery to FAB(Fuse Box Aux Battery INput), FAB (Output) to Emergency Switch input , Emergency Switch Output to Ignition Switch Input.
- **Step 1:** Main 48V Battery turns ON. Cluster ON.
- **Step 2:** MCU turns ON. DC-output Relay On.

## Troubleshooting: Not Moving
1. Check MCU Ignition (12V).
2. Check MCU Fuse Box (FMCU).
3. Check BFGNR Switch (12V input from Ignition Switch Pin 2).

## Hardware Details
- MCU KSI: 12V.
- Throttle/Encoder: 5V.
- Operating Voltage: 42V to 60V.
`;

/**
 * MODULE 2: VIRYA GEN 1 - OLD WIRING
 */
const viryaGen1OldContent = `
# MODULE: VIRYA GEN 1 - OLD WIRING
## Start Sequence
- Step 1: Main 48V Battery turns ON.
- Step 2: DC-output Relay On.
- MCU Wake-up: Receives 48V from Terminal Box via MCU Relay.

## Troubleshooting
1. Main battery status.
2. MCU Relay output (48V at Pin 87a).
3. BFNR Input ground signal.
`;

/**
 * MODULE 3: VIRYA GEN 1 - NEW (AIS 156)
 */
const viryaGen1NewContent = `
# MODULE: VIRYA GEN 1 - AIS 156 (NEW)
## Logic
- Source: Aux Battery is primary for Ignition.
- Startup: Aux Battery (+) -> FAB -> Emergency Switch -> Ignition Switch.

## Relay Pinouts
- Cluster Relay: Pin 30 (Output to Meter), Pin 87 (12V from Ignition).
- R48VBatt: Pin 87 (To Batt 6W), Pin 86 (12V from Ignition).
- MCU Relay: Pin 30/86 (48V Supply), Pin 87a (48V Output to MCU).
`;

/**
 * MODULE 4: VIRYA GEN 2
 */
const viryaGen2Content = `
# MODULE: VIRYA GEN 2
## Power Flow
- Aux Battery -> FAB -> Emergency Switch -> Ignition Switch.
- MCU Wake-up: 48V from Terminal Box at MCU pins 1 & 2.

## Technical Info
- MCU KSI: 48V.
- BFGNR: Ground based.
- Throttle: 5V.
`;

/**
 * MODULE 5: MASTER ERROR DIAGNOSTICS
 */
const masterErrorContent = `
# MODULE: MASTER ERROR DIAGNOSTIC
## Error List
- Err-1: Battery Fault
- Err-2: Battery Over Temperature
- Err-10: MOSFET Failure
- Err-20: MCU Communication
- Err-31: Controller Overcurrent
- Err-51: Throttle Wiper High
- Err-60: High Pedal Disable

## Procedures
[STEP 1] Identify code on LCD.
[STEP 2] Check context below for specific brand troubleshooting.
`;

/**
 * MODULE 6: CENTRAL HARDWARE SPECIFICATION DATA (HIGH PRIORITY)
 */
const batterySpecificationDetails = `
# MODULE: GLOBAL HARDWARE & BATTERY SPECIFICATIONS
[PRIORITY TECHNICAL DATA SHEETS]

## BRAND: EXCOM
- Make & Trade Name: Exicom Energy Systems Pvt. Ltd.
- Model: 2040506
- Weight: 90 KG
- Configuration: 16S 2P
- Capacity: 10.75 KWH / 210 Ah
- Operating Range: 46V - 58.4V
- Nominal Voltage: 51.2V

## BRAND: EXPONENT
- Make & Trade Name: Exponent Energy E-Pack
- Model: E-Pack 5188 - TG1
- Weight: 104 KG
- Module Config: 8s Module, 2 Series, 2 Parallel
- Capacity: 8.8 KWH / 172ah
- Operating Range: 47.2V - 58V
- KSI Voltage: 5V (Drops to 2.5V-3V on connection)
- Nominal Voltage: 51.2V
- BMS Make: Exponent Energy

## BRAND: CLEAN
- Make & Trade Name: RTCXFC Industries Pvt Ltd
- Model: FLO 150
- Weight: 120 KG
- Configuration: 15S 1P
- Capacity: 15.1 KWH / 314Ah
- Operating Range: 43.5V - 54.75V
- Nominal Voltage: 48V
- BMS Make: RTCXFC Industries

## SYSTEM HARDWARE LOGIC
- CAN Termination: 120 Ohm in Cluster/MCU. 60 Ohm Parallel.
- Cluster Comparison: Sloki (Delay sensing) vs Virya (Basic).
`;

export const ALL_DEFAULT_LIBRARIES: StoredFile[] = [
  { name: 'Module-Matel-12V.md', content: matelContent, size: 0, lastModified: Date.now() },
  { name: 'Module-Virya-Gen1-Old.md', content: viryaGen1OldContent, size: 0, lastModified: Date.now() },
  { name: 'Module-Virya-Gen1-AIS156.md', content: viryaGen1NewContent, size: 0, lastModified: Date.now() },
  { name: 'Module-Virya-Gen2.md', content: viryaGen2Content, size: 0, lastModified: Date.now() },
  { name: 'Module-Master-Error-Diagnostics.md', content: masterErrorContent, size: 0, lastModified: Date.now() },
  { name: 'BATTERY-&-SYSTEM-HARDWARE-SPECIFICATIONS.md', content: batterySpecificationDetails, size: 0, lastModified: Date.now() }
];
