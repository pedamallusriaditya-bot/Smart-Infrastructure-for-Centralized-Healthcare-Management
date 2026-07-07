import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PatNameList = ['Anil', 'Sunil', 'Rajesh', 'Priya', 'Swathi', 'Venkat', 'Srinivas', 'Divya', 'Deepak', 'Geetha', 'Mahesh', 'Rahul', 'Kalyan', 'Jyothi', 'Prasad', 'Ramu', 'Sita', 'Radha', 'Hari', 'Krishna'];
const PatLastNameList = ['Reddy', 'Rao', 'Goud', 'Kulkarni', 'Bhatt', 'Nair', 'Srinivasan', 'Joshi', 'Patel', 'Yadav', 'Varma', 'Sharma', 'Naidu', 'Choudhary', 'Gupta', 'Prasad', 'Deshmukh', 'Pillai', 'Acharya', 'Menon'];

const specializationsList: { enumVal: string; name: string }[] = [
  { enumVal: 'GENERAL_MEDICINE', name: 'General Physician' },
  { enumVal: 'CARDIOLOGY', name: 'Cardiologist' },
  { enumVal: 'NEUROLOGY', name: 'Neurologist' },
  { enumVal: 'SURGERY', name: 'Orthopaedic Surgeon' },
  { enumVal: 'PEDIATRICS', name: 'Pediatrician' },
  { enumVal: 'EMERGENCY_MEDICINE', name: 'Emergency Physician' },
  { enumVal: 'RADIOLOGY', name: 'Radiologist' },
  { enumVal: 'PATHOLOGY', name: 'Pathologist' }
];

async function main() {
  console.log('✨ Starting exhaustive DB refactor & seed initialization...');

  console.log('🧹 Cleaning existing tables sequentially to avoid FK violations...');
  const tableNames = [
    'MedicationAdministrationRecord', 'PrescriptionMedicine', 'Prescription', 'LabReport', 'LabOrder',
    'Appointment', 'MedicalRecord', 'TriageLog', 'Admission', 'Bed', 'Room',
    'PatientReferral', 'Ambulance', 'Emergency', 'InventoryAlert', 'InventoryItem',
    'DiagnosticAvailability', 'DoctorAttendance', 'DemandForecast', 'ResourceTransfer',
    'Nurse', 'Pharmacist', 'LabTechnician', 'EmergencyStaff', 'Doctor', 'Admin', 'Patient',
    'Department', 'Hospital', 'LoginHistory', 'Session', 'RefreshToken', 'Notification',
    'Invoice', 'PatientTimeline', 'OfflineSync', 'AIRequest', 'User', 'RolePermission',
    'Permission', 'Role', 'Medicine'
  ];

  for (const table of tableNames) {
    try {
      await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].deleteMany();
    } catch (e) {
      console.warn(`Clean skipped for ${table} (already empty or missing)`);
    }
  }

  // 1. Setup Role entities
  console.log('🔑 Seeding user role entries...');
  const rolesList = ['ADMIN', 'DOCTOR', 'PATIENT', 'LAB_TECHNICIAN', 'PHARMACIST', 'EMERGENCY_STAFF', 'APPLICATION_ADMIN', 'NURSE'];
  const roleMap: Record<string, any> = {};
  for (const r of rolesList) {
    roleMap[r] = await prisma.role.create({ data: { name: r } });
  }

  // 2. Pre-hash credentials to optimize execution performance
  console.log('🔑 Pre-hashing system passwords...');
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const userPasswordHash = await bcrypt.hash('Password@123', 10);

  // 3. District Health Office Administrator
  console.log('🏢 Seeding District Health Administrator...');
  await prisma.user.create({
    data: {
      email: 'appadmin@carehive.med',
      passwordHash: userPasswordHash,
      roleId: roleMap['APPLICATION_ADMIN'].id,
      district: 'Hyderabad District',
      status: 'ACTIVE'
    }
  });

  // 4. Seeding 5 Clinics / Hospitals within Hyderabad bounds
  console.log('🏢 Seeding Hyderabad clinics coordinates registry...');
  const hospitalData = [
    {
      name: 'Gandhi Memorial Hospital',
      address: 'Musheerabad, Secunderabad, Hyderabad',
      type: 'District Hospital',
      latitude: 17.4244,
      longitude: 78.4867,
      email: 'gandhi.memorial@carehive.med',
      phone: '040-27502742',
      pincode: '500003',
      state: 'Telangana',
      district: 'Hyderabad District'
    },
    {
      name: 'Sunshine Medical Centre',
      address: 'Paradise Circle, Secunderabad, Hyderabad',
      type: 'Private',
      latitude: 17.4435,
      longitude: 78.4983,
      email: 'sunshine@carehive.med',
      phone: '040-44550000',
      pincode: '500003',
      state: 'Telangana',
      district: 'Hyderabad District'
    },
    {
      name: 'Apollo Community Hospital',
      address: 'Jubilee Hills, Road No. 72, Hyderabad',
      type: 'Private',
      latitude: 17.4278,
      longitude: 78.4114,
      email: 'apollo.community@carehive.med',
      phone: '040-23607777',
      pincode: '500033',
      state: 'Telangana',
      district: 'Hyderabad District'
    },
    {
      name: 'Green Valley PHC',
      address: 'Moinabad, Ranga Reddy District, Hyderabad Outer',
      type: 'PHC',
      latitude: 17.3201,
      longitude: 78.2789,
      email: 'greenvalley@carehive.med',
      phone: '08413-235444',
      pincode: '501504',
      state: 'Telangana',
      district: 'Hyderabad District'
    },
    {
      name: 'City Care CHC',
      address: 'Charminar Road, Old City, Hyderabad',
      type: 'CHC',
      latitude: 17.3616,
      longitude: 78.4747,
      email: 'citycare@carehive.med',
      phone: '040-24522233',
      pincode: '500002',
      state: 'Telangana',
      district: 'Hyderabad District'
    }
  ];

  const hospitals: any[] = [];
  for (const h of hospitalData) {
    const created = await prisma.hospital.create({
      data: {
        ...h,
        status: 'ACTIVE'
      }
    });
    hospitals.push(created);
  }

  // 5. Seeding 14 Departments in every hospital
  console.log('🩺 Seeding 14 core departments per hospital...');
  const deptNames = [
    'General Medicine', 'Cardiology', 'Neurology', 'Orthopaedics', 'Pediatrics',
    'Gynecology', 'Emergency Medicine', 'Radiology', 'Pathology', 'Laboratory',
    'Pharmacy', 'ICU', 'General Ward', 'Outpatient Department'
  ];

  const hospitalDepts: Record<string, Record<string, any>> = {};
  for (const h of hospitals) {
    hospitalDepts[h.id] = {};
    for (const dName of deptNames) {
      const dept = await prisma.department.create({
        data: {
          name: dName,
          hospitalId: h.id,
          status: 'ACTIVE'
        }
      });
      hospitalDepts[h.id][dName] = dept;
    }
  }

  // 6. Global Medicine catalog generation (250 distinct medications)
  console.log('💊 Generating 250 therapeutic class generic medicines...');
  const baseMedicines = [
    { name: 'Paracetamol 500mg', manufacturer: 'GSK' },
    { name: 'Insulin Glargine 100 IU', manufacturer: 'Sanofi' },
    { name: 'Metformin 850mg', manufacturer: 'USV' },
    { name: 'Amoxicillin 500mg', manufacturer: 'Cipla' },
    { name: 'Aspirin 75mg', manufacturer: 'Bayer' },
    { name: 'Ibuprofen 400mg', manufacturer: 'Abbott' },
    { name: 'Cefixime 200mg', manufacturer: 'Mankind' },
    { name: 'Omeprazole 20mg', manufacturer: 'Dr. Reddys' },
    { name: 'Vitamin D3 60K', manufacturer: 'Alkem' },
    { name: 'ORS Sachet', manufacturer: 'FDC' },
    { name: 'Atorvastatin 10mg', manufacturer: 'Lupin' },
    { name: 'Amlodipine 5mg', manufacturer: 'Pfizer' },
    { name: 'Azithromycin 500mg', manufacturer: 'Alembic' },
    { name: 'Pantoprazole 40mg', manufacturer: 'Sun Pharma' },
    { name: 'Losartan 50mg', manufacturer: 'Glenmark' }
  ];

  const generatedMedsList: { name: string; manufacturer: string; price: number }[] = [];
  baseMedicines.forEach((m) => {
    generatedMedsList.push({ name: m.name, manufacturer: m.manufacturer, price: 20 + Math.floor(Math.random() * 150) });
  });

  const genericPrefixes = ['Cipro', 'Lacto', 'Dexa', 'Methy', 'Predni', 'Hydro', 'Clindi', 'Fluco', 'Aciclo', 'Osel'];
  const genericSuffixes = ['xin', 'bac', 'one', 'side', 'sol', 'cort', 'mycin', 'zole', 'vir', 'mune'];

  while (generatedMedsList.length < 250) {
    const prefix = genericPrefixes[Math.floor(Math.random() * genericPrefixes.length)];
    const suffix = genericSuffixes[Math.floor(Math.random() * genericSuffixes.length)];
    const dosage = [5, 10, 25, 50, 100, 250, 500][Math.floor(Math.random() * 7)];
    const unit = Math.random() > 0.3 ? 'mg' : 'mcg';
    const name = `${prefix}${suffix} ${dosage}${unit}`;
    
    if (!generatedMedsList.some((m) => m.name === name)) {
      generatedMedsList.push({
        name,
        manufacturer: ['Aurobindo', 'Torrent', 'Biocon', 'Zydus', 'IPCA', 'Intas'][Math.floor(Math.random() * 6)],
        price: 25 + Math.floor(Math.random() * 380)
      });
    }
  }

  const medicines: any[] = [];
  for (const m of generatedMedsList) {
    const med = await prisma.medicine.create({
      data: {
        name: m.name,
        manufacturer: m.manufacturer,
        price: m.price,
        stock: 600
      }
    });
    medicines.push(med);
  }

  // 7. Inventory creation & setting up intentional regional shortages
  console.log('📦 Seeding Hospital Inventories & Shortages...');
  for (const h of hospitals) {
    const consumables = [
      { name: 'Sterile Surgical Gloves (Box of 50)', category: 'CONSUMABLE', qty: 250, min: 60, max: 600, unit: 'boxes' },
      { name: 'N95 Respirator Masks (Box of 20)', category: 'CONSUMABLE', qty: 180, min: 40, max: 400, unit: 'boxes' },
      { name: 'Disposable PPE Kits', category: 'CONSUMABLE', qty: 90, min: 25, max: 250, unit: 'units' },
      { name: 'Normal Saline IV Fluid 500ml', category: 'CONSUMABLE', qty: 320, min: 60, max: 700, unit: 'bottles' },
      { name: 'Disposable Syringes 5ml', category: 'CONSUMABLE', qty: 1200, min: 250, max: 3000, unit: 'units' },
      { name: 'Oxygen Cylinders 47L', category: 'OXYGEN', qty: h.name === 'City Care CHC' ? 2 : 65, min: 10, max: 120, unit: 'cylinders' },
      { name: 'O-Negative Blood Bags', category: 'BLOOD_UNIT', qty: h.name === 'Green Valley PHC' ? 0 : 45, min: 8, max: 60, unit: 'bags' },
      { name: 'Rapid Malaria Antigen Test Kits', category: 'CONSUMABLE', qty: 280, min: 50, max: 600, unit: 'kits' }
    ];

    for (const item of consumables) {
      const invItem = await prisma.inventoryItem.create({
        data: {
          hospitalId: h.id,
          category: item.category as any,
          name: item.name,
          quantity: item.qty,
          minQuantity: item.min,
          maxQuantity: item.max,
          unit: item.unit,
          supplier: 'Telangana Medical Infrastructure Corp',
          batchNumber: `BAT-${Math.floor(100000 + Math.random() * 900000)}`,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          unitCost: 20 + Math.random() * 60,
          status: item.qty === 0 ? 'OUT_OF_STOCK' : item.qty <= item.min ? 'LOW_STOCK' : 'ADEQUATE'
        }
      });

      if (invItem.status === 'LOW_STOCK' || invItem.status === 'OUT_OF_STOCK') {
        await prisma.inventoryAlert.create({
          data: {
            inventoryItemId: invItem.id,
            hospitalId: h.id,
            alertType: invItem.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
            severity: invItem.quantity === 0 ? 'CRITICAL' : 'WARNING',
            message: `Emergency reserve warning: "${item.name}" stock level is critical at ${invItem.quantity} ${item.unit}.`,
            isResolved: false
          }
        });
      }
    }

    const selectedMeds = medicines.slice(0, 45);
    for (const med of selectedMeds) {
      let qty = 350;
      let min = 60;
      let isShortage = false;

      if (h.name === 'Sunshine Medical Centre' && med.name.toLowerCase().includes('insulin')) {
        qty = 4;
        min = 45;
        isShortage = true;
      }
      if (h.name === 'Apollo Community Hospital' && (med.name.toLowerCase().includes('amoxicillin') || med.name.toLowerCase().includes('cefixime') || med.name.toLowerCase().includes('azithromycin'))) {
        qty = 6;
        min = 55;
        isShortage = true;
      }

      const invItem = await prisma.inventoryItem.create({
        data: {
          hospitalId: h.id,
          category: 'MEDICINE',
          name: med.name,
          quantity: qty,
          minQuantity: min,
          maxQuantity: 1200,
          unit: 'tablets',
          supplier: med.manufacturer,
          batchNumber: `MED-${Math.floor(100000 + Math.random() * 900000)}`,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          unitCost: med.price * 0.7,
          status: qty <= min ? 'LOW_STOCK' : 'ADEQUATE'
        }
      });

      if (isShortage) {
        await prisma.inventoryAlert.create({
          data: {
            inventoryItemId: invItem.id,
            hospitalId: h.id,
            alertType: 'LOW_STOCK',
            severity: 'CRITICAL',
            message: `AI Alert: Medicine shortage detected for "${med.name}" with only ${qty} units remaining.`,
            isResolved: false
          }
        });
      }
    }
  }

  // 8. Seeding Portal Staff & Medical Professionals
  console.log('👤 Seeding Portal Staff & Medical Professionals...');
  
  const doctorsMap: Record<string, any[]> = {};
  const nursesMap: Record<string, any[]> = {};
  const labTechsMap: Record<string, any[]> = {};
  const pharmacistsMap: Record<string, any[]> = {};
  const patientsMap: Record<string, any[]> = {};

  let hIdx = 1;
  for (const h of hospitals) {
    doctorsMap[h.id] = [];
    nursesMap[h.id] = [];
    labTechsMap[h.id] = [];
    pharmacistsMap[h.id] = [];
    patientsMap[h.id] = [];

    // Create Hospital Admin
    const adminUser = await prisma.user.create({
      data: {
        email: `admin.${hIdx}@carehive.med`,
        passwordHash: adminPasswordHash,
        roleId: roleMap['ADMIN'].id,
        status: 'ACTIVE'
      }
    });

    await prisma.admin.create({
      data: {
        userId: adminUser.id,
        hospitalId: h.id,
        firstName: `${h.name.split(' ')[0]}`,
        lastName: 'Administrator',
        mobileNumber: `9000000${hIdx}10`
      }
    });

    // Create 8 Doctors
    let dIdx = 1;
    for (const spec of specializationsList) {
      const docUser = await prisma.user.create({
        data: {
          email: `doctor.${hIdx}.${dIdx}@carehive.med`,
          passwordHash: userPasswordHash,
          roleId: roleMap['DOCTOR'].id,
          status: 'ACTIVE'
        }
      });

      let deptName = 'General Medicine';
      if (spec.enumVal === 'GENERAL_MEDICINE') deptName = 'General Medicine';
      else if (spec.enumVal === 'CARDIOLOGY') deptName = 'Cardiology';
      else if (spec.enumVal === 'NEUROLOGY') deptName = 'Neurology';
      else if (spec.enumVal === 'SURGERY') deptName = 'Orthopaedics';
      else if (spec.enumVal === 'PEDIATRICS') deptName = 'Pediatrics';
      else if (spec.enumVal === 'EMERGENCY_MEDICINE') deptName = 'Emergency Medicine';
      else if (spec.enumVal === 'RADIOLOGY') deptName = 'Radiology';
      else if (spec.enumVal === 'PATHOLOGY') deptName = 'Pathology';

      const doc = await prisma.doctor.create({
        data: {
          userId: docUser.id,
          firstName: `Dr. ${['Arvind', 'Suresh', 'Kiran', 'Pranati', 'Meera', 'Ramesh', 'Vijay', 'Sneha'][dIdx - 1]}`,
          lastName: ['Reddy', 'Rao', 'Sharma', 'Patel', 'Nair', 'Verma', 'Joshi', 'Kapoor'][dIdx - 1],
          specialization: spec.enumVal as any,
          licenseNumber: `LIC-HYD-${hIdx}-${dIdx}`,
          departmentId: hospitalDepts[h.id][deptName].id,
          approvalStatus: 'APPROVED',
          status: 'ACTIVE'
        }
      });
      doctorsMap[h.id].push(doc);
      dIdx++;
    }

    // Create 6 Nurses
    for (let nIdx = 1; nIdx <= 6; nIdx++) {
      const nurseUser = await prisma.user.create({
        data: {
          email: `nurse.${hIdx}.${nIdx}@carehive.med`,
          passwordHash: userPasswordHash,
          roleId: roleMap['NURSE'].id,
          status: 'ACTIVE'
        }
      });

      const nurse = await prisma.nurse.create({
        data: {
          userId: nurseUser.id,
          hospitalId: h.id,
          firstName: ['Sister Anitha', 'Sister Lakshmi', 'Sister Kavitha', 'Brother Raju', 'Sister Swapna', 'Sister Mary'][nIdx - 1],
          lastName: ['Kaur', 'Pillai', 'Devi', 'Goud', 'Yadav', 'Fernandez'][nIdx - 1],
          employeeId: `EMP-NUR-${hIdx}-${nIdx}`,
          wardId: hospitalDepts[h.id]['General Ward'].id,
          status: 'ACTIVE'
        }
      });
      nursesMap[h.id].push(nurse);
    }

    // Create 3 Lab Technicians
    for (let lIdx = 1; lIdx <= 3; lIdx++) {
      const labUser = await prisma.user.create({
        data: {
          email: `lab.${hIdx}.${lIdx}@carehive.med`,
          passwordHash: userPasswordHash,
          roleId: roleMap['LAB_TECHNICIAN'].id,
          status: 'ACTIVE'
        }
      });

      const labTech = await prisma.labTechnician.create({
        data: {
          userId: labUser.id,
          firstName: `Tech ${['Naresh', 'Sunitha', 'Prashanth'][lIdx - 1]}`,
          lastName: ['Kumar', 'Reddy', 'Verma'][lIdx - 1],
          employeeId: `EMP-LAB-${hIdx}-${lIdx}`,
          status: 'ACTIVE'
        }
      });
      labTechsMap[h.id].push(labTech);
    }

    // Create 2 Pharmacists
    for (let pIdx = 1; pIdx <= 2; pIdx++) {
      const pharmaUser = await prisma.user.create({
        data: {
          email: `pharma.${hIdx}.${pIdx}@carehive.med`,
          passwordHash: userPasswordHash,
          roleId: roleMap['PHARMACIST'].id,
          status: 'ACTIVE'
        }
      });

      const pharmacist = await prisma.pharmacist.create({
        data: {
          userId: pharmaUser.id,
          hospitalId: h.id,
          firstName: `Pharma ${['Ganesh', 'Deepika'][pIdx - 1]}`,
          lastName: ['Goud', 'Nair'][pIdx - 1],
          licenseId: `LIC-PHA-${hIdx}-${pIdx}`,
          status: 'ACTIVE'
        }
      });
      pharmacistsMap[h.id].push(pharmacist);
    }

    // Create 1 Emergency Staff
    const emgUser = await prisma.user.create({
      data: {
        email: `emergency.${hIdx}@carehive.med`,
        passwordHash: userPasswordHash,
        roleId: roleMap['EMERGENCY_STAFF'].id,
        status: 'ACTIVE'
      }
    });

    await prisma.emergencyStaff.create({
      data: {
        userId: emgUser.id,
        firstName: `Coordinator`,
        lastName: ['GMH', 'SMC', 'ACH', 'GV', 'CC'][hIdx - 1],
        shiftInfo: 'Rotational 12-Hour Shift',
        status: 'ACTIVE'
      }
    });

    // Create 60 Patients per hospital
    for (let pIdx = 1; pIdx <= 60; pIdx++) {
      const patUser = await prisma.user.create({
        data: {
          email: `patient.${hIdx}.${pIdx}@carehive.med`,
          passwordHash: userPasswordHash,
          roleId: roleMap['PATIENT'].id,
          status: 'ACTIVE'
        }
      });

      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - (18 + Math.floor(Math.random() * 55)));

      const patient = await prisma.patient.create({
        data: {
          userId: patUser.id,
          firstName: PatNameList[pIdx % PatNameList.length],
          lastName: PatLastNameList[pIdx % PatLastNameList.length],
          dateOfBirth: dob,
          gender: Math.random() > 0.5 ? 'MALE' : 'FEMALE',
          phone: `98765${hIdx}${pIdx.toString().padStart(3, '0')}`,
          address: `${h.address} Colony, Hyderabad`,
          bloodGroup: ['A+', 'B+', 'O+', 'AB+', 'O-'][Math.floor(Math.random() * 5)],
          insuranceNumber: `INS-${hIdx}-${pIdx.toString().padStart(3, '0')}`
        }
      });
      patientsMap[h.id].push(patient);
    }

    hIdx++;
  }

  // 9. Creating Hospital Wards, Rooms, & Beds
  console.log('🛌 Creating Hospital Wards, Rooms, & Beds...');
  const bedsMap: Record<string, any[]> = {};
  for (const h of hospitals) {
    bedsMap[h.id] = [];
    const roomsData = [
      { num: 'G-101', type: 'GENERAL' },
      { num: 'I-201', type: 'ICU' },
      { num: 'P-301', type: 'PRIVATE' },
      { num: 'P-302', type: 'PRIVATE' },
      { num: 'E-100', type: 'EMERGENCY' },
      { num: 'G-102', type: 'GENERAL' }
    ];

    for (const r of roomsData) {
      const room = await prisma.room.create({
        data: {
          roomNumber: r.num,
          type: r.type as any,
          hospitalId: h.id
        }
      });

      const bedCount = r.type === 'GENERAL' ? 12 : r.type === 'ICU' ? 6 : r.type === 'EMERGENCY' ? 8 : 2;
      for (let b = 1; b <= bedCount; b++) {
        const bed = await prisma.bed.create({
          data: {
            bedNumber: `${r.num}-B${b}`,
            status: 'AVAILABLE',
            roomId: room.id
          }
        });
        bedsMap[h.id].push(bed);
      }
    }
  }

  // 10. Seeding Clinical Workflows (Admissions, Appointments, Labs)
  console.log('📅 Seeding Clinical Workflows (Admissions, Appointments, Labs)...');
  const testTypes = ['CBC', 'BLOOD_SUGAR', 'ECG', 'MRI', 'CT', 'X_RAY', 'ULTRASOUND', 'BLOOD_BANK', 'COVID', 'URINE_ANALYSIS', 'LIVER_FUNCTION', 'KIDNEY_FUNCTION'];

  for (const h of hospitals) {
    const pts = patientsMap[h.id];
    const docs = doctorsMap[h.id];
    const nrs = nursesMap[h.id];
    const beds = bedsMap[h.id];

    const invMeds = await prisma.inventoryItem.findMany({
      where: { hospitalId: h.id, category: 'MEDICINE' }
    });

    let patientCursor = 0;

    // Generate 10 Admitted Patients
    for (let admIdx = 0; admIdx < 10; admIdx++) {
      const patient = pts[patientCursor++];
      const doctor = docs[admIdx % docs.length];
      const bed = beds[admIdx];

      await prisma.bed.update({
        where: { id: bed.id },
        data: { status: 'OCCUPIED' }
      });

      const admission = await prisma.admission.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          bedId: bed.id,
          admissionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          status: 'ADMITTED',
          reason: 'Severe acute diagnosis and ward monitoring.'
        }
      });

      const presc = await prisma.prescription.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          medicine: 'Paracetamol 500mg, Amoxicillin 500mg',
          dosage: '1-0-1',
          instructions: 'After meals.',
          status: 'DISPENSED',
          route: 'ORAL',
          frequency: 'TWICE_DAILY',
          hospitalId: h.id
        }
      });

      if (invMeds.length > 0) {
        const medTemplate = medicines.find(m => m.name === invMeds[0].name);
        if (medTemplate) {
          await prisma.prescriptionMedicine.create({
            data: {
              prescriptionId: presc.id,
              medicineId: medTemplate.id,
              quantity: 10
            }
          });
        }
      }

      await prisma.medicationAdministrationRecord.create({
        data: {
          patientId: patient.id,
          prescriptionId: presc.id,
          medicineId: medicines[0].id,
          nurseId: nrs[0].id,
          hospitalId: h.id,
          dose: '500mg',
          route: 'ORAL',
          administeredAt: new Date(),
          status: 'ADMINISTERED',
          remarks: 'Patient responded well with normal blood pressure.'
        }
      });
    }

    // Generate 10 Past Admissions (Discharged)
    for (let disIdx = 0; disIdx < 10; disIdx++) {
      const patient = pts[patientCursor++];
      const doctor = docs[disIdx % docs.length];
      const bed = beds[15 + disIdx];

      await prisma.admission.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          bedId: bed.id,
          admissionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          dischargeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          status: 'DISCHARGED',
          reason: 'Post-op observation.'
        }
      });
    }

    // Generate 20 Outpatient Appointments & Lab Reports
    for (let appIdx = 0; appIdx < 20; appIdx++) {
      const patient = pts[patientCursor++];
      const doctor = docs[appIdx % docs.length];
      const isCompleted = appIdx < 12;

      const appt = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          appointmentDate: new Date(Date.now() - appIdx * 4 * 60 * 60 * 1000),
          reason: 'Routine consultation and wellness checkup.',
          status: isCompleted ? 'COMPLETED' : 'SCHEDULED'
        }
      });

      if (isCompleted) {
        const testName = testTypes[appIdx % testTypes.length];
        const labOrder = await prisma.labOrder.create({
          data: {
            patientId: patient.id,
            doctorId: doctor.id,
            appointmentId: appt.id,
            testName,
            category: 'BIOCHEMISTRY',
            priority: 'NORMAL',
            status: 'COMPLETED'
          }
        });

        await prisma.labReport.create({
          data: {
            labOrderId: labOrder.id,
            technicianId: labTechsMap[h.id][0].id,
            resultsData: {
              paramName: testName,
              value: testName === 'BLOOD_SUGAR' ? '98 mg/dL' : 'Normal parameters',
              range: 'Reference range normal'
            },
            isAbnormal: false,
            technicianNotes: 'Samples collected and processed correctly.',
            aiSummary: 'Diagnostic metrics index within normal physiological thresholds.'
          }
        });
      }
    }
  }

  // 11. Seeding Diagnostic pricing matrix
  console.log('🩺 Seeding Diagnostic availability price matrix...');
  for (const h of hospitals) {
    for (const t of testTypes) {
      await prisma.diagnosticAvailability.create({
        data: {
          hospitalId: h.id,
          testType: t as any,
          status: 'AVAILABLE',
          cost: 180 + Math.floor(Math.random() * 750)
        }
      });
    }
  }

  // 12. Seeding Ambulance Fleet & Dispatch Emergencies
  console.log('🚑 Seeding Ambulance Fleet & Dispatch Emergencies...');
  const emergencyDescriptions = [
    { type: 'Road Accident', desc: 'Multiple vehicle collision on NH65. Triage dispatch required.' },
    { type: 'Stroke', desc: 'Elderly patient exhibiting hemiparesis and acute speech impairment.' },
    { type: 'Heart Attack', desc: 'Adult patient reporting severe retrosternal chest pain.' },
    { type: 'Burn', desc: 'Accidental domestic kitchen fire causing 2nd-degree dermal burns.' },
    { type: 'Poisoning', desc: 'Inadvertent ingestion of cleaning solvents. Triage alert.' },
    { type: 'Pregnancy Emergency', desc: 'Pre-eclampsia complications. Urgent labor ward prep.' },
    { type: 'Snake Bite', desc: 'Russell Viper bite reported in outer district farm.' }
  ];

  let ambIndex = 1;
  for (const h of hospitals) {
    const ambulances: any[] = [];
    for (let a = 1; a <= 3; a++) {
      const amb = await prisma.ambulance.create({
        data: {
          driverName: `Driver ${['Yadagiri', 'Mallesh', 'Satish'][a - 1]}`,
          driverPhone: `99887766${ambIndex}${a}`,
          vehicleNumber: `TS-09-EM-${ambIndex}-${a}`,
          latitude: h.latitude! + (Math.random() - 0.5) * 0.02,
          longitude: h.longitude! + (Math.random() - 0.5) * 0.02,
          status: a === 1 ? 'DISPATCHED' : 'AVAILABLE',
          fuelLevel: 60 + Math.random() * 40,
          hospitalId: h.id
        }
      });
      ambulances.push(amb);
    }

    for (let e = 0; e < 2; e++) {
      const descObj = emergencyDescriptions[(ambIndex + e) % emergencyDescriptions.length];
      const patient = patientsMap[h.id][e];

      const emergency = await prisma.emergency.create({
        data: {
          patientId: patient.id,
          hospitalId: h.id,
          status: e === 0 ? 'DISPATCHED' : 'ACTIVE',
          description: descObj.desc,
          patientLatitude: h.latitude! + (Math.random() - 0.5) * 0.03,
          patientLongitude: h.longitude! + (Math.random() - 0.5) * 0.03,
          nearestHospitalId: h.id
        }
      });

      if (e === 0) {
        await prisma.ambulance.update({
          where: { id: ambulances[0].id },
          data: {
            activeEmergencyId: emergency.id,
            patientPickupLat: emergency.patientLatitude,
            patientPickupLon: emergency.patientLongitude,
            etaMinutes: 8 + Math.floor(Math.random() * 10)
          }
        });
      }
    }
    ambIndex++;
  }

  // 13. Seeding AI Recommendations, Forecasts, & Transfers
  console.log('🤖 Seeding AI Recommendations, Forecasts, & Transfers...');
  for (const h of hospitals) {
    await prisma.demandForecast.create({
      data: {
        hospitalId: h.id,
        forecastHorizon: 30,
        medicineDemand: [
          { name: 'Paracetamol 500mg', quantity: 300 },
          { name: 'Insulin Glargine 100 IU', quantity: 95 }
        ],
        bedDemand: 22,
        doctorRequirement: 3,
        nurseRequirement: 6,
        labLoad: 140,
        bloodRequirement: [
          { bloodGroup: 'O-Positive', quantity: 18 },
          { bloodGroup: 'O-Negative', quantity: 8 }
        ],
        confidenceRate: 95.8
      }
    });
  }

  const transferProposals = [
    {
      source: 'Gandhi Memorial Hospital',
      dest: 'Sunshine Medical Centre',
      type: 'MEDICINE',
      name: 'Insulin Glargine 100 IU',
      qty: 120,
      reason: 'Urgent redistribution proposal to resolve severe insulin stockout at SMC.'
    },
    {
      source: 'Sunshine Medical Centre',
      dest: 'City Care CHC',
      type: 'EQUIPMENT',
      name: 'Oxygen Cylinders 47L',
      qty: 10,
      reason: 'Low reserve warning at City Care. Excess cylinders dispatched from Sunshine reserves.'
    },
    {
      source: 'Gandhi Memorial Hospital',
      dest: 'Green Valley PHC',
      type: 'BLOOD',
      name: 'O-Negative Blood Bags',
      qty: 15,
      reason: 'Emergency request to restore depleted O-Negative reserves at Moinabad clinic.'
    },
    {
      source: 'Apollo Community Hospital',
      dest: 'City Care CHC',
      type: 'DOCTOR',
      name: 'Dr. Suresh Rao (Neurologist)',
      qty: 1,
      reason: 'AI recommendation: Reallocate specialist roster to City Care to cover shift deficit.'
    }
  ];

  for (const prop of transferProposals) {
    const srcH = hospitals.find(h => h.name === prop.source);
    const destH = hospitals.find(h => h.name === prop.dest);
    if (srcH && destH) {
      await prisma.resourceTransfer.create({
        data: {
          sourceHospitalId: srcH.id,
          destinationHospitalId: destH.id,
          resourceType: prop.type as any,
          resourceName: prop.name,
          quantity: prop.qty,
          reason: prop.reason,
          status: 'PENDING'
        }
      });
    }
  }

  // 14. Seeding Doctor Attendance for the last 30 days
  console.log('📅 Seeding doctor check-in rosters (last 30 days)...');
  const past30Days: Date[] = [];
  for (let i = 30; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    past30Days.push(d);
  }

  for (const h of hospitals) {
    const docs = doctorsMap[h.id];
    for (const d of docs) {
      for (const date of past30Days) {
        const rand = Math.random();
        let status = 'PRESENT';
        let isLate = false;
        if (rand > 0.95) status = 'ABSENT';
        else if (rand > 0.90) status = 'ON_LEAVE';
        else if (rand > 0.82) {
          status = 'PRESENT';
          isLate = true;
        }

        const checkIn = new Date(date);
        checkIn.setHours(isLate ? 10 : 9, Math.floor(Math.random() * 30), 0, 0);

        const checkOut = new Date(date);
        checkOut.setHours(17, Math.floor(Math.random() * 30), 0, 0);

        await prisma.doctorAttendance.create({
          data: {
            doctorId: d.id,
            hospitalId: h.id,
            date,
            status: status as any,
            checkInTime: status === 'PRESENT' ? checkIn : null,
            checkOutTime: status === 'PRESENT' ? checkOut : null,
            workingHours: status === 'PRESENT' ? (isLate ? 7.0 : 8.0) : null,
            isLate
          }
        }).catch(() => {});
      }
    }
  }

  // 15. Seeding historical outpatient appointments & billing invoices (last 90 days)
  console.log('📈 Seeding historical outpatient appointments & billing invoices (last 90 days)...');
  for (let i = 90; i >= 1; i--) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - i);

    for (const h of hospitals) {
      const pts = patientsMap[h.id];
      const docs = doctorsMap[h.id];
      
      const pat1 = pts[Math.floor(Math.random() * pts.length)];
      const doc1 = docs[Math.floor(Math.random() * docs.length)];

      await prisma.appointment.create({
        data: {
          patientId: pat1.id,
          doctorId: doc1.id,
          appointmentDate: targetDate,
          reason: 'Historical wellness checkup.',
          status: 'COMPLETED'
        }
      });

      await prisma.invoice.create({
        data: {
          patientId: pat1.id,
          amount: 300 + Math.floor(Math.random() * 600),
          paid: true,
          createdAt: targetDate
        }
      });
    }
  }

  // 16. Seeding Login Histories
  console.log('💻 Seeding Login Histories...');
  const users = await prisma.user.findMany({ take: 35 });
  const browsers = ['Chrome/120.0.0', 'Safari/17.2.1', 'Firefox/121.0', 'Edge/120.0'];
  const ips = ['192.168.1.52', '103.45.2.19', '182.93.48.5', '49.206.12.18'];

  for (const u of users) {
    for (let l = 0; l < 4; l++) {
      await prisma.loginHistory.create({
        data: {
          userId: u.id,
          ipAddress: ips[l % ips.length],
          userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ${browsers[l % browsers.length]}`,
          createdAt: new Date(Date.now() - l * 2 * 24 * 60 * 60 * 1000)
        }
      });
    }
  }

  // 17. Seeding 1000+ System Audit Logs
  console.log('🔍 Seeding 1000+ System Audit Logs...');
  const actionsList = [
    { act: 'LOGIN', ent: 'User', details: 'User authenticated successfully.' },
    { act: 'PRESCRIPTION_CREATE', ent: 'Prescription', details: 'Prescription generated for clinical outpatient.' },
    { act: 'MEDICINE_DISPENSE', ent: 'InventoryItem', details: 'Medication stock deducted from pharmacy inventory.' },
    { act: 'PATIENT_REGISTER', ent: 'Patient', details: 'New patient record instantiated in registry.' },
    { act: 'EMERGENCY_CREATE', ent: 'Emergency', details: 'Acute emergency dispatch triggered.' },
    { act: 'HOSPITAL_APPROVE', ent: 'Hospital', details: 'New hospital registration approved by District Admin.' },
    { act: 'ADMISSION_CREATE', ent: 'Admission', details: 'Patient ward admission completed.' },
    { act: 'DISCHARGE_COMPLETE', ent: 'Admission', details: 'Patient checkout and discharge complete.' }
  ];

  const auditLogsData = [];
  const sampleUsers = await prisma.user.findMany({ take: 60 });
  
  for (let logIdx = 1; logIdx <= 1020; logIdx++) {
    const actObj = actionsList[logIdx % actionsList.length];
    const u = sampleUsers[logIdx % sampleUsers.length];

    auditLogsData.push({
      userId: u.id,
      action: actObj.act,
      entity: actObj.ent,
      entityId: hospitals[0].id,
      ipAddress: ips[logIdx % ips.length],
      details: { message: actObj.details, code: `AUD-${logIdx}` },
      createdAt: new Date(Date.now() - (logIdx % 30) * 12 * 60 * 60 * 1000)
    });
  }

  await prisma.auditLog.createMany({
    data: auditLogsData
  });

  // 18. Seeding Patient Timeline logs
  console.log('📅 Seeding Patient Timeline logs...');
  const activePatients = await prisma.patient.findMany({ take: 40 });
  for (const pat of activePatients) {
    await prisma.patientTimeline.create({
      data: {
        patientId: pat.id,
        eventType: 'CLINICAL_ADMISSION',
        description: 'Instantiated hospital ward admission and primary doctor assignment.',
        metadata: { department: 'General Medicine' }
      }
    });

    await prisma.patientTimeline.create({
      data: {
        patientId: pat.id,
        eventType: 'DIAGNOSTICS_COMPLETED',
        description: 'Laboratory blood panels completed successfully.',
        metadata: { status: 'NORMAL' }
      }
    });
  }

  console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
}

main()
  .catch((e) => {
    console.error('❌ Error executing seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });