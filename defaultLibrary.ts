import { StoredFile } from './utils/db';

const osmTechnicalManualContent = `
# OSM Service Technical Manual (MATEL Powertrain)

## 1. DC Output Relay (RDC_Output) - 12V 5-Pin Relay
- **Pin 30:** 12V Supply From DC Convertor output Via Fuse Box F12V. Supply active at Vehicle ON and Charging time. (Wire: Yellow/Black)
- **Pin 87:** 12V Output From Relay to operate all 12V Component included Aux Battery Charging. (Wire: Yellow)
- **Pin 87a:** 12V Supply to Cluster Relay at Pin no 87a only Charging time. (Wire: Yellow)
- **Pin 86:** 12V Supply From Ignition Switch (I02). (Wire: Yellow/Red)
- **Pin 85:** Common Ground. (Wire: Black)
- **Image Description:** A 5-pin relay diagram labeled RDC_Output. Show Yellow/Black wire at Pin 30, Yellow wire at Pin 87, and Yellow/Red at Pin 86. Pin 85 is connected to ground.

## 2. Vehicle Start Sequence (MATEL)
- **Ignition Step 1:** Only Battery is getting ON.
- **Ignition Step 2:** MCU is getting ON.
- **Circuit Path:** Aux Battery -> Fuse Box input -> Fuse Box output -> Emergency Switch input -> Emergency Switch Output -> Ignition Switch Input -> Battery Relay and MCU relay.

## 3. Matel MCU Relay Flow Diagram (RB3) - 12V Operated
- **Pin 30 & 86 (Looped):** 12V From Ignition Switch Pin No 2. (Wire: Yellow/Red)
- **Pin 87a:** 12V Output to FMCU (Fuse Box 1Amp) then to MCU Pin No 1 & 10. (Wire: Orange/White)
- **Pin 85:** Ground From Telematics Pin No 4 (Violet) OR Charging Cutoff pin No 2 (Pink-Black).
- **Function:** Controls MCU power. MCU gets power via 87a (NC) normally. If immobilized (Telematics) or Charging, relay activates and cuts power to MCU.

## 4. Cluster Relay Diagram - 12V Operated
- **Pin 30:** 12V Output to Cluster Meter. (Wire: White/Red)
- **Pin 85:** Common Ground. (Wire: Black)
- **Pin 86 & 87 (Short):** 12V Input From Ignition Switch Pin No 3. (Wire: Pink/Yellow)
- **Pin 87a:** DC Convertor 12V Output Relay Pin no 87a (Only in time of charging). (Wire: Yellow)

## 5. 48V Battery Ignition Circuit (RB3)
- **Pin 87:** Connects to Batt 6W TTP-06FN(WS). (Wire: Red/Yellow)
- **Pin 30:** Connects to Batt 6W TTP-06FN(WS). (Wire: Pink)
- **Pin 86:** 12V From Ignition Switch Pin No 3. (Wire: Pink/Yellow)
- **Pin 85:** Ground From Cluster Delay .1.

## 6. Regen Relay (RR/RB3) - 12V Operated
- **Pin 30 & 86 (Looped):** 12V From Ignition Switch Pin No 2. (Wire: Yellow/Red)
- **Pin 87:** To 48V12V Connector at Pin No 6. (Wire: Green/Yellow)
- **Pin 85:** Ground From VCU Pin No 4. (Wire: Black/Green)

## 7. Relay Aux Battery Charging - 48V Operated
- **Pin 86 & 30 (Looped):** 48V Supply From Terminal Box. (Wire: Red)
- **Pin 87:** To Aux Battery (VIA Fuse Box 7.5A). (Wire: Yellow/Green)
- **Pin 85:** Ground From Charging Cutoff Pin no 2. (Wire: Pink-Black)
- **Pin 30 (Alternate Input):** 12V Output For DC Convertor (VIA Fuse Box 15A). (Wire: Yellow/Black)

## 8. Fuse Box Assignments
- **F12V:** 15A - DC Convertor Output (12V)
- **FAB:** 7.5A - Aux Battery Protection
- **FMCU:** 1A - MCU Ignition Line Protection
- **FDCI:** 7.5A - DC Convertor Input
- **FFP:** 1A - 12V Aux Connector (near Batt 6W)

## 9. Mode Switch Connection (BFGNR)
- **Pin 1:** 12V Input from Ignition Switch.
- **Pin 2:** Forward Mode (VCU Pin 3, Orange-Green).
- **Pin 3:** Boost Mode (VCU Pin 8, Gray-Black).
- **Pin 4:** Neutral Mode (VCU Pin 6, Red-Green).
- **Pin 5:** Reverse Mode (VCU Pin 1, White).
- **Pin 6:** Gradient Mode (VCU Pin 12, Brown-White).

## 10. Diode Uses
- **CID:** Convertor Input Diode (48V line) - Single direction flow.
- **CC:** Charging Cutoff Diode.
- **AUX BAT:** Aux Battery Charging Diode (Max 10Amp).

## 11. CAN Bus & Termination Notes
- **Resistance:** 120 Ohm termination in Cluster and MCU. Total system parallel resistance = 60 Ohms.
- **Odometer Saving:** Step 1 must turn on 48V Battery. Step 2 must turn on MCU. If both turn on together, odometer reading may not save.
`;

export const matelEvKnowledgeBase: StoredFile[] = [
  {
    name: 'OSM-Technical-Manual-Complete.md',
    content: osmTechnicalManualContent,
    size: osmTechnicalManualContent.length,
    lastModified: Date.now(),
  },
  {
    name: 'EV-Troubleshooting-Guide-Summary.md',
    content: "Summary of OSM Service procedures and component wiring.",
    size: 56,
    lastModified: Date.now() - 5000,
  }
];
