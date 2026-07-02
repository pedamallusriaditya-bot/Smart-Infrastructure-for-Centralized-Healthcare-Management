import { prisma } from '../lib/prisma.js';

export const getPatientTimeline = async (patientId: string) => {
  const appointments = await prisma.appointment.findMany({
    where: { patientId }
  });

  const prescriptions = await prisma.prescription.findMany({
    where: { patientId },
    include: {
      medicines: {
        include: {
          medicine: true
        }
      }
    }
  });

  const labTests = await prisma.labTest.findMany({
    where: { patientId }
  });

  const timelineEvents = [
    ...appointments.map((a) => ({
      id: a.id,
      type: "Appointment",
      date: a.appointmentDate,
      details: a.reason || "Routine Follow-up"
    })),

    ...prescriptions.map((p) => ({
      id: p.id,
      type: "Prescription",
      date: p.createdAt,
      details: p.medicines.length > 0
        ? `Prescribed: ${p.medicines
            .map((m) =>
              `${m.medicine.name} (${m.quantity})`
            )
            .join(", ")}`
        : "No medications listed"
    })),

    ...labTests.map((lab) => ({
      id: lab.id,
      type: "Lab Test",
      date: lab.createdAt,
      details: `${lab.testName} - ${lab.result ?? "Pending"}`
    }))
  ];

  return timelineEvents.sort(
    (a, b) =>
      new Date(a.date).getTime() -
      new Date(b.date).getTime()
  );
};