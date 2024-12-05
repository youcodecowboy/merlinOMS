# Wash Specifications

## Wash Type Mapping

### Light Wash Group
- **Standard (STA)**
  - Universal Source: RAW
  - Characteristics:
    * Light blue finish
    * Minimal fading
    * Standard wash process

- **Indigo (IND)**
  - Universal Source: RAW
  - Characteristics:
    * Deep indigo finish
    * Rich color retention
    * Specialized indigo process

### Dark Wash Group
- **Onyx (ONX)**
  - Universal Source: BRW
  - Characteristics:
    * Deep black finish
    * Maximum color saturation
    * Specialized black process

- **Jaguar (JAG)**
  - Universal Source: BRW
  - Characteristics:
    * Charcoal grey finish
    * Vintage fade effect
    * Specialized grey process

## Wash Bin Management

### Bin Organization
1. **Pre-Wash Staging Bins**
   - Organized by wash type
   - Each wash type has dedicated bins:
     * STA Bin Set
     * IND Bin Set
     * ONX Bin Set
     * JAG Bin Set
   - Capacity: 50 units per bin
   - Location: Wash staging area

2. **Bin Status States**
   - OPEN: Accepting new units
   - FILLING: Currently receiving units
   - FULL: Ready for laundry pickup
   - IN_TRANSIT: With laundry service
   - RETURNED: Back from laundry

### Wash Request Flow
1. **Unit Assignment**
   - System identifies target wash from order
   - Generates wash request
   - Assigns specific wash bin

2. **Physical Movement**
   - Staff guided to unit location
   - Scan unit QR to confirm
   - Transport to assigned wash bin
   - Scan bin QR to confirm placement

3. **Bin Management**
   - System tracks bin capacity
   - Updates unit count
   - Triggers "FULL" status at capacity
   - Notifies laundry team for pickup

## Laundry Service Integration

### Bin Checkout Process
1. **Pickup Preparation**
   - System generates batch number
   - Creates consolidated QR for bin
   - Prints wash specification sheet

2. **Laundry Pickup**
   - Laundry service scans bin QR
   - System records:
     * Pickup timestamp
     * Service provider ID
     * Expected return date
     * Batch number

3. **Status Updates**
   - Units status updated to IN_WASH
   - Bin status updated to IN_TRANSIT
   - Customer orders updated with status

### Return Process
1. **Quality Check**
   - Scan returned batch QR
   - Visual inspection of units
   - Confirmation of wash quality
   - Count verification

2. **Unit Processing**
   - Scan individual unit QRs
   - System validates against batch
   - Updates unit status to WASHED
   - Triggers next stage request (QC/Finishing)

## Wash Recipes

### Standard (STA) Process
1. **Pre-wash Requirements**
   - Temperature: [Specific temp]
   - Duration: [Time]
   - Chemical composition: [Details]

2. **Main Wash**
   - Temperature: [Specific temp]
   - Duration: [Time]
   - Agitation: [Details]

3. **Post-wash**
   - Drying specifications
   - Finishing requirements

[Similar detailed specifications for IND, ONX, and JAG washes...]

## Quality Control Points

### Pre-Wash Inspection
- Fabric integrity check
- Hardware verification
- Size tag confirmation

### Post-Wash Verification
- Color consistency
- Shrinkage measurement
- Texture assessment
- Hardware integrity

## Tracking and Monitoring

### Data Collection Points
1. **Pre-Wash**
   - Initial measurements
   - Unit condition
   - Batch details

2. **Post-Wash**
   - Final measurements
   - Color validation
   - Quality assessment
   - Shrinkage calculation

### System Updates
- Real-time status tracking
- Batch progress monitoring
- Quality metrics recording
- Timeline tracking

## Error Handling

### Common Issues
1. **Pre-Wash**
   - Wrong bin placement
   - Incorrect wash assignment
   - Batch composition errors

2. **Post-Wash**
   - Color inconsistency
   - Excessive shrinkage
   - Quality issues
   - Missing units

### Recovery Procedures
[Details of recovery procedures for each issue type...] 