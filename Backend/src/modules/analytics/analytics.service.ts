import { prisma } from '../../lib/prisma.js';
import { TestType, AvailabilityStatus } from '@prisma/client';
import { logger } from '../../lib/logger.js';

export class AnalyticsService {
  async getFootfallAnalytics() {
    // 1. Fetch all OPD (Appointments), IP (Admissions), and Emergency events from database
    const [appointments, admissions, emergencies] = await Promise.all([
      prisma.appointment.findMany({
        include: {
          doctor: {
            select: {
              firstName: true,
              lastName: true,
              department: {
                select: {
                  name: true,
                  hospital: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.admission.findMany({
        include: {
          bed: {
            select: {
              room: {
                select: {
                  hospital: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.emergency.findMany({
        include: {
          hospital: {
            select: { id: true, name: true }
          }
        }
      })
    ]);

    // 2. Normalize and extract visit events
    const visits: Array<{
      type: 'OPD' | 'IP' | 'Emergency';
      date: Date;
      hospitalId: string;
      hospitalName: string;
      departmentName: string;
      doctorName?: string;
    }> = [];

    // Process OPD (Appointments)
    for (const appt of appointments) {
      const hosp = appt.doctor?.department?.hospital;
      if (!hosp) continue;
      visits.push({
        type: 'OPD',
        date: new Date(appt.appointmentDate || appt.createdAt),
        hospitalId: hosp.id,
        hospitalName: hosp.name,
        departmentName: appt.doctor.department.name,
        doctorName: `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}`
      });
    }

    // Process IP (Admissions)
    for (const adm of admissions) {
      const hosp = adm.bed?.room?.hospital;
      if (!hosp) continue;
      visits.push({
        type: 'IP',
        date: new Date(adm.admissionDate),
        hospitalId: hosp.id,
        hospitalName: hosp.name,
        departmentName: 'Inpatient Ward'
      });
    }

    // Process Emergency
    for (const emg of emergencies) {
      const hosp = emg.hospital;
      if (!hosp) continue;
      visits.push({
        type: 'Emergency',
        date: new Date(emg.createdAt),
        hospitalId: hosp.id,
        hospitalName: hosp.name,
        departmentName: 'Emergency ER'
      });
    }

    // 3. Perform aggregations
    // A. Bins for Time-series (Hourly, Daily, Weekly, Monthly, Yearly)
    const hourlyBins = Array.from({ length: 24 }, (_, i) => ({
      label: `${String(i).padStart(2, '0')}:00`,
      count: 0,
      opd: 0,
      ip: 0,
      emergency: 0
    }));

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyBins = dayNames.map(name => ({
      label: name,
      count: 0,
      opd: 0,
      ip: 0,
      emergency: 0
    }));

    // Weekly bins (let's do last 4 weeks relative to now)
    const now = new Date();
    const weeklyBins = Array.from({ length: 4 }, (_, idx) => {
      const wStart = new Date(now.getTime() - (4 - idx) * 7 * 24 * 60 * 60 * 1000);
      const wEnd = new Date(now.getTime() - (3 - idx) * 7 * 24 * 60 * 60 * 1000);
      return {
        label: `Week of ${wStart.toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
        count: 0,
        opd: 0,
        ip: 0,
        emergency: 0,
        startMs: wStart.getTime(),
        endMs: wEnd.getTime()
      };
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyBins = monthNames.map(name => ({
      label: name,
      count: 0,
      opd: 0,
      ip: 0,
      emergency: 0
    }));

    // Grouping by years
    const yearlyMap: Record<string, { label: string; count: number; opd: number; ip: number; emergency: number }> = {};

    // Heatmap: Day of Week index (0-6) vs Hour of Day index (0-23)
    const heatmapGrid: Array<{ day: number; hour: number; count: number }> = [];
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        heatmapGrid.push({ day: d, hour: h, count: 0 });
      }
    }

    // Dimensions
    const hospitalMap: Record<string, { id: string; name: string; count: number; opd: number; ip: number; emergency: number }> = {};
    const departmentMap: Record<string, { name: string; count: number; opd: number; ip: number; emergency: number }> = {};
    const doctorMap: Record<string, { name: string; count: number }> = {};

    // 4. Fill bins
    for (const v of visits) {
      const visitHour = v.date.getHours();
      const visitDay = v.date.getDay();
      const visitMonth = v.date.getMonth();
      const visitYear = v.date.getFullYear().toString();

      // Hourly
      hourlyBins[visitHour].count++;
      if (v.type === 'OPD') hourlyBins[visitHour].opd++;
      else if (v.type === 'IP') hourlyBins[visitHour].ip++;
      else if (v.type === 'Emergency') hourlyBins[visitHour].emergency++;

      // Daily
      dailyBins[visitDay].count++;
      if (v.type === 'OPD') dailyBins[visitDay].opd++;
      else if (v.type === 'IP') dailyBins[visitDay].ip++;
      else if (v.type === 'Emergency') dailyBins[visitDay].emergency++;

      // Weekly
      const visitMs = v.date.getTime();
      for (const w of weeklyBins) {
        if (visitMs >= w.startMs && visitMs < w.endMs) {
          w.count++;
          if (v.type === 'OPD') w.opd++;
          else if (v.type === 'IP') w.ip++;
          else if (v.type === 'Emergency') w.emergency++;
        }
      }

      // Monthly
      monthlyBins[visitMonth].count++;
      if (v.type === 'OPD') monthlyBins[visitMonth].opd++;
      else if (v.type === 'IP') monthlyBins[visitMonth].ip++;
      else if (v.type === 'Emergency') monthlyBins[visitMonth].emergency++;

      // Yearly
      if (!yearlyMap[visitYear]) {
        yearlyMap[visitYear] = { label: visitYear, count: 0, opd: 0, ip: 0, emergency: 0 };
      }
      yearlyMap[visitYear].count++;
      if (v.type === 'OPD') yearlyMap[visitYear].opd++;
      else if (v.type === 'IP') yearlyMap[visitYear].ip++;
      else if (v.type === 'Emergency') yearlyMap[visitYear].emergency++;

      // Heatmap
      const cell = heatmapGrid.find(c => c.day === visitDay && c.hour === visitHour);
      if (cell) cell.count++;

      // Hospital
      if (!hospitalMap[v.hospitalId]) {
        hospitalMap[v.hospitalId] = { id: v.hospitalId, name: v.hospitalName, count: 0, opd: 0, ip: 0, emergency: 0 };
      }
      hospitalMap[v.hospitalId].count++;
      if (v.type === 'OPD') hospitalMap[v.hospitalId].opd++;
      else if (v.type === 'IP') hospitalMap[v.hospitalId].ip++;
      else if (v.type === 'Emergency') hospitalMap[v.hospitalId].emergency++;

      // Department
      if (!departmentMap[v.departmentName]) {
        departmentMap[v.departmentName] = { name: v.departmentName, count: 0, opd: 0, ip: 0, emergency: 0 };
      }
      departmentMap[v.departmentName].count++;
      if (v.type === 'OPD') departmentMap[v.departmentName].opd++;
      else if (v.type === 'IP') departmentMap[v.departmentName].ip++;
      else if (v.type === 'Emergency') departmentMap[v.departmentName].emergency++;

      // Doctor
      if (v.doctorName) {
        if (!doctorMap[v.doctorName]) {
          doctorMap[v.doctorName] = { name: v.doctorName, count: 0 };
        }
        doctorMap[v.doctorName].count++;
      }
    }

    // 5. Predict busy hours (Sort hourly bins by count descending and pick top 3)
    const sortedHours = [...hourlyBins]
      .map(b => ({ hour: b.label, count: b.count }))
      .sort((a, b) => b.count - a.count);

    const formatHourWindow = (hourStr: string) => {
      const hourVal = parseInt(hourStr.split(':')[0]);
      const nextHourVal = (hourVal + 1) % 24;
      const formatTime = (h: number) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formatted = h % 12 === 0 ? 12 : h % 12;
        return `${formatted}:00 ${ampm}`;
      };
      return `${formatTime(hourVal)} - ${formatTime(nextHourVal)}`;
    };

    const predictedBusyHours = sortedHours
      .slice(0, 3)
      .map(s => ({
        window: formatHourWindow(s.hour),
        load: s.count
      }));

    // If no load exists at all, default predictions
    if (predictedBusyHours.length === 0 || predictedBusyHours.every(h => h.load === 0)) {
      predictedBusyHours.length = 0;
      predictedBusyHours.push(
        { window: "09:00 AM - 10:00 AM", load: 0 },
        { window: "10:00 AM - 11:00 AM", load: 0 },
        { window: "02:00 PM - 03:00 PM", load: 0 }
      );
    }

    return {
      summary: {
        totalOPD: appointments.length,
        totalIP: admissions.length,
        totalEmergency: emergencies.length,
        totalVisits: visits.length
      },
      timeSeries: {
        hourly: hourlyBins,
        daily: dailyBins,
        weekly: weeklyBins.map(w => ({ label: w.label, count: w.count, opd: w.opd, ip: w.ip, emergency: w.emergency })),
        monthly: monthlyBins,
        yearly: Object.values(yearlyMap).sort((a, b) => a.label.localeCompare(b.label))
      },
      heatmap: heatmapGrid,
      busyHoursPrediction: predictedBusyHours,
      breakdowns: {
        hospital: Object.values(hospitalMap).sort((a, b) => b.count - a.count),
        department: Object.values(departmentMap).sort((a, b) => b.count - a.count),
        doctor: Object.values(doctorMap).sort((a, b) => b.count - a.count).slice(0, 5)
      }
    };
  }
}
