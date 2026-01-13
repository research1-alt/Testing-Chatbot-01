
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
- Telematics, Cluster, Relays, and Fuses, ignition Switch,Emergency Switch
-

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
- Puspose:Uses for Switching Power Supply in Circuit.
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
- Working Oeration:
   1-Ignition On:- 12V Supply Comes from Ignition Switch Pin no 3 to Relay Pin no 86 and 87.Relay Pin no 85 have Common grond. So When we turn on the Key Relay goes Energized and 12V Supplys goes to Cluster From Relay Pin no 30.
   2 Charging:- During the Charging time Ignition key is off so 12V Supply comes form DC Output Relay pin no 87a to Cluster relay pin no 87a. In this Condition Ignition Switch is off so this 12V Supply Directly goes to Cluster From Cluster Relay Pin no 30.
  Note:- This Relay Circuit Belong to only Virya Gen2 and Matel.

### Reverse Relay (12V, 4-Pin)
- **Purpose:** Activates the reverse tail lamp.
- **Operation:** Ground signal from the BFNR (Mode) switch energizes the coil and Supply goes to reverse tail light.
- **Connections:**
   1- Virya Gen1:-
   - **Pin 30:** 12V Supply From DC Convertor
   - **Pin 87:** Output to Reverse Lamp (White) by 48v12V Connctor
   - **Pin 86:** 12V BFNR Switch During Reverse Mode(Red/Green)
   - **Pin 85:** Connected to Common Ground
   2- Virya Gen2:-
   - **Pin 30:** 12V Supply From DC output Relay Pin no 30
   - **Pin 87:** Output to Reverse Lamp (White) by 48v12V Connctor
   - **Pin 86:** 12V Supply From Ignition Switch Pin no 3
   - **Pin 85:** Ground From BFNR Switch during Reverse Mode through Dioade.
      Note:- Ground Comes in Relay From BFNR Switch 1 Dioade is available in that route.
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
    2- During Charging or Immobalize (IOT) relay coil gets ground, so Relay gets on and Cutt the wake up supply to MCU (Only for Virya Gen2). For Matel relay don't have 12V Supply in coil so relay didn't getting on During Charging, Relay only getting on in time of Immobalize command through IOT.


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
     2- During Vehicle Charging:- Relay Cann't gettin on Because 12v Supply for coil missing so DC Output supply goes to Cluster from Pin no 87a of Relay.Also during charging 12V Component is not getting on.

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
2. **Key Turn (Step 2):** MCU turns ON. DC-output Relay On,Regen Relay got 12V, BFNR Switch got 12V (only in Matel)
- **Important:** This sequence is critical for saving the odometer reading correctly. Main Battery Needs to Turn on at 1st Step of Ignition Switch and MCU Turn on in Second Step.So When we turn on the key First Main Battery getting on then MCU getting On in 2nd Step. But When we turn off the Key First MCU Gets off than Main Battery. If This function Works Properly, then Odometer reading will be saved.if Not then odometer reading not save.
      If This sequence is not working properly Please check Main Battery and MCU Relay on Sequense.
### CAN Bus Notes
- 120 Ohm termination resistors are located in the Cluster and MCU.
- The battery and charger do not have termination.
- With all components connected, the total bus resistance should measure ~60 Ohms.
### Some Basic Issues and There solution
  1- Vehicle is taking Throttle Response:- 
   1- Check the Error Code in Cluster.If any clear that Error.
   2- If there is not any Error:- Check Drive mode Comes in cluster or Not. 
   If Comes :- Then Check Throttle Input and Output Signal to MCU. Input have 5V and output have 0.8-1.1V Supply in Idle Condition.
   If Throttle Input have Supply but output Don't have any Supply then Replace the Throttle and Check.
   If Throttle Input and  Output Both Have Supply, then check Throttle output Supply in MCU side at given pin.IF MCU Got Throttle output signal but not responding. Update the supplier or replace the MCU and Check. Issue will be resolve.
   If Not Comes:- Then Check Input supply it should be 12V For Matel and Ground For Virya Gen 2 and 12V For Virya Gen 1. If Comes then Put any Drive Mode and Check given pin at MCU Side. If got supply in MCU Side so there will be any issue in MCU, update to Supplier or Change MCU than test.It Should be work.
  2- Vehicle Zerking:- 
   1- During Drive:- Check all the Basic Things, Brake pot Output signal should be 0.6-0.8V. Throttle Signal not Verying During Drive. Also Please check the Wheel freensee it should be Free.
   2- During Regen:- Check the regen Current Limit and Regen current Provided by MCU to Battery. MCU Needs to follow Regen Current limit given by Battery if not then update to supplier.
   Note:- Do not Try to Drive Virya Gen2 Vehicle in Jack up Condition, Vehicle will be off after giving throttle (AS Per VIrya Team) also Do not Drive Vehicle More then 40KM at a single time(AS Per Virya Team). 
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
### Matel MCU Health Check.
  Here’s your procedure rewritten in a **clear, professional, and well-formatted version** — suitable for reports, manuals, or troubleshooting guides:

---

### **MCU Diode Test Procedure Using Multimeter**

1. **Prepare the Multimeter**

   * Use a **digital multimeter** that includes the **Diode Test** feature.
   * Turn the **selector knob** to the **Diode Mode** (🔺|◄ symbol).

2. **Check Probe Connections**

   * Ensure the **red probe** is connected to the **positive (+)** terminal of the multimeter.
   * Ensure the **black probe** is connected to the **COM (ground)** terminal.
   * Verify that the multimeter display responds correctly in diode mode.

3. **Isolate the MCU**

   * **Disconnect all external connections** from the MCU (Microcontroller Unit) before testing.
   * This avoids false readings or short circuits.

4. **First Test Sequence**

   * Connect the **red probe (positive)** of the multimeter to the **MCU’s 48V negative terminal**.
   * Then, connect the **black probe (negative)** to each **MCU phase output** one by one:

     * Phase **R**
     * Phase **Y**
     * Phase **B**

5. **Second Test Sequence**

   * Connect the **black probe (negative)** of the multimeter to the **MCU’s 48V positive terminal**.
   * Then, connect the **red probe (positive)** to each **MCU phase output** one by one:

     * Phase **R**
     * Phase **Y**
     * Phase **B**

6. **Check the Readings**

   * A **diode reading around 0.4 V indicates that the MCU diode circuit is **OK**.
   * If any phase shows **0.0 V (short)**, **OL (open)**, or a **reading outside this range**, that portion of the diode is **damaged**.
   * In case of abnormal readings, **contact the controller supplier** for further assistance or repair.



`;

const IssueorDiagnosticDocumentContent = `
# Error - Diagnostic Document

This document provides a comprehensive list of Error codes, their descriptions, definitions, occurrence conditions, and troubleshooting steps.

## Error-01: Battery Fault
- **Definition:** Battery common fault.
- **Occurrence Condition:** 
  1. It comes along with a another Error
- **Troubleshooting:**
  1.Check another Error
  2. If there is not any another Error. Update to supplier.

## Error-02: Battery Over Temperature
- **Definition:** Battery temperature is above normal safe range.
- **Occurrence Condition:**
  1. Due to high Discharging current rate.
  2. Due to Battery Internal loose connection.
  3. MCU Pushing High Regen Current.
  4. Battery Temperature sensor not working.
- **Troubleshooting:**
  1. Check Dishcarging current rate.If Found as per required that's ok.
  2. Replace the Battery Pack.
  3. Check and update to MCU Team.
  4. Update to supplier.

## Error-03: Battery Severe Over Temperature
- **Definition:** Battery temperature has crossed the critical safe limit, risk of damage or fire.
- **Occurrence Condition:** 
 "1. Due to high Discharging current rate. 
  2. Due to Battery Internal loose connection.
  3. MCU Pushing High Regen Current.
  4. Battery Temperature sensor not working."

- **Troubleshooting:** 
  Check Ambient Temp and Compare with Battrey temperature.
   1. Check Dishcarging current rate.If Found as per required that's ok.
   2. Replace the Battery Pack.
   3. Check and update to MCU Team.
   4. Update to supplier."

## Error-04: Battery Under Temperature
- **Definition:** Battery is below the safe operating range.
- **Occurrence Condition:** 
  1. Battery temp sensor not Working.
  2. Ambient temp is too low to operate Battery.
- **Troubleshooting:** 
  Check Ambient Temp and Compare with Battrey temperature.
  1. If there is more Temp Differnece. Update to Supplier, may be Battery Temp Sensor not Working.
  2. If Both are same than hold some time to increase Battery temp.

## Error-05: Battery Severe Under Temperature
- **Definition:** Battery temperature has fallen well below the critical safe limit.
- **Occurrence Condition:** 
  1. Higher regen Current.
  2. Unauthorized Charger using.
- **Troubleshooting:** 
  Check Ambient Temp and Compare with Battrey temperature.
  1. Check Regen Current Value.
  2. Use Authorized Charger.

## Error-06: Battery Severe Over Voltage
- **Definition:** Battery voltage has crossed the critical maximum limit.
- **Occurrence Condition:**
  1. Higher regen Current.
  2. Battery Over Charge.
  3. Charging Full Indication.
- **Troubleshooting:**
  1. Check Regen Current Value.
  2. After Charging Hold the Vehicle For Some Time.It will be normal after Some Time.

## Error-07: Battery Over Voltage
- **Definition:** Battery voltage is above normal safe range.
- **Occurrence Condition:** 
  1.Higher regen Current.
  2. Battery Over Charge.
  3. Charging Full Indication."
 Less Battery Remaining.
- **Troubleshooting:** 
  1. Check Regen Current Value.
  2. After Charging Hold the Vehicle For Some Time.It will be normal after Some Time."

## Error-08: Battery Under Voltage
- **Definition:** Battery voltage has dropped below safe range.
- **Occurrence Condition:** 
  1. Battery is in Idle Condition from a long time.
  2. Less Battery Remaining.
- **Troubleshooting:** 
  1. Charge the Battery Pack.

## Error-09: Battery Severe Under Voltage
- **Definition:** Battery voltage is far below the critical limit.
- **Occurrence Condition:** 
  1. Battery is in Idle Condition from a long time.
- **Troubleshooting:** 
  1.Try to Charge the Battery Pack. 
  If not Charging Update to supplier or Charge using slow Charger."

## Error-10: MOSFET Failure
- **Definition:** Power MOSFET (used in BMS/inverter) stops working due to short circuit, open circuit, or thermal damage.
- **Occurrence Condition:** 
  1. Current Spike during Drive.
- **Troubleshooting:** NA
  1. Turn off Vehicle and Update to Battery Supplier.

## Error-11: Precharge Failure
- **Definition:** Battrey Internal Failure
- **Occurrence Condition:** 
  1. Internal Mishapping in Battery.
- **Troubleshooting:** 
  1. Remove all the connection. 
  2. Turn on Battery Separtely. If still getting Error, Update to Supplier."

## Error-12: Severe DockPos Temperature
- **Definition:** Bus Bar High Temp (+ve)
- **Occurrence Condition:** NA
- **Troubleshooting:** NA

## Error-13: Severe DockNeg Temperature
- **Definition:** Bus Bar High Temp (-ve)
- **Occurrence Condition:** NA
- **Troubleshooting:** NA

## Error-14: Over DockPos Temperature
- **Definition:** Bus Bar Cuttoff Over Temp +ve
- **Occurrence Condition:** NA  
- **Troubleshooting:** NA
  
## Error-15: Over DockNeg Temperature
- **Definition:** Bus Bar Cuttoff Over Temp -ve
- **Occurrence Condition:** NA
- **Troubleshooting:** NA

## Error-16: Less Battery During KeyOn
- **Definition:** If SOC <20%, When Ignition ON
- **Occurrence Condition:** 
  1. Battery SOC Less than 20% 
- **Troubleshooting:** 
  1. Charge the Battery Pack. If Battery is not Charging use another charger.May be Can Communication not stablished between Battery and Charger.

## Error-17: Less Battery During Drive
- **Definition:** If SOC <20%, While Drive
- **Occurrence Condition:** 
  1. Less Battery Voltage. 
- **Troubleshooting:** 
  1. Charge the Battery Pack.

## Error-18: Permanent DockPos Temp
- **Definition:** Recurring temp fault
- **Occurrence Condition:** NA
- **Troubleshooting:** NA

## Error-19: Permanent DockNeg Temp
- **Definition:** Recurring temp fault
- **Occurrence Condition:** NA
- **Troubleshooting:** NA

## Error-20: MCU Communication
- **Definition:** NO Communication with MCU - Consider Mode ID from Controller ID-1826FF81, at Starting Bit 56, Length 3, Intel,
- **Occurrence Condition:** 
  1. Battery not getting MCU Can.
  2. FW Related Issue."
- **Troubleshooting:**
  1. Check MCU Can is Coming in Common Can Line.
  2. Check at Battery Can Point. 
  If both Points have MCU Can but still Error comes than update to Supplier."

## Error-21: EV InSense Malfunction
- **Definition:** Reverse current detected
- **Occurrence Condition:** NA
- **Troubleshooting:**NA

## Error-22: EVout Sense Malfunction
- **Definition:** Output voltage/current not sensed
- **Occurrence Condition:** Na
  - **Troubleshooting:** NA
  
## Error-27: Battery Thermal Runaway Alert
- **Definition:** As per the Battery Condition
- **Occurrence Condition:** 
  1-Battery is at his higher temp Range. 
  2- Temp Sensor Issue."
- **Troubleshooting:**
  1. Stop the Vehicle for Some time and Check Battery Voltage is going to down or not.
  2. If temp is still same, update to supplier."

## Error-28: Battery Thermal Runaway
- **Definition:** As per the Battery Condition
- **Occurrence Condition:** 
  1- Battery higher Internal Temp.
  2. Temp Sensor Not working."
- **Troubleshooting:**
  1. Turn off Vehicle and Check Battery Temp.
  If temp is Below 60 Degree and you still get the Error, Update to Supplier.
  2- Update to Supplier.

## Error-29: Peak Current Warning
- **Definition:** If current contineous demand more then the limit
- **Occurrence Condition:** 
  1. MCU Using Continous high Current.
  2. Wheel Jamed.
- **Troubleshooting:**
  1. Check Continous Drive Current Value. 
  2. Check Wheels are loose or not.
  Both Condition Matters Drive Current should be less than Battery Drive current limit also wheel should be Free."

## Error-31: Controller Overcurrent
- **Definition:** Motor current exceeded controller rated maximum
- **Occurrence Condition:** 
  1. Controller heatsink may be dirty / mudded.
  2. Regen current not accepted by the battery.
  3. Vehicle is overloaded or Wheel Jammed.
  4. UVW terminal  Loose Connection / External Short of UVW cable / burnt / continuity
  5. Motor paramaters may be mistuned.
- **Troubleshooting:** 
  1. Allow controller to warm up to normal operating temperature.
  2. Check Motor U, V W cable connections
  2. Check for throttle release, then the Error comes-it is  battery Issue.
  3. Auto characterise the Motor
  4. Check for freeness of wheels ,If not rotating freely ,Make it free
  5. Check the motor shaft for its free rotation.-If Motor shaft is Jammed - Replace the Motor.
  6. If you check everything is clear but still getting the Error, Immerdiatly update to supplier.
  
## Error-32: Current Sensor Fault
- **Definition:** Current sensor auto-zero value outside of allowed range
- **Occurrence Condition:** 
  1. External Short for U, V and W Cable.
- **Troubleshooting:** 
  1. if the short found- Remove Short.
  2. No Short found - Replace the controller"

## Error-33: Precharge Failed
- **Definition:** Capacitor voltage did not rise above 5V at power up
- **Occurrence Condition:** 
  1. When there is any additional Load connected in 48V Line
  2. Internal failure in controller"
- **Troubleshooting:** 
  1. Check battery connection for reverse polarity, or check internal / external short circuit across the DC link
  2. if no issue found - Replace the controller and check"

## Error-34: Controller Severe Undertemp
- **Definition:** Controller heatsink (or junctions, capacitors, PCB) has reached critical low temperature, and the controller has shut down.
- **Occurrence Condition:** 
- **Troubleshooting:** 
  1. Allow controller to warm up to normal operating temperature

## Error-35: Controller Severe Overtemp
- **Definition:** Controller heatsink (or junctions, capacitors, PCB) has reached critical high temperature, and the controller has shut down.
- **Occurrence Condition:**
  1. Controller heatsink may be dirty / mudded
  2. Controller heat sink is rigidly not mounted to controller.
  3. Vehicle is overloaded"
- **Troubleshooting:** 
  1. check for Heat Sink is covered with dirt/Mud- Clean Heat Sink.
  2. check for Heat sink is properly mounted
  3. Remove the Additional Load and allow the controller to cool down"

## Error-36: Severe B+ Undervoltage
- **Definition:** MCU Voltage is far below the critical limit.
- **Occurrence Condition:**
  1. Battery voltage has dropped below critical level
- **Troubleshooting:** 
  1. Charge battery or check DC link voltage is within controller operating range

## Error-37: Severe KSI Undervoltage
- **Definition:** MCU KSIVoltage is below normal safe range.
- **Occurrence Condition:** 
  1. Battery voltage is less than rated minimum voltage for controller for longer than 1sec
- **Troubleshooting:**
  1. Charge battery or check DC link voltage is within controller operating range


## Error-38: Severe B+ Overvoltage
- **Definition:** MCU KSI Voltage is far Upper the critical limit.
- **Occurrence Condition:** 
  1. Capacitor voltage is greater than rated maximum voltage for controller for longer than 1sec.
- **Troubleshooting:** 
  1. Charge battery or check DC link voltage is within controller operating range. 

## Error-39: Severe KSI Overvoltage
- **Definition:** MCU KSIVoltage is above normal safe range.
- **Occurrence Condition:** 
  1. Battery voltage is greater than the configured Over Voltage limit for longer than the protection delay
- **Troubleshooting:**
  1. Charge battery or check DC link voltage is within controller operating range

## Error-40: Controller Overtemp Cutback
- **Definition:** Controller heatsink (or junctions, capacitors, PCB) has reached critical high temperature, and the controller has shut down.
- **Occurrence Condition:** 
  1. Controller heatsink may be dirty / mudded
  2. Controller heat sink is rigidly not mounted to controller.
  3. Vehicle is overloaded.
- **Troubleshooting:**
  1. check for Heat Sink is covered with dirt/Mud- Clean Heat Sink.
  2. check for Heat sink is properly mounted
  3. Remove the Additional Load and allow the controller to cool down"

## Error-41: B+ Undervoltage Cutback
- **Definition:** NA
- **Occurrence Condition:**
  1. During running, vehicle reached to low SOC.
  2. During Running, Battery KSI is going to OFF.
- **Troubleshooting:**
  1. Check the Battery Pack voltages. Also check the Battery KSI Signal and Battery Voltage Signal in CAN.

## Error-42: B+ Overvoltage Cutback
- **Definition:** Battery voltage is greater than the configured Over Voltage limit for longer than the protection delay
- **Occurrence Condition:** 
  1. Normal operation. Fault shows that regen braking currents elevated the battery voltage during regen braking. Controller is performance limited at this voltage.
  2. Battery parameters are misadjusted. 
  3. Battery resistance too high for given regen current. 
  4. Battery disconnected while regen braking
- **Troubleshooting:**
  1. check for the voltage between 2 and 5 in encoder connector and shall be 12V
  2. check for the temperature resistance between pin 2 and 5 of the encoder connector of the motor side as per PT1000.
  Note:- This is declared only when the Controller is running in regen.
  3. Check all the given occurrence condition. if It's still continue update to supplier immedately.

## Error-43: 5V Supply Failure
- **Definition:** 5V Supply for Analog Signal Missing
- **Occurrence Condition:** 
  1. 1- Short in Throttle, POT or Encoder Connection.
- **Troubleshooting:**
  1. Check the voltage between Pin 1 & 5 of  Encoder Connector
  2. Check for short in Brake POT or Throttle connection"

## Error-44: Motor Temp Hot Cutback
- **Definition:** Motor in thermal cutback
- **Occurrence Condition:** 
  1. Encoder connector wire damaged or cut
  2. Motor temperature resistor failure
  3. Vehicle overloded"
- **Troubleshooting:**
  1. check the encoder connector wiring.
  2. Check the voltage between Pin 2 & 5 of  Encoder Connector
  3. check for additional load and allow the motor to cool down"

## Error-45: Motor Temp Sensor Fault
- **Definition:** Motor Temperature input not available
- **Occurrence Condition:**
  1. Encoder connector wire damaged or cut
  2. Motor temperature resistor failure"
- **Troubleshooting:**
  1. check for the voltage between 2 and 5 in encoder connector and shall be 12V
  2. check for the temperature resistance between pin 2 and 5 of the encoder connector of the motor side as per PT1000."

## Error-46: Main Contactor Open/Short
- **Definition:** Line contactor not closed
- **Occurrence Condition:** 
  1. contactor coil connection issue
  2. Contactor rust"
- **Troubleshooting:** 
  1. check for coil connections
  2. check for rust
  3. check the coil voltage"

## Error-47: Sin/Cos Sensor Fault
- **Definition:** SinCos Values out of range with warning
- **Occurrence Condition:**
  1. Encoder wires damaged / Pin back out
  2. Wheels are Jammed"
 Line contactor open circuit - contactor did not close when the coil is energized
- **Troubleshooting:**
  1. Check for sincos sensor, wiring and encoder configuration
  2. Check for wheel freeness."

## Error-48: Motor Phase Open
- **Definition:** Motor controller unable to maintain control of motor currents
- **Occurrence Condition:** 
  1. Encoder angle misalignment
  2. UVW cable loose connections
  3. Encoder connector Pin back out"
- **Troubleshooting:** 
  1. Check for motor cable and encoder connector wiring.
  2. Motor characterisation to be done."

## Error-49: Main Contactor Welded
- **Definition:** Line contactor appears to be closed when the coil is NOT energized
- **Occurrence Condition:** 
  1. 1. Contactor tips got physically short.
- **Troubleshooting:**
  1. Check line contactor hasn't welded / closed and the wiring is correct

## Error-50: Main Contactor Did not Close
- **Definition:** Line contactor open circuit - contactor did not close when the coil is energized
- **Occurrence Condition:** 
  1. When the contactor tip  is oxidized or burnt
  2. Battery connection issue"
- **Troubleshooting:** 
  1. Check line contactor operation and wiring
  2. Check for Battery Power connections"

## Error-51: Throttle wiper High
- **Definition:** Throttle signal voltage high as per define upper limit.
- **Occurrence Condition:** 
  1. Throttle Wires are disconnected / shorted.
- **Troubleshooting:**
  1. Check for wiring and configuration is correct or n ot. If analogue input is not used the range should be set to the minimum and maximum limits 
 
## Error-52: Throttle wiper Low
- **Definition:** Throttle signal voltage low as per define low limit.
- **Occurrence Condition:** 
  1. Throttle Wires are disconnected / shorted.
- **Troubleshooting:** 
  1. Check for wiring and configuration is correct or n ot. If analogue input is not used the range should be set to the minimum and maximum limits

## Error-53: EEPROM Failure
- **Definition:** Bad NVM Data.
- **Occurrence Condition:** 
  1. EEPROM or flash configuration data corrupted and data can not be recovered.
- **Troubleshooting:** 
  1. If firmware has recently been updated, revert to previous version. Contact Virya for support.

## Error-54: VCL Run Time Error
- **Definition:** VCL code encountered a runtime
- **Occurrence Condition:** 
  1. VCL code encountered a runtime
 - **Troubleshooting:** 
  1. Update to Supplier

## Error-55: Motor Characterization fault
- **Definition:** characterization failed during characterization process
- **Occurrence Condition:** 
  1. 1. Motor characterization failed during characterization process. 
- **Troubleshooting:** 
  1. Update to Supplier.

## Error-56: Encoder Pulse Count Fault
- **Definition:** NA
- **Occurrence Condition:** 
  1. Encoder Steps parameter does not match the actual motor encoder.
- **Troubleshooting:**
  1. Update to Supplier.

## Error-57: Encoder LOS
- **Definition:** Encoder supply is disconnected.
- **Occurrence Condition:** 
  1. Encoder input supply is disconnected or no supply from Controller due to wire cut
