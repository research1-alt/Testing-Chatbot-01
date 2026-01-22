import { StoredFile } from './utils/db';

const matelEvContent = `
# EV Troubleshooting Guide

This document is a comprehensive guide based on the official MATEL electric vehicle wiring diagrams and technical notes.

## 1. Main Wiring Harness and Color Codes

### Main Components Overview:
- VCU (Vehicle Control Unit) 
- MCU (Motor Control Unit)
- 12V Aux Battery & 48V Main Battery System
- Throttle & Brake Potentiometer
- DC-DC Convertor
- Telematics, Cluster, Relays, and Fuses, ignition Switch, Emergency Switch

### Wire Color Coding Legend:
- Aux Battery 12V: Yellow/green (+ve), Black(-ve)
- **DC 12V:** Converted 12V power
- **48V:** Main 48V power line
- **Ground:** System ground (Black)
- **CAN High:** Yellow
- **CAN Low:** Green
- **Signals:**
- Cluster Types
   We are using two types of clusters in our system:
  1. Sloki Cluster
   Features:
   1- Additional sensing for 12V input
   2- In-built delay option — allows delaying DC output and main battery ignition
   3- Designed for advanced applications requiring controlled startup timing
  2. Virya Cluster
   Features:
   1- Basic functionality and tail-tail indicators
   2- Suitable for standard monitoring and basic signaling requirements

---

## 2. Relay Specifications and Functions
### Basic Relay Function (12V, 5-Pin)
- Purpose's for Switching Power Supply in Circuit.
-Pin Uses: 86, 85, 87, 87a, 30.
-Connections:
 -Pin No 85:Coil Ground 
 -Pin No 86:Coil Power 
 -Pin No 87, 87a, 30: Switching Points of Relays
 -Function/Working:
   1- If Coil have no Power - 87a and 30 Normally Connected, 87 and 30 Normally open.
   2- If Coil have Power - 87 and 30 Normally Connected, 87a and 30 Normally open. 

### Cluster Relay (12V, 5-Pin) (AS PER AIS 156)
- Purpose: Controls power to the instrument cluster.
- Connections: 
   1- Pin 30:- Output to Cluster Meter (White/Red)
   2- Pin 87a:- Input from DC output Relay during charging (Yellow)
   3- Pin 86:- Input from Ignition Switch (Pink/Yellow) Form Pin no 3
   4- Pin 85:- Common Ground (Always Comes)
   5- Pin 87:- 12V Supply From Ignition Switch Pin No 3
- Working Operation:
   1-Ignition On:- 12V Supply Comes from Ignition Switch Pin no 3 to Relay Pin no 86 and 87.Relay Pin no 85 have Common grond. So When we turn on the Key Relay goes Energized and 12V Supply's goes to Cluster From Relay Pin no 30.
   2 Charging:- During the Charging time Ignition key is off so 12V Supply comes form DC Output Relay pin no 87a to Cluster relay pin no 87a. In this Condition Ignition Switch is off so this 12V Supply Directly goes to Cluster From Cluster Relay Pin no 30.
  Note:- This Relay Circuit Belong to only Virya Gen2 and Matel.

### Reverse Relay (12V, 4-Pin)
- **Purpose:** Activates the reverse tail lamp.
- **Operation:** Ground signal from the BFNR (Mode) switch energizes the coil and Supply goes to reverse tail light.
- **Connections:**
   1- Virya Gen1:-
   - **Pin 30:** 12V Supply From DC Convertor
   - **Pin 87:** Output to Reverse Lamp (White) by 48v12V Connector
   - **Pin 86:** 12V BFNR Switch During Reverse Mode(Red/Green)
   - **Pin 85:** Connected to Common Ground
   2- Virya Gen2:-
   - **Pin 30:** 12V Supply From DC output Relay Pin no 30
   - **Pin 87:** Output to Reverse Lamp (White) by 48v12V Connector
   - **Pin 86:** 12V Supply From Ignition Switch Pin no 3
   - **Pin 85:** Ground From BFNR Switch during Reverse Mode through Diode.
      Note:- Ground Comes in Relay From BFNR Switch 1 Diode is available in that route.
   3- Matel:- No Relay Required

### 48V Battery Ignition Relay (R48VBatt) (12V, 4-Pin)
- **Purpose:** Engages the Main 48V battery.
- **Operation:** When energized by the ignition switch, shorts the battery ignition wire to turn the main battery ON.
- **Connections:**
  - **Pin 30 & 87:** Connected to Batt 6W terminals pin no 1 & 3.
  - **Pin 86:** 12V from Ignition Switch Pin 3.
  - **Pin 85:** Ground from Cluster Delay Pin 1 (If Sloki Cluster used).Connected For Common ground(If Virya Cluster used).
    Note:- Common Circuit For Virya Gen2 & Matel

### MCU Relay 
- Purpose: Controls the wake-up MCU.
-  Connections:
    1-Virya Gen2 (48V, 5Pin)
  - Pin 30: 48V output to MCU wake-up (Orange)
  - Pin 87a & 86: Looped; 48V input from FDCI fuse (Gray)
  - Pin 85: Ground from Charging Cutoff or Telematics (Immobilizer)
    2-Matel (12V, 5Pin)
  - Pin 87a: 12V output to MCU wake-up (Orange)
  - Pin 30 & 86: Looped; 12V input from Ignition Switch Pin no 2.
  - Pin 85: Ground from Charging Cutoff or Telematics (Immobilizer)
-   Operation: 
    1- During Drive/Ignition ON, Relay is off Because relay coil ground missing, and supply goes to MCU.
    2- During Charging or Immobilize (IOT) relay coil gets ground, so Relay gets on and Cutt the wake up supply to MCU (Only for Virya Gen2). For Matel relay don't have 12V Supply in coil so relay didn't getting on During Charging, Relay only getting on in time of Immobalize command through IOT.


### DC Output Relay (RDC_Output) (12V, 5-Pin)
- **Purpose:** Distributes 12V power from the DC-DC converter to components and the Aux battery.
- **Connections:**
  - 1- Pin 30:- 12V Input from DC Convertor (via F12V fuse)
  - 2- Pin 87:- 12V Output to 12V components & Aux Battery charging
  - 3- Pin 87a:- 12V Output to Cluster Relay for charging time.
  - 4- Pin 86:- 12V from Ignition Switch Pin no 2.
  - 5- Pin 85:- For Virya Gen 2, This pin Connected to Common Ground(Virya Cluster). For Matel This Pin Connected to Cluster delay pin no 2(If we are using Sloki Cluster).
    Operation: 
     1- During Vehicle On:- Relay gets on and Give 12V supply to 12V Component also Charge 12V Aux Battery.
     2- During Vehicle Charging:- Relay Can't getting on Because 12v Supply for coil missing so DC Output supply goes to Cluster from Pin no 87a of Relay. Also during charging 12V Component is not getting on.

### Aux Battery Charging Relay (48V, 5-Pin)
- **Purpose:** Manages charging of the 12V Aux battery from the 48V system.
- **Operation:** Activates only when the vehicle is connected to a charger.
- **Connections:**
  - **Pin 30:** Output to DC Convertor input
  - **Pin 87:** Output to Aux Battery (via 7.5A fuse)
  - **Pin 86:** 48V input from terminal box Via Fuse Box.
  - **Pin 85:** Ground from Charging Cutoff Connector Pin 2.

### Regen Relay (12V, 5-Pin)
- **Purpose:** During Regen Activation Brake Light should be glow.
- **Operation: Activate When Regen Activated During Vehicle Running.
- **Connections:
   **Pin 30:** 12Volt, Output to Brake Light Via 48V12V Connector
   **Pin 87:** 12Volt Input From Ignition Switch Pin no 2
   **Pin 86:** 12Volt Input From Ignition Switch Pin no 2
   **Pin 85:** Ground Signal From VCU From Pin no 4
   Note- This Relay used only in Matel
---

## 3. Fuses, Switches, and Diodes

### Fuse Box Layout
- **F12V:** 15A - DC Convertor Output (12V)
- **FAB:** 7.5A - Aux Battery Protection
- **FDCI:** 7.5A - DC Convertor Input
- **FMCU:** 1A - MCU Ignition Line
- **FFP:** 1A - 12V Aux Connector

### Vehicle Ignition Circuit
- The 12V Aux Battery is the primary source for ignition. If it is dead, the vehicle will not start.
- **Power Path:** Aux Battery -> FAB fuse -> Emergency Switch -> Ignition Switch.
- **Ignition Switch:** Has 2 steps. Step 1 turns on the Battery. Step 2 turns on the MCU.

### Mode Switch (BFNR)
- Provides mode selection signals (Forward, Reverse, Boost, etc.) to the VCU by sending a 12V signal to the corresponding VCU pin.

### Diode Usage
- **CID:** Ensures single-direction current flow for the DC Convertor input.
- **CC:** Used in the charging cutoff line.
- **AUX BAT:** Used for charging the Aux Battery from the DC Convertor.

---

## 4. VCU & MCU Pinouts

### MCU Pins (Selected)
- **1, 10:** 12V Ignition Input
- **11, 12:** CAN High/Low
- **19:** 5V Supply to Encoder
- **20:** Motor Temperature Sensor Input

### VCU Pins (Selected)
- **1, 6:** Mode Inputs (Reverse, Neutral)
- **2, 11:** Throttle Signal Inputs
- **4:** Ground output to Regen Relay
- **8, 12:** Mode Inputs (Boost, Gradient)
- **14:** Brake Pot Signal Input

---

## 5. Operational Procedures & Notes

### Vehicle Start Sequence
1. **Key Turn (Step 1):** Main 48V Battery turns ON. Cluster ON.
2. **Key Turn (Step 2):** MCU turns ON. DC-output Relay On, Regen Relay got 12V, BFNR Switch got 12V (only in Matel)
- **Important:** This sequence is critical for saving the odometer reading correctly. Main Battery Needs to Turn on at 1st Step of Ignition Switch and MCU Turn on in Second Step. So When we turn on the key First Main Battery getting on then MCU getting On in 2nd Step. But When we turn off the Key First MCU Gets off than Main Battery. If This function Works Properly, then Odometer reading will be saved. If Not then odometer reading not save.
      If This sequence is not working properly Please check Main Battery and MCU Relay on Sequence.

### CAN Bus Notes
- 120 Ohm termination resistors are located in the Cluster and MCU.
- The battery and charger do not have termination.
- With all components connected, the total bus resistance should measure ~60 Ohms.

### Some Basic Issues and There solution
  1- Vehicle is taking Throttle Response:- 
   1- Check the Error Code in Cluster. If any clear that Error.
   2- If there is not any Error:- Check Drive mode Comes in cluster or Not. 
   If Comes :- Then Check Throttle Input and Output Signal to MCU. Input have 5V and output have 0.8-1.1V Supply in Idle Condition.
   If Throttle Input have Supply but output Don't have any Supply then Replace the Throttle and Check.
   If Throttle Input and  Output Both Have Supply, then check Throttle output Supply in MCU side at given pin. If MCU Got Throttle output signal but not responding. Update the supplier or replace the MCU and Check. Issue will be resolve.
   If Not Comes:- Then Check Input supply it should be 12V For Matel and Ground For Virya Gen 2 and 12V For Virya Gen 1. If Comes then Put any Drive Mode and Check given pin at MCU Side. If got supply in MCU Side so there will be any issue in MCU, update to Supplier or Change MCU than test. It Should be work.

  2- Vehicle Jerking:- 
   1- During Drive:- Check all the Basic Things, Brake pot Output signal should be 0.6-0.8V. Throttle Signal not Varying During Drive. Also Please check the Wheel freeness it should be Free.
   2- During Regen:- Check the regen Current Limit and Regen current Provided by MCU to Battery. MCU Needs to follow Regen Current limit given by Battery if not then update to supplier.
   Note:- Do not Try to Drive Virya Gen2 Vehicle in Jack up Condition, Vehicle will be off after giving throttle (AS Per Virya Team) also Do not Drive Vehicle More then 40KM at a single time(AS Per Virya Team). 

  3- Matel MCU Pin Position:-
    MCU 1:-
    Pin no - Belongs to  
      1- From Ignition (12V ) Operated
      7- XGND (Ground)  to Encoder Pin no 1.
      8- XGND (Ground) to Encoder Pin no 7.
      10- From Ignition (12V) Operated 
      11- Can High 
      12- Can Low
      15- Cos N to Encoder Pin no 4.
      16- Cos P to Encoder Pin no 3.
      17- Sin P to Encoder Pin no 5.
      18- Sin N to Encoder Pin no 6.
      19- XDRP (5V From MCU To Encoder) to Encoder Pin no 2.
      20- Motor Temperature to Encoder Pin no 8.
    Note:- Pin No 15,16,17,18,19,20,7,8 Belongs to MOTOR Encoder. These Wire Goes to MOTOR Encoder.
    MCU 2:- 
    Pin no - Belongs to
      1- Reverse Mode 
      2- Throttle First Signal 
      3- Eco Mode
      4- Ground From Controller to Regen Relay
      6- Neutral Mode 
      8- Boost Mode
      9- XGND (Ground From Controller)
      10- XDRP (5 V From Controller)
      11- 2nd Throttle Signal 
      12- Gradient Mode
      14- Brake Pot Signal 
    Note :- MCU1 & MCU2 Connector Pin Position as Per Printed over Connector. For Encoder Pin Position Counting From Right to Left Side 

   4:- Important Notes:- 
    1- There are 2 Step in Ignition Key, When we turn on Key That time Pin no 1 & Pin no 3 going to Short. When we turn on the Key that time Pin no 1, 2 & 3 get Short.
    2- 120 Ohm Can Termination Available in Cluster and MCU. Battery don’t have any 120 Ohm Termination. Also, in Vehicle architecture all CAN included Cluster, MCU & Battery are parallel Connected. So, When we check CAN Termination along with the all Component Connected, we got 60-ohm termination. Charger don’t have any Can Termination.
    3- If We are Charging our 48V Main Battery Pack without Connect to the Vehicle that time we need to Add 120 Ohm Resistance in Battery Can Line.
    4- 120 ohm Can Resistance required if We Charge our main battery without connected to the Vehicle. Also Please ensure Vehicle can and Charger Can are Parallel Connected.
    5- If we are Charging our 48V Main Battery in Vehicle that time 60 Ohm Resistance comes in can line. Also, all can lines are Parallelly connected.
    6- For Matel Odometer Saving, Please Ensure
      When we turn on 1st Step - 48V Main Battery need to ON also MCU Should not be turn on in 1st Step.
      When we turn on 2nd step - 48V main Battery and MCU need to ON.
      If this Function Miss match or Battery or MCU are getting on same time Odometer reading is not going to Save.
      Ignition Switch include 2 step. 
      For Checking Purpose Do one Thing Turn on key 1 step than check, only battery should be on. And when we do 2nd step that time MCU need to be ON. If Both are getting On at the same time, also check ignition switch pin no 2 & pin 3 have supply or not. It Pin no 2 & 3 Both have supply. Means may be that MCU relay creating issue so replace the relay and Check again.
`;

