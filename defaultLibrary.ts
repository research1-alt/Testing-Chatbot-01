
import { StoredFile } from './utils/db';

/**
 * MODULE: BATTERY SPECIFICATION DETAILS (HIGH PRIORITY)
 */
const batterySpecificationDetails = `
# MODULE: BATTERY SPECIFICATION DETAILS

## 1. Battery Make & Specifications

### Exicom Battery Specification
- Make & Trade Name - Exicom Energy Systems Pvt. Ltd.
- Model No - 2040506
- Weight - 90 KG
- Cell Configuration in Pack - 16S 2P
- Module Configuration in Pack - NA
- Capacity: 10.75 KWH / 210 Ah
- Operating Range: 46 V to 58.4 V
- KSI Voltage: 52V
- Nominal Voltage: 51.2V
- BMS Make - Exicom

### Exponent Battery Specification
- Make & Trade Name - Exponent Energy E- Pack
- Model No - E-Pack 5188 - TG1
- Weight - 104 KG
- Cell Configuration in Pack - Module to Pack
- Module Configuration in Pack - 8s Module, 2 Module in Series, 2 Modules in parallel
- Capacity: 8.8 KWH / 172ah
- Operating Range: 47.2V - 58V
- KSI Voltage: 5V (Drops to 2.5V-3V when KSI connected)
- Nominal Voltage: 51.2V
- BMS Make - Exponent Energy

### Clean Battery Specification
- Make & Trade Name - RTCXFC Industries Pvt Ltd 
- Model No - FLO 150 
- Weight - 120 KG
- Cell Configuration in Pack - 15S 1P 
- Module Configuration in Pack - NA
- Capacity: 15.1 KWH / 314Ah
- Operating Range: 43.5V to 54.75V
- Nominal Voltage: 48V 
- BMS Make - RTCXFC Industries Pvt Ltd 

## ADDITIONAL SYSTEM HARDWARE LOGIC
- CAN Termination: 120 Ohm in Cluster/MCU. 60 Ohm Parallel.
- Cluster Comparison: Sloki (Delay sensing) vs Virya (Basic).
`;

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

export const ALL_DEFAULT_LIBRARIES: StoredFile[] = [
  { name: 'BATTERY-SPECIFICATION-DETAILS.md', content: batterySpecificationDetails, size: 0, lastModified: Date.now() },
  { name: 'Module-Matel-12V.md', content: matelContent, size: 0, lastModified: Date.now() },
  { name: 'Module-Virya-Gen1-Old.md', content: viryaGen1OldContent, size: 0, lastModified: Date.now() },
  { name: 'Module-Virya-Gen1-AIS156.md', content: viryaGen1NewContent, size: 0, lastModified: Date.now() },
  { name: 'Module-Virya-Gen2.md', content: viryaGen2Content, size: 0, lastModified: Date.now() },
  { name: 'Module-Master-Error-Diagnostics.md', content: masterErrorContent, size: 0, lastModified: Date.now() }
];