- **Troubleshooting:** 
  1. Check encoder wiring - especially shielding and routing of encoder cables.
  2. Encoder connector terminal PIN back out.

## Error-58: Brake POT Engage
- **Definition:** During drive, brake pot is applied.
- **Occurrence Condition:** 
  1. When the Throttle is in active and the brake Pot is pressed
- **Troubleshooting:** 
  1. Brake Pedal always to be in release condition during the throttle active

## Error-59: Brake POT fault
- **Definition:** Brake POT input voltage outside of configured range.
- **Occurrence Condition:** 
  1. Brake Wires are disconnected / shorted
- **Troubleshooting:** 
  1. Check for wiring and configuration is correct or not. If analogue input is not used the range should be set to the minimum and maximum limits

## Error-60: High Pedal Disable
- **Definition:** Any drive switch or throttle will be in active at vehicle Power ON.
- **Occurrence Condition:** 
  1. When the vehicle Power ON condition
  2. When the Main Battery will switched OFF / ON"
- **Troubleshooting:**
  1. Put the drive switch to N position.
  2. Release the Throttle before turning ON
`;

const pcanToolContent = `
# PCAN Tool Starting Process Guide

This guide explains the step-by-step process for setting up and using the PCAN Tool for CAN bus monitoring and logging.

## Step 1: Hardware Setup
- Connect the CAN interface hardware (USB-to-CAN adapter or PCI card) to your PC.
- Connect the CAN interface to the vehicle's CAN network or bench setup (via CAN_H and CAN_L lines).

## Step 2: Launch the CAN Tool Software
- Open the tool software (PCAN View).
- Select the connected CAN interface from the hardware list.
- **Image Description:** A screenshot of the PCAN-View software with a "Connect" dialog box open. The dialog shows a list of "Available PCAN Hardware and PCAN Nets". The item "PCAN-USB FD: Device ID 0h" is highlighted in the list, indicating it has been selected. To the right of the list are settings for CAN Setup. The main window behind the dialog is titled "PCAN-View" and has a "Receive" pane.

## Step 3: Configure Communication Settings
- Set the baud rate (commonly 500 kbps or 250 kbps for automotive).
- Choose the protocol (CAN, CAN FD, J1939, etc.).
- After setting the baud rate to 500 kbit/s, press 'Ok'.
- **Image Description:** A screenshot of the "Connect" dialog in PCAN-View. Focus is on the "Nominal Bit Rate" section. The "Database Entry" dropdown is set to "500 kbit/s". Red lines are drawn to highlight this setting and the "OK" button, with text annotations saying "Baud rate t 500kbit/s Than Press Ok".

## Step 4: Start Monitoring
- Click "Start Measurement / Logging".
- Monitor live CAN messages. The display shows columns for CAN-ID, Type, Length, Data, Cycle Time, and Count.
- Use filters to focus on specific IDs if needed.
- **Image Description:** A screenshot of the main PCAN-View window displaying live CAN message traffic. The window is filled with rows of data, each representing a CAN message. Columns are labeled: CAN-ID (e.g., "664h", "663h"), Type, Length (e.g., "8"), Data (e.g., "F4 74 79 22 38 00 00 00"), Cycle Time, and Count.

## Step 5: Enable Logging
- In the PCAN-View menu, go to "Trace" and select "Start Message Trace".
- A dropdown menu appears from the "Trace" menu item.
- Click the "Start Trace" button, which may look like a red record button.
- All incoming CAN frames will now be saved to a file.
- **Image Description:** A screenshot of PCAN-View with the "Trace" menu opened. The menu shows options like "Start", "Pause", "Stop", and "Save...". Below these are checkboxes for logging options like "Log Data Frames", "Log RTR", "Log Error Frames", etc. All are checked. A red circle icon for recording might be visible.

## Step 6: Stop Logging
- When you are finished logging, click "Stop Trace".
- The log file is now saved.
- This file can be opened in PCAN-View, Vector tools, or converted for further analysis.
- **Image Description:** A screenshot of PCAN-View with the "Trace" menu open, similar to the previous step. The focus is on the "Stop" option, indicating that logging is in progress and can be stopped. The data grid continues to show CAN messages being received.

## Step 7 & 8: Save File and Choose Location
- After stopping the log, a "Save As" dialog will appear.
- Enter a name for your log file.
- Ensure you know the location where the file is being saved.
- The file type is typically a Trace file (*.trc).
- **Image Description:** A screenshot of the Windows "Save As" dialog. The dialog shows a folder structure, with the current location being "Local Disk (D:) > exicom charging > charging issue". A file name can be entered, and the "Save as type" is set to "Trace files (*.trc)". Buttons for "Save" and "Cancel" are at the bottom.
`;

const viryaGen2PinoutContent = `
# Virya Gen 2: E-Box Assembly Pin Configurations

This document details the pin configurations for the new and improved powertrain kit E-Box assembly.

- **Connector Make:** Ampseal, TE Connectivity
- **Connector Part Number:** 770680-1
- **Image Description:** A schematic diagram of a 23-pin Ampseal automotive connector, part number 770680-1, viewed from the wire insertion side. The pins are numbered 1 through 23 in their respective positions within the connector housing.

---

## E-Box Connector Pin Descriptions

| Pin Descriptions                  | Pin Details | Input / Output Supply Details               |
| --------------------------------- | ----------- | ------------------------------------------- |
| Controller Input Supply - Main    | 1           | 48V from Terminal Block / Connector         |
| Controller Input Supply - Interlock | 2           | 48V from Terminal Block / Connector         |
| CAN HIGH                          | 3           | Controller Software Flashing & Diagnosis    |
| CAN LOW - Controller              | 4           | Controller Software Flashing & Diagnosis    |
| FORWARD Switch I/P                | 5           | 48V B-                                      |
| BOOST Switch I/P                  | 6           | 48V B-                                      |
| REVERSE Switch I/P                | 7           | 48V B-                                      |
| Throttle and Footbrake Supply     | 8           | 5V from Controller                          |
| Throttle Pot -Wiper               | 9           | To Controller                               |
| Brake Pot -Wiper                  | 10          | To Controller                               |
| CAN HIGH                          | 11          | Vehicle Communication                       |
| CAN LOW                           | 12          | Vehicle Communication                       |
| Encoder Power Supply              | 13          | 5V from Controller                          |
| Motor Thermistor                  | 14          | To Controller                               |
| Encoder Sine                      | 15          | To Controller                               |
| Encoder Cosine                    | 16          | To Controller                               |
| Encoder 0V                        | 17          | 5V GND from Controller                      |
| Encoder Cable Shield              | 23          | Not applicable                              |

---

## Note:

- Drive Mode Switch Input is 48V B- (GND Supply).
- Throttle and Brake POT Gnd supply is to be connected to 48V B- (GND Supply).
- Use Relay to give 12V supply for REVERSE Lamp. Since Output from Drive Switch is also 48V GND.

---

## 6 Pin Motor Encoder Connector Pin Details

| Pin Details | Pin Descriptions        |
| ----------- | ----------------------- |
| 1           | Encoder Power Supply, 5V|
| 2           | Motor Thermistor        |
| 3           | Encoder Sine            |
| 4           | Encoder Cosine          |
| 5           | Encoder GND             |
| 6           | Encoder Cable Shield    |
`;


export const matelEvKnowledgeBase: StoredFile[] = [
  {
    name: 'EV-Troubleshooting-Guide.md',
    content: matelEvContent,
    size: matelEvContent.length,
    lastModified: Date.now(),
  },
  {
    name: 'ErrorCode-Diagnostic-Document.md',
    content: IssueorDiagnosticDocumentContent,
    size: IssueorDiagnosticDocumentContent.length,
    lastModified: Date.now() - 2,
  },
  {
    name: 'PCAN-Tool-Guide.md',
    content: pcanToolContent,
    size: pcanToolContent.length,
    lastModified: Date.now() - 4,
  },
  {
    name: 'Virya-Gen2-Pin-Position.md',
    content: viryaGen2PinoutContent,
    size: viryaGen2PinoutContent.length,
    lastModified: Date.now() - 6,
  }
];