const batteryUsesContent = `
# Battery Uses

## Battery Make - Exicom
- Battery Capacity (KWH) - 10.75 KWH
- Operating Voltage Range - 47-54V
- Battery Capacity (ah) - 210ah
- KSI Voltage – 48V
- Nominal Voltage – 51.2V

## Battery Make - Exponent
- Battery Capacity (KWH) - 8.8kwh
- Operating Voltage Range - 47-54
- Battery Capacity (ah) - 172ah
- KSI Voltage – 5V
- Note: - Initially we got 5v at 1 point at Battery KSI line when KSI Line is connected than this Voltage line Drop at 2.5V to 3V.
- Nominal voltage – 51.2

## Battery Make - Clean
- Battery Capacity (KWH) - 15.1kw
- Operating Voltage Range - 43.5- 54
- Battery Capacity (ah) - 314ah
- KSI – Reverse Voltage
- Nominal Voltage- 48V
`;

const matelRelayGuideContent = `
# Relay Used in Matel Power Train

## 1 - DC Output Relay (RDC_Output) (12V, 5-Pin)
- **Relay Type Used**: RB6
- **Purpose**: Distributes 12V power from the DC-DC converter to components and the Aux battery.
- **Connections**:
  - 1- Pin 30: -12V Input from DC Convertor (via F12V fuse)
  - 2- Pin 87: -12V Output to 12V components & Aux Battery charging
  - 3- Pin 87a: -12V Output to Cluster Relay for charging time.
  - 4- Pin 86: -12V from Ignition Switch Pin no 2.
  - 5- Pin 85: -Cluster delay pin no 2 (If using SLOKI Cluster).
- **Operation**:
  - 1- During Vehicle On: Relay gets on and gives 12V supply to 12V components and charges 12V Aux Battery.
  - 2- During Vehicle Charging: Relay can't get on because 12V supply for coil is missing, so DC output supply goes to Cluster from Pin 87a of Relay. Also, during charging 12V components are not getting on.

## 2 - Aux Battery Charging Relay (48V, 5-Pin)
- **Relay Type Used**: RB6
- **Purpose**: Manages charging of the 12V Aux battery from the 48V system.
- **Operation**: Activates only when the vehicle is connected to a charger.
- **Connections**:
  - Pin 30: 12V Supply from DC Convertor.
  - Pin 87: Output to Aux Battery (via 7.5A fuse).
  - Pin 86: 48V input from terminal box Via Fuse Box.
  - Pin 85: Ground from Charging Cutoff Connector Pin 2.

## 3 - Regen Relay (12V, 5-Pin)
- **Relay Type Used**: RB3
- **Purpose**: During Regen Activation Brake Light should glow.
- **Operation**: Activates when Regen is activated during vehicle running.
- **Connections**:
  - Pin 30: 12V Output to Brake Light Via 48V12V Connector.
  - Pin 87: 12V Input from Ignition Switch Pin no 2.
  - Pin 86: 12V Input from Ignition Switch Pin no 2.
  - Pin 85: Ground Signal from VCU From Pin no 4.
- **Note**: This relay used only in Matel.

## 4 - 48V Battery Ignition Relay (R48VBatt) (12V, 4-Pin)
- **Relay Type Used**: RB3
- **Purpose**: Engages the Main 48V battery.
- **Operation**: When energized by the ignition switch, shorts the battery ignition wire to turn the main battery ON.
- **Connections**:
  - Pin 30 & 87: Connected to Batt 6W terminals pin no 1 & 3.
  - Pin 86: 12V from Ignition Switch Pin 3.
  - Pin 85: Ground from Cluster Delay Pin 1 (If SLOKI Cluster used).

## 5 - Cluster Relay (12V, 5-Pin) (AS PER AIS 156)
- **Relay Type Used**: RB3
- **Purpose**: Controls power to the instrument cluster.
- **Connections**:
  - 1- Pin 30: -Output to Cluster Meter.
  - 2- Pin 87a: -Input from DC output Relay during charging From Pin no 87a.
  - 3- Pin 86: -Input from Ignition Switch from Pin no 3.
  - 4- Pin 85: -Common Ground.
  - 5- Pin 87: -12V Supply from Ignition Switch Pin No 3.
- **Working Operation**:
  - 1- Ignition On: -12V Supply comes from Ignition Switch Pin no 3 to Relay Pin no 86 and 87. Relay Pin no 85 has common ground. So, when we turn on the Key Relay goes Energized and 12V Supply goes to Cluster from Relay Pin no 30.
  - 2- Charging: -During the Charging time Ignition key is off so 12V Supply comes from DC Output Relay pin no 87a to Cluster relay pin no 87a. In this condition Ignition Switch is off so this 12V Supply directly goes to Cluster from Cluster Relay Pin no 30.

## 6 - MCU Relay
- **Relay Type Used**: RB3
- **Purpose**: Controls the wake-up MCU.
- **Connections**:
  - Pin 87a: 12V output to MCU wake-up (Orange).
  - Pin 30 & 86: Looped; 12V input from Ignition Switch Pin no 2.
  - Pin 85: Ground from Charging Cutoff or Telematics (Immobilizer).
- **Operation**:
  - 1- During Drive/Ignition ON: Relay is off because relay coil ground missing, and supply goes to MCU.
  - 2- During Charging or Immobilize (IOT): Relay coil gets ground, so Relay gets on (If someone turns on the Key during Charging) and cuts the wake-up supply to MCU. For Matel, relay doesn't have 12V supply in coil so relay doesn't get on during charging, only on Immobilize command through IOT.
  - 3- During Charging: If someone turns on the key, that condition MCU Relay gets 12V also gets Ground through Charging Cut off. So, relay goes on and MCU Wake up goes to Bypass.
`;

const viryaGen2RelayGuideContent = `
# Relay Used in Virya Gen 2

## 1- DC Output Relay (RDC_Output) (12V, 5-Pin)
- **Relay Type Used**: RB6
- **Purpose**: Distributes 12V power from the DC-DC converter to components and the Aux battery.
- **Connections**:
  - 1- Pin 30: 12V Input from DC Convertor (via F12V fuse)
  - 2- Pin 87: 12V Output to 12V components & Aux Battery charging
  - 3- Pin 87a: 12V Output to Cluster Relay for charging time.
  - 4- Pin 86: 12V from Ignition Switch Pin no 2.
  - 5- Pin 85: For Virya Gen 2, This pin Connected to Common Ground (Virya Cluster).
- **Operation**:
  - 1- During Vehicle On: Relay gets on and gives 12V supply to 12V components and charges 12V Aux Battery.
  - 2- During Vehicle Charging: Relay can't get on because 12V supply for coil is missing, so DC output supply goes to Cluster from Pin 87a of Relay. Also, during charging 12V components are not getting on.

## 2 - Aux Battery Charging Relay (48V, 5-Pin)
- **Relay Type Used**: RB6
- **Purpose**: Manages charging of the 12V Aux battery from the 48V system.
- **Operation**: Activates only when the vehicle is connected to a charger.
- **Connections**:
  - Pin 30: 12V Supply from DC Convertor.
  - Pin 87: Output to Aux Battery (via 7.5A fuse).
  - Pin 86: 48V input from terminal box Via Fuse Box.
  - Pin 85: Ground from Charging Cutoff Connector Pin 2.

## 3 - 48V Battery Ignition Relay (R48VBatt) (12V, 4-Pin)
- **Relay Type Used**: RB3
- **Purpose**: Engages the Main 48V battery.
- **Operation**: When energized by the ignition switch, shorts the battery ignition wire to turn the main battery ON.
- **Connections**:
  - Pin 30 & 87: Connected to Batt 6W terminals pin no 1 & 3.
  - Pin 86: 12V from Ignition Switch Pin 3.
  - Pin 85: Ground from Cluster Delay Pin 1 (If SLOKI Cluster used). Connected For Common ground (If Virya Cluster used).

## 4 - Reverse Relay (12V, 4-Pin)
- **Relay Type Used**: RB3
- **Purpose**: Activates the reverse tail lamp.
- **Operation**: Ground signal from the BFNR (Mode) switch energizes the coil and Supply goes to reverse tail light.
- **Connections**:
  - Pin 30: 12V Supply from DC output Relay Pin no 30
  - Pin 87: Output to Reverse Lamp (White) by 48v12V Connector
  - Pin 86: 12V Supply from Ignition Switch Pin no 2
  - Pin 85: Ground from BFNR Switch during Reverse Mode through Diode.

## 5 - Cluster Relay (12V, 5-Pin) (AS PER AIS 156)
- **Relay Type Used**: RB3
- **Purpose**: Controls power to the instrument cluster.
- **Connections**:
  - 1- Pin 30: - Output to Cluster Meter.
  - 2- Pin 87a: - Input from DC output Relay during charging From Pin no 87a.
  - 3- Pin 86: - Input from Ignition Switch Form Pin no 3.
  - 4- Pin 85: - Common Ground.
  - 5- Pin 87: - 12V Supply from Ignition Switch Pin No 3.
- **Working Operation**:
  - 1- Ignition On: - 12V Supply comes from Ignition Switch Pin no 3 to Relay Pin no 86 and 87. Relay Pin no 85 has common ground. So, when we turn on the Key Relay goes Energized and 12V Supply goes to Cluster from Relay Pin no 30.
  - 2- Charging: - During the Charging time Ignition key is off so 12V Supply comes from DC Output Relay pin no 87a to Cluster relay pin no 87a. In this condition Ignition Switch is off so this 12V Supply directly goes to Cluster from Cluster Relay Pin no 30.

## 6 - MCU Relay
- **Relay Type Used**: RB6
- **Purpose**: Controls the wake-up MCU.
- **Connections**:
  - Pin 30: 48V output to MCU wake-up (Orange)
  - Pin 87a & 86: Looped; 48V input from FDCI fuse (Gray)
  - Pin 85: Ground from Charging Cutoff or Telematics (Immobilizer)
- **Operation**:
  - 1- During Drive/Ignition ON: Relay is off because relay coil ground missing, and supply goes to MCU.
  - 2- During Charging or Immobilize (IOT): Relay coil gets ground, so Relay gets on and cuts the wake-up supply to MCU. Relay only getting on When Charger is Connected or When Someone Gives Immobilize command through IOT and Vehicle is on.
`;

const osmOperationalProceduresContent = `
# Operational Procedures & Notes (General)

## Power Flow System
1. **Aux Battery to FAB (Fuse Box Input).**
2. **FAB (Fuse Box Output) to Emergency Switch input.**
3. **Emergency Switch Output to Ignition Switch Input.**
4. **48 V From Terminal Box to MCU Relay at Pin no 30.**
5. **48V From Terminal Box to FDCI Diode then S48V then MCU relay at pin no 30.**

## Vehicle Start Sequence
1. **Key Turn (Step 1):** Main 48V Battery turns ON. Cluster ON.
2. **Key Turn (Step 2):** DC-output Relay On, Reverse Relay got 12V.
- **Important:** When We turn on the Vehicle, the Battery turns on first. After that, the terminal box has a 48V Supply. That 48V goes to the MCU Relay, then 48V goes to the MCU at pin no 1 & 2, and the MCU gets on.
`;

const matelMcuOperationalNotesContent = `
# Matel MCU Operational Procedures & Troubleshooting

## Power Flow System
1. **Aux Battery to FAB (Fuse Box Input).**
2. **FAB (Fuse Box Output) to Emergency Switch input.**
3. **Emergency Switch Output to Ignition Switch Input.**
4. **Ignition Switch Output pin no 2 to MCU Relay at Pin no 30.**

## Vehicle Start Sequence
1. **Key Turn (Step 1):** Main 48V Battery turns ON. Cluster ON.
2. **Key Turn (Step 2):** MCU turns ON. DC-output Relay On, Regen Relay got 12V, BFNR Switch got 12V.
- **Important:** This sequence is critical for saving the odometer reading correctly. Main Battery Needs to Turn on at 1st Step of Ignition Switch and MCU Turn on in Second Step. When we turn on the key, first the Main Battery gets on, then the MCU in the 2nd Step. When turning off, the MCU must turn off before the Main Battery. If this sequence is not working, the odometer reading will not save. Check Main Battery and MCU Relay on Sequence.

## MCU Working Condition
1. **MCU got 12V From MCU Relay.**
2. **BFGNR Switch got 12V From Ignition Switch.** After that, put the Vehicle in any mode (Forward, Boost, Gradient or Reverse).
3. **Once the Mode is visible in the Cluster**, give the throttle gradually. The Vehicle should move.
4. If Vehicle Should Not Moving, Check the Previous Point.

## Issue: Vehicle Not Moving
1. **Check MCU Ignition (On/Off).**
   - If MCU is off, Then Check if the MCU Relay is getting power.
   - Check **12 V at pin no 30**. If got, then check **pin no 87a**.
   - If pin no 30 doesn't have any supply, check the previous connection.
   - **A. But if pin no 30 has supply but pin no 87a doesn't have any supply:**
     - a) Then check the relay coil; use multimeter. There should be supply between **pin no 86 & 85**.
     - b) If supply is there, check if the charger is connected or if someone gave an immobilize command.
     - c) If the charger is connected, remove it and check that no supply is visible in the relay at pin no 85 and 86.
     - d) If an immobilize command was given, tell your team member to remove it.
   - **B. If pin no 87a has supply, then Check FMCU (MCU Fuse Box):**
     - Check if both points of the Fuse box have supply.
     - I. If the Fuse is Blown, replace it.
     - II. If FMCU Both Points have Supply but MCU is not getting on, check the **Continuity between Fuse Box output to MCU at pin no 1 & 10**.
     - III. If there is no continuity, replace the wiring harness or add a separate wire to check MCU working.

2. **Check BFGNR Switch got 12V.**
   - a. BFGNR Switch gets supply from **Ignition Switch pin no 2**. Check the supply at pin no 2 (Ignition Switch).
   - b. If Ignition Switch Pin no 2 has 12V but BFGNR switch doesn't have 12V, then check the continuity between both points.
   - c. If both points have no continuity, replace the wiring harness or use a jumper wire from **Ignition Switch pin no 2 to BFGNR Switch Input wire at pin no 1**.

3. **Check Cluster Error Codes.** Look for any visible error code in the cluster and resolve according to technical guidelines.

## Basic Information Relates to Matel MCU
1. **MCU KSI:** 12V.
2. **BFGNR Working:** 12V.
3. **Throttle, Brake Pot & Encoder Working:** 5V.
4. **Data Transmission:** 2 CAN Wires.
5. **Modes:** Total 4 (Forward, Boost, Gradient and Reverse).
6. **Voltage Range:** Able to Work From 42V to 60V.
7. **Throttle Operating Voltage Range:** 0.8V to 4V.
8. **Brake Pot Voltage:** Set between 0.6V – 0.8V.
9. **Brake Pot Range:** Works From 0.6 V to 4V.
`;

const IssueorDiagnosticDocumentContent = `
# Error - Diagnostic Document (Error List)

This document provides a comprehensive list of Error codes, their descriptions, definitions, occurrence conditions, and troubleshooting steps.

## Error-01: Battery Fault
- **Definition:** Battery common fault.
- **Occurrence Condition:** 1. It comes along with a another Error
- **Troubleshooting:** 1.Check another Error 2. If there is not any another Error. Update to supplier.

## Error-02: Battery Over Temperature
- **Definition:** Battery temperature is above normal safe range.
- **Occurrence Condition:** 1. Due to high Discharging current rate. 2. Due to Battery Internal loose connection. 3. MCU Pushing High Regen Current. 4. Battery Temperature sensor not working.
- **Troubleshooting:** 1. Check Discharging current rate. If Found as per required that's ok. 2. Replace the Battery Pack. 3. Check and update to MCU Team. 4. Update to supplier.

## Error-03: Battery Severe Over Temperature
- **Definition:** Battery temperature has crossed the critical safe limit, risk of damage or fire.
- **Occurrence Condition:** 1. Due to high Discharging current rate. 2. Due to Battery Internal loose connection. 3. MCU Pushing High Regen Current. 4. Battery Temperature sensor not working.
- **Troubleshooting:** Check Ambient Temp and Compare with Battery temperature. 1. Check Discharging current rate. If Found as per required that's ok. 2. Replace the Battery Pack. 3. Check and update to MCU Team. 4. Update to supplier.

## Error-04: Battery Under Temperature
- **Definition:** Battery is below the safe operating range.
- **Occurrence Condition:** 1. Battery temp sensor not Working. 2. Ambient temp is too low to operate Battery.
- **Troubleshooting:** Check Ambient Temp and Compare with Battery temperature. 1. If there is more Temp Difference. Update to Supplier, may be Battery Temp Sensor not Working. 2. If Both are same than hold some time to increase Battery temp.

## Error-05: Battery Severe Under Temperature
- **Definition:** Battery temperature has fallen well below the critical safe limit.
- **Occurrence Condition:** 1. Higher regen Current. 2. Unauthorized Charger using.
- **Troubleshooting:** Check Ambient Temp and Compare with Battery temperature. 1. Check Regen Current Value. 2. Use Authorized Charger.

## Error-06: Battery Severe Over Voltage
- **Definition:** Battery voltage has crossed the critical maximum limit.
- **Occurrence Condition:** 1. Higher regen Current. 2. Battery Over Charge. 3. Charging Full Indication.
- **Troubleshooting:** 1. Check Regen Current Value. 2. After Charging Hold the Vehicle For Some Time. It will be normal after Some Time.

## Error-07: Battery Over Voltage
- **Definition:** Battery voltage is above normal safe range.
- **Occurrence Condition:** 1.Higher regen Current. 2. Battery Over Charge. 3. Charging Full Indication.
- **Troubleshooting:** 1. Check Regen Current Value. 2. After Charging Hold the Vehicle For Some Time. It will be normal after Some Time.

## Error-08: Battery Under Voltage
- **Definition:** Battery voltage has dropped below safe range.
- **Occurrence Condition:** 1. Battery is in Idle Condition from a long time. 2. Less Battery Remaining.
- **Troubleshooting:** 1. Charge the Battery Pack.

## Error-09: Battery Severe Under Voltage
- **Definition:** Battery voltage is far below the critical limit.
- **Occurrence Condition:** 1. Battery is in Idle Condition from a long time.
- **Troubleshooting:** 1.Try to Charge the Battery Pack. If not Charging Update to supplier or Charge using slow Charger.

## Error-10: MOSFET Failure
- **Definition:** Power MOSFET stops working due to short circuit, open circuit, or thermal damage.
- **Occurrence Condition:** 1. Current Spike during Drive.
- **Troubleshooting:** 1. Turn off Vehicle and Update to Battery Supplier.

## Error-11: Pre-charge Failure
- **Definition:** Battery Internal Failure
- **Occurrence Condition:** 1. Internal Misshaping in Battery.
- **Troubleshooting:** 1. Remove all the connection. 2. Turn on Battery Separately. If still getting Error, Update to Supplier.

## Error-20: MCU Communication
- **Definition:** NO Communication with MCU
- **Occurrence Condition:** 1. Battery not getting MCU Can. 2. FW Related Issue.
- **Troubleshooting:** 1. Check MCU Can is Coming in Common Can Line. 2. Check at Battery Can Point. If both Points have MCU Can but still Error comes than update to Supplier.

## Error-27: Battery Thermal Runaway Alert
- **Definition:** As per the Battery Condition
- **Occurrence Condition:** 1-Battery is at his higher temp Range. 2- Temp Sensor Issue.
- **Troubleshooting:** 1. Stop the Vehicle for Some time and Check Battery Voltage is going to down or not. 2. If temp is still same, update to supplier.

## Error-28: Battery Thermal Runaway
- **Definition:** As per the Battery Condition
- **Occurrence Condition:** 1- Battery higher Internal Temp. 2. Temp Sensor Not working.
- **Troubleshooting:** 1. Turn off Vehicle and Check Battery Temp. If temp is Below 60 Degree and you still get the Error, Update to Supplier. 2- Update to Supplier.

## Error-29: Peak Current Warning
- **Definition:** If current continuous demand more then the limit
- **Occurrence Condition:** 1. MCU Using Continuous high Current. 2. Wheel Jammed.
- **Troubleshooting:** 1. Check Continuous Drive Current Value. 2. Check Wheels are loose or not. Both Condition Matters Drive Current should be less than Battery Drive current limit also wheel should be Free.

## Error-31: Controller Overcurrent
- **Definition:** Motor current exceeded controller rated maximum
- **Occurrence Condition:** 1. Controller heatsink may be dirty / mudded. 2. Regen current not accepted by the battery. 3. Vehicle is overloaded or Wheel Jammed. 4. UVW terminal Loose Connection. 5. Motor parameters mistuned.
- **Troubleshooting:** 1. Allow controller to warm up. 2. Check Motor U, V W cable connections. 3. Auto characterize the Motor. 4. Check for freeness of wheels. 5. Check motor shaft for rotation. 6. Immediately update to supplier.

## Error-32: Current Sensor Fault
- **Definition:** Current sensor auto-zero value outside allowed range
- **Occurrence Condition:** 1. External Short for U, V and W Cable.
- **Troubleshooting:** 1. If short found- Remove Short. 2. No Short found - Replace the controller.

## Error-33: Pre charge Failed
- **Definition:** Capacitor voltage did not rise above 5V at power up
- **Occurrence Condition:** 1. Additional Load connected in 48V Line. 2. Internal failure in controller.
- **Troubleshooting:** 1. Check battery connection for reverse polarity. 2. Replace the controller and check.

## Error-35: Controller Severe Over temperature
- **Definition:** Controller heatsink has reached critical high temperature.
- **Occurrence Condition:** 1. Controller heatsink dirty / mudded. 2. Not rigidly mounted. 3. Vehicle overloaded.
- **Troubleshooting:** 1. Clean Heat Sink. 2. Check mounting. 3. Remove Load and cool down.

## Error-36: Severe B+ Undervoltage
- **Definition:** MCU Voltage is far below the critical limit.
- **Occurrence Condition:** 1. Battery voltage has dropped below critical level.
- **Troubleshooting:** 1. Charge battery or check DC link voltage.

## Error-41: B+ Undervoltage Cutback
- **Definition:** Performance reduction due to low voltage.
- **Occurrence Condition:** 1. Vehicle reached low SOC. 2. Battery KSI going OFF.
- **Troubleshooting:** 1. Check Battery Pack voltages and CAN signals.

## Error-42: B+ Overvoltage Cutback
- **Definition:** Battery voltage greater than Over Voltage limit.
- **Occurrence Condition:** 1. Regen braking currents elevated voltage. 2. Misadjusted parameters. 3. Resistance high.
- **Troubleshooting:** 1. Check encoder connector voltage (12V). 2. Update to supplier.

## Error-43: 5V Supply Failure
- **Definition:** 5V Supply for Analog Signal Missing
- **Occurrence Condition:** 1. Short in Throttle, POT or Encoder Connection.
- **Troubleshooting:** 1. Check voltage between Pin 1 & 5 of Encoder Connector. 2. Check for short in connections.

## Error-44: Motor Temp Hot Cutback
- **Definition:** Motor in thermal cutback
- **Occurrence Condition:** 1. Encoder wire damaged. 2. Motor temp resistor failure. 3. Vehicle overloaded.
- **Troubleshooting:** 1. Check wiring. 2. Check voltage between Pin 2 & 5 of Encoder Connector. 3. Cool down motor.

## Error-47: Sin/Cos Sensor Fault
- **Definition:** Sin/Cos Values out of range
- **Occurrence Condition:** 1. Encoder wires damaged. 2. Wheels Jammed.
- **Troubleshooting:** 1. Check wiring and configuration. 2. Check wheel freeness.

## Error-48: Motor Phase Open
- **Definition:** Motor controller unable to maintain current control.
- **Occurrence Condition:** 1. Encoder angle misalignment. 2. UVW loose connections.
- **Troubleshooting:** 1. Check motor cable and encoder wiring. 2. Motor characterization.

## Error-51: Throttle wiper High
- **Definition:** Throttle signal voltage high.
- **Occurrence Condition:** 1. Throttle Wires disconnected / shorted.
- **Troubleshooting:** 1. Check wiring and configuration.

## Error-53: EEPROM Failure
- **Definition:** Bad NVM Data.
- **Occurrence Condition:** 1. EEPROM data corrupted.
- **Troubleshooting:** 1. Revert firmware or contact Virya support.

## Error-57: Encoder LOS
- **Definition:** Encoder supply is disconnected.
- **Occurrence Condition:** 1. Input supply disconnected or wire cut.
- **Troubleshooting:** 1. Check encoder wiring and shielding.

## Error-58: Brake POT Engage
- **Definition:** Brake applied during drive.
- **Occurrence Condition:** 1. Throttle active while brake pressed.
- **Troubleshooting:** 1. Ensure Brake Pedal is released during throttle.

## Error-60: High Pedal Disable
- **Definition:** Any drive switch or throttle active at power ON.
- **Occurrence Condition:** 1. Vehicle Power ON with active pedal.
- **Troubleshooting:** 1. Put switch to N position. 2. Release Throttle before turning ON.
`;

const pcanToolContent = `
# PCAN Tool Starting Process Guide

This guide explains the step-by-step process for setting up and using the PCAN Tool.

## Step 1: Hardware Setup
- Connect the CAN interface hardware (USB-to-CAN adapter) to your PC and the vehicle (CAN_H and CAN_L).

## Step 2: Launch the CAN Tool Software
- Open PCAN View. Select "PCAN-USB FD" from the list.

## Step 3: Configure Communication Settings
- Set the baud rate to 500 kbit/s. Choose the correct protocol.

## Step 4: Start Monitoring
- Monitor live CAN messages. Columns: CAN-ID, Type, Length, Data, Cycle Time, Count.

## Step 5: Enable Logging
- Menu: Trace -> Start Message Trace.

## Step 6: Stop Logging
- Click "Stop Trace". The file is saved as a *.trc file.
`;

const viryaGen2PinoutContent = `
# Virya Gen 2: E-Box Assembly Pin Configurations

- **Connector Make:** Amp seal, TE Connectivity (770680-1)

| Pin | Description | Details |
| --- | --- | --- |
| 1 | Controller Main Supply | 48V |
| 2 | Interlock Supply | 48V |
| 3, 4 | CAN Controller | Flashing & Diagnosis |
| 5 | FORWARD Switch | 48V B- |
| 6 | BOOST Switch | 48V B- |
| 7 | REVERSE Switch | 48V B- |
| 8 | Throttle/Brake Supply | 5V |
| 9 | Throttle Wiper | To Controller |
| 10 | Brake Wiper | To Controller |
| 11, 12 | Vehicle CAN | CAN High/Low |
| 13 | Encoder Power | 5V |
| 14 | Motor Thermistor | Input |
| 15, 16 | Encoder Sine/Cosine | Input |
| 17 | Encoder GND | 5V GND |
`;

const lcdErrorCodeListContent = `
# LCD Error Code Quick Reference

| Error | Fault Description | LCD |
|---|---|---|
| 1 | Battery Fault | Err-1 |
| 2 | Battery Over Temp | Err-2 |
| 8 | Battery Under Voltage | Err-8 |
| 20 | MCU Communication | Err-20 |
| 31 | Controller Overcurrent | Err-31 |
| 43 | 5V Supply Failure | Err-43 |
| 48 | Motor Phase Open | Err-48 |
| 60 | High Pedal Disable | Err-60 |
`;

const matelMcuDiodeTestContent = `
# Matel MCU Diode Test Procedure Using Multimeter

1. **Prepare the Multimeter**
   - Use a digital multimeter that includes the Diode Test feature.
   - Turn the selector knob to the Diode Mode (🔺|◄ symbol).

2. **Check Probe Connections**
   - Ensure the red probe is connected to the positive (+) terminal of the multimeter.
   - Ensure the black probe is connected to the COM (ground) terminal.
   - Verify that the multimeter display responds correctly in diode mode.

3. **Isolate the MCU**
   - Disconnect all external connections from the MCU (Microcontroller Unit) before testing.
   - This avoids false readings or short circuits.

4. **First Test Sequence**
   - Connect the red probe (positive) of the multimeter to the MCU’s 48V negative terminal.
   - Then, connect the black probe (negative) to each MCU phase output one by one:
     - Phase R
     - Phase Y
     - Phase B

5. **Second Test Sequence**
   - Connect the black probe (negative) of the multimeter to the MCU’s 48V positive terminal.
   - Then, connect the red probe (positive) to each MCU phase output one by one:
     - Phase R
     - Phase Y
     - Phase B

6. **Check the Readings**
   - A diode reading around 0.4 V indicates that the MCU diode circuit is OK.
   - If any phase shows 0.0 V (short), OL (open), or a reading outside this range, that portion of the diode is damaged.
   - In case of abnormal readings, contact the controller supplier for further assistance or repair.
`;

export const matelEvKnowledgeBase: StoredFile[] = [
  {
    name: '01-Troubleshooting-Guide.md',
    content: matelEvContent,
    size: matelEvContent.length,
    lastModified: Date.now(),
  },
  {
    name: '02-Battery-Uses.md',
    content: batteryUsesContent,
    size: batteryUsesContent.length,
    lastModified: Date.now() - 1,
  },
  {
    name: '03-Full-Error-List.md',
    content: IssueorDiagnosticDocumentContent,
    size: IssueorDiagnosticDocumentContent.length,
    lastModified: Date.now() - 2,
  },
  {
    name: '04-PCAN-Tool-Guide.md',
    content: pcanToolContent,
    size: pcanToolContent.length,
    lastModified: Date.now() - 3,
  },
  {
    name: '05-Virya-Gen2-Pinout.md',
    content: viryaGen2PinoutContent,
    size: viryaGen2PinoutContent.length,
    lastModified: Date.now() - 4,
  },
  {
    name: '06-LCD-Reference.md',
    content: lcdErrorCodeListContent,
    size: lcdErrorCodeListContent.length,
    lastModified: Date.now() - 5,
  },
  {
    name: '07-OSM-Operational-Procedures.md',
    content: osmOperationalProceduresContent,
    size: osmOperationalProceduresContent.length,
    lastModified: Date.now() - 6,
  },
  {
    name: '08-Matel-Relay-Guide.md',
    content: matelRelayGuideContent,
    size: matelRelayGuideContent.length,
    lastModified: Date.now() - 7,
  },
  {
    name: '09-Matel-MCU-Operational-Notes.md',
    content: matelMcuOperationalNotesContent,
    size: matelMcuOperationalNotesContent.length,
    lastModified: Date.now() - 8,
  },
  {
    name: '10-Virya-Gen2-Relay-Guide.md',
    content: viryaGen2RelayGuideContent,
    size: viryaGen2RelayGuideContent.length,
    lastModified: Date.now() - 9,
  },
  {
    name: '11-Matel-MCU-Diode-Test.md',
    content: matelMcuDiodeTestContent,
    size: matelMcuDiodeTestContent.length,
    lastModified: Date.now() - 10,
  }
];
