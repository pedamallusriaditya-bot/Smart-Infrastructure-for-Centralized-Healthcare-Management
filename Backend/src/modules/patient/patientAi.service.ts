import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export class PatientAiService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      logger.warn("PatientAiService: GEMINI_API_KEY is not defined. AI assistant will run in fallback mock mode.");
    }
  }

  /**
   * Fetches context for the logged-in patient.
   */
  private async getPatientContext(userId: string) {
    const patient = await prisma.patient.findUnique({
      where: { userId },
      include: {
        user: {
          select: { email: true, district: true }
        }
      }
    });

    if (!patient) {
      throw new Error("Patient profile not found for this authenticated user.");
    }

    // 1. Fetch appointments
    const appointments = await prisma.appointment.findMany({
      where: { patientId: patient.id },
      orderBy: { appointmentDate: 'desc' },
      take: 5,
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialization: true,
            department: {
              select: {
                hospital: { select: { name: true } }
              }
            }
          }
        }
      }
    });

    // 2. Fetch prescriptions (medicines)
    const prescriptions = await prisma.prescription.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        doctor: {
          select: { firstName: true, lastName: true }
        },
        medicines: {
          include: {
            medicine: true
          }
        }
      }
    });

    // 3. Fetch lab orders and reports
    const labOrders = await prisma.labOrder.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        doctor: {
          select: { firstName: true, lastName: true }
        },
        report: true
      }
    });

    // 4. Fetch available doctors
    const doctors = await prisma.doctor.findMany({
      where: { approvalStatus: 'APPROVED' },
      include: {
        department: {
          select: {
            name: true,
            hospital: { select: { name: true, district: true } }
          }
        }
      },
      take: 10
    });

    // 5. Fetch hospitals list
    const hospitals = await prisma.hospital.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
        phone: true,
        district: true,
        state: true
      },
      take: 5
    });

    // 6. Fetch emergencies log
    const emergencies = await prisma.emergency.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        hospital: { select: { name: true } }
      }
    });

    return {
      patientInfo: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        district: patient.user?.district
      },
      appointments: appointments.map(a => ({
        id: a.id,
        date: a.appointmentDate,
        reason: a.reason,
        status: a.status,
        doctor: `Dr. ${a.doctor.firstName} ${a.doctor.lastName}`,
        specialization: a.doctor.specialization,
        hospital: a.doctor.department?.hospital?.name
      })),
      prescriptions: prescriptions.map(p => ({
        id: p.id,
        doctor: `Dr. ${p.doctor.firstName} ${p.doctor.lastName}`,
        status: p.status,
        medicines: p.medicines.map(m => ({
          name: m.medicine.name,
          quantity: m.quantity
        })),
        dosage: p.dosage,
        instructions: p.instructions,
        createdAt: p.createdAt
      })),
      labReports: labOrders.map(l => ({
        id: l.id,
        testName: l.testName,
        category: l.category,
        priority: l.priority,
        status: l.status,
        doctor: `Dr. ${l.doctor.firstName} ${l.doctor.lastName}`,
        isAbnormal: l.report?.isAbnormal || false,
        aiSummary: l.report?.aiSummary || null,
        results: l.report?.resultsData || null,
        createdAt: l.createdAt
      })),
      doctors: doctors.map(d => ({
        name: `Dr. ${d.firstName} ${d.lastName}`,
        specialization: d.specialization,
        department: d.department?.name,
        hospital: d.department?.hospital?.name,
        district: d.department?.hospital?.district
      })),
      hospitals,
      emergencies: emergencies.map(e => ({
        id: e.id,
        status: e.status,
        description: e.description,
        hospital: e.hospital?.name,
        createdAt: e.createdAt
      }))
    };
  }

  /**
   * Processes the chat message from the patient.
   */
  async processPatientChat(userId: string, message: string, language: string, history: ChatMessage[]) {
    // 1. Load context
    const context = await this.getPatientContext(userId);

    // 2. Generate response using Gemini (or fallback mock)
    let reply = "";
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: "gemini-1.5-flash"
        });

        const prompt = `
You are CareHive AI, a professional, compassionate Patient Portal Assistant. 
Supported Languages: English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali.
Your task is to answer patient's query using the provided Patient Profile & Medical Context.

Current Target Language for Reply: ${language} (You MUST translate and reply in ${language} automatically).

Patient Profile & Medical Context:
${JSON.stringify(context, null, 2)}

Instructions:
1. Provide accurate, helpful, and concise answers based on the patient's context.
2. If they ask about:
   - Appointments: Check the 'appointments' array and detail their date, doctor, and status.
   - Reports: Check the 'labReports' array, list the tests, status, and whether results are normal/abnormal.
   - Medicines: Check the 'prescriptions' array, describe the medicines prescribed, dosage, and intake instructions.
   - Emergency: Look for active emergencies in their profile. Inform them of hospital details or let them know to contact local responders or use the emergency QR code.
   - Doctors: Check 'doctors' array, guide them on specializations and facilities.
   - Hospital Info: Check 'hospitals' list, provide details about clinics, locations, phone numbers.
3. If they ask a general question outside these areas, politely explain that you can help with appointments, medical reports, prescriptions, emergency help, doctors list, and hospital info.
4. Keep the tone friendly, reassuring, and clear. Format output nicely in markdown (bullet points, bold text).
5. Crucial: ALWAYS write the final output in the requested language: ${language}. If the query is in English but the target language is Hindi, translate the response to Hindi.

Conversation History:
${history.map(h => `${h.role === 'user' ? 'Patient' : 'Assistant'}: ${h.content}`).join('\n')}
Patient: ${message}
Assistant:
`;

        const result = await model.generateContent(prompt);
        reply = result.response.text().trim();
      } catch (err: any) {
        logger.error("Gemini API call failed, switching to smart translation fallback:", err);
        reply = this.generateFallbackReply(message, language, context);
      }
    } else {
      reply = this.generateFallbackReply(message, language, context);
    }

    // 3. Log request inside AIRequest table for audits
    try {
      await prisma.aIRequest.create({
        data: {
          userId,
          prompt: message,
          response: reply,
          model: this.genAI ? "gemini-1.5-flash" : "fallback-rule-engine"
        }
      });
    } catch (dbErr) {
      logger.error("Failed to write to AIRequest log table:", dbErr);
    }

    return {
      reply,
      timestamp: new Date()
    };
  }

  /**
   * Generates localized fallback responses if Gemini is offline/unavailable.
   */
  private generateFallbackReply(message: string, language: string, context: any): string {
    const text = message.toLowerCase();
    let topic: 'appointments' | 'reports' | 'medicines' | 'emergency' | 'doctors' | 'hospitals' | 'general' = 'general';

    const appointmentKeywords = [
      'appointment', 'book', 'schedule', 
      'अपॉइंटमेंट', 'मिलने', 
      'అపాయింట్', 'బుక్', 
      'நியமன', 'பதிவு', 
      'ಅಪಾಯಿಂಟ್', 
      'അപ്പോയിന്റ്', 
      'अपॉइंटमेंट', 
      'অ্যাপয়েন্টমেন্ট'
    ];

    const reportKeywords = [
      'report', 'lab', 'test', 
      'रिपोर्ट', 'लैब', 'जांच', 
      'రిపోర్ట్', 'రిపోర్టు', 'ల్యాబ్', 'టెస్ట్', 
      'அறிக்கை', 'ஆய்வக', 'ரிப்போர்ட்', 
      'ವರದಿ', 'ಲ್ಯಾಬ್', 
      'റിപ്പോർട്ട്', 'ലാബ്', 
      'रिपोर्ट', 'लॅब', 
      'রিপোর্ট', 'ল্যাব'
    ];

    const medicineKeywords = [
      'medicine', 'prescription', 'drug', 'rx', 
      'दवा', 'परचा', 'औषध', 
      'మందులు', 'ప్రిస్క్రిప్షన్', 
      'மருந்து', 'பரிந்துரை', 
      'ಔಷಧಿ', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್', 
      'മരുന്ന്', 'പ്രിസ്ക്രിപ്ഷൻ', 
      'ಔಷಧ', 
      'ওষুধ', 'প্রেসক্রিপশন'
    ];

    const emergencyKeywords = [
      'emergency', 'ambulance', 'sos', 'er', 'danger', 
      'आपातकालीन', 'एम्बुलेंस', 'खतरा', 
      'అత్యవసర', 'అంబులెన్స్', 
      'அவசர', 'ஆம்புலன்ஸ்', 
      'ತುರ್ತು', 'ಆಂಬ್ಯುಲೆನ್ಸ್', 
      'അടിയന്തിര', 'ആംബുലൻസ്', 
      'आणीबाणी', 'रुग्णवाहिका', 
      'জরুরী', 'অ্যাম্বুলেন্স'
    ];

    const doctorKeywords = [
      'doctor', 'md', 'physician', 'specialist', 'dr', 
      'डॉक्टर', 'वैद्य', 
      'వైద్యుడు', 'డాక్టర్', 
      'மருத்துவர்', 'டாக்டர்', 
      'ವೈದ್ಯ', 'ಡಾಕ್ಟರ್', 
      'ഡോക്ടർ', 
      'डॉक्टर', 
      'ডাক্তার', 'চিকিৎসক'
    ];

    const hospitalKeywords = [
      'hospital', 'clinic', 'facility', 'location', 
      'अस्पताल', 'क्लिनिक', 
      'ఆసుపత్రి', 'క్లినిక్', 
      'மருத்துவமனை', 'கிளினிக்', 
      'ಆಸ್ಪತ್ರೆ', 'ಕ್ಲಿನಿಕ್', 
      'ಆಶുപത്രി', 
      'रुग्णालय', 
      'হাসপাতাল'
    ];

    if (appointmentKeywords.some(kw => text.includes(kw))) {
      topic = 'appointments';
    } else if (reportKeywords.some(kw => text.includes(kw))) {
      topic = 'reports';
    } else if (medicineKeywords.some(kw => text.includes(kw))) {
      topic = 'medicines';
    } else if (emergencyKeywords.some(kw => text.includes(kw))) {
      topic = 'emergency';
    } else if (doctorKeywords.some(kw => text.includes(kw))) {
      topic = 'doctors';
    } else if (hospitalKeywords.some(kw => text.includes(kw))) {
      topic = 'hospitals';
    }

    const patientName = `${context.patientInfo.firstName} ${context.patientInfo.lastName}`;

    // Simple multi-lingual rule engine response dictionary
    const responses: Record<string, Record<string, string>> = {
      English: {
        appointments: `Hello ${patientName}. You have ${context.appointments.length} appointments booked. \n${context.appointments.map((a: any) => `- **${a.doctor}** (${a.specialization}) on ${new Date(a.date).toLocaleString()} - Status: ${a.status}`).join('\n')}`,
        reports: `Hello ${patientName}. You have ${context.labReports.length} lab reports available. \n${context.labReports.map((l: any) => `- **${l.testName}** ordered by ${l.doctor}. Status: ${l.status}. Results abnormal: ${l.isAbnormal ? '🔴 Yes' : '🟢 No'}`).join('\n')}`,
        medicines: `Hello ${patientName}. Your prescriptions: \n${context.prescriptions.map((p: any) => `- Prescribed by ${p.doctor}: ${p.medicines.map((m: any) => m.name).join(', ')} - Dosage: ${p.dosage}. Status: ${p.status}`).join('\n')}`,
        emergency: `If you are in danger, please contact local emergency dispatch. Your registered location is Cupertino. You can also view your emergency QR code card on the profile page.`,
        doctors: `Here are available doctors: \n${context.doctors.map((d: any) => `- **${d.name}** (${d.specialization}) at ${d.hospital}`).join('\n')}`,
        hospitals: `Registered hospitals: \n${context.hospitals.map((h: any) => `- **${h.name}** in ${h.district} (${h.phone || 'No phone'})`).join('\n')}`,
        general: `Hello ${patientName}! I can assist you with your CareHive appointments, lab reports, prescribed medicines, doctor lookups, and hospital locations. How can I help you today?`
      },
      Hindi: {
        appointments: `नमस्ते ${patientName}। आपके ${context.appointments.length} अपॉइंटमेंट बुक हैं। \n${context.appointments.map((a: any) => `- **${a.doctor}** (${a.specialization}) दिनांक ${new Date(a.date).toLocaleDateString()} - स्थिति: ${a.status}`).join('\n')}`,
        reports: `नमस्ते ${patientName}। आपकी ${context.labReports.length} लैब रिपोर्ट उपलब्ध हैं। \n${context.labReports.map((l: any) => `- **${l.testName}** (${l.doctor} द्वारा)। स्थिति: ${l.status}. परिणाम असामान्य: ${l.isAbnormal ? '🔴 हाँ' : '🟢 नहीं'}`).join('\n')}`,
        medicines: `नमस्ते ${patientName}। आपकी दवाइयाँ: \n${context.prescriptions.map((p: any) => `- ${p.doctor} द्वारा निर्धारित: ${p.medicines.map((m: any) => m.name).join(', ')} - खुराक: ${p.dosage}`).join('\n')}`,
        emergency: `आपातकालीन स्थिति में, कृपया एम्बुलेंस या स्थानीय आपातकालीन सेवाओं से तुरंत संपर्क करें। आपकी पंजीकृत प्रोफ़ाइल Cupertino में है।`,
        doctors: `उपलब्ध डॉक्टर: \n${context.doctors.map((d: any) => `- **${d.name}** (${d.specialization}) अस्पताल: ${d.hospital}`).join('\n')}`,
        hospitals: `अस्पतालों की सूची: \n${context.hospitals.map((h: any) => `- **${h.name}** (${h.district}) - फोन: ${h.phone || 'उपलब्ध नहीं'}`).join('\n')}`,
        general: `नमस्ते ${patientName}! मैं आपकी CareHive नियुक्तियों, लैब रिपोर्ट, नुस्खे, डॉक्टरों और अस्पताल की जानकारी में मदद कर सकता हूँ। मैं आपकी क्या मदद करूँ?`
      },
      Telugu: {
        appointments: `నమస్తే ${patientName}. మీకు ${context.appointments.length} అపాయింట్‌మెంట్‌లు బుక్ చేయబడ్డాయి. \n${context.appointments.map((a: any) => `- **${a.doctor}** (${a.specialization}) తేదీ ${new Date(a.date).toLocaleDateString()} - స్థితి: ${a.status}`).join('\n')}`,
        reports: `నమస్తే ${patientName}. మీకు ${context.labReports.length} ల్యాబ్ రిపోర్టులు అందుబాటులో ఉన్నాయి. \n${context.labReports.map((l: any) => `- **${l.testName}** - డాక్టర్: ${l.doctor}. స్థితి: ${l.status}`).join('\n')}`,
        medicines: `నమస్తే ${patientName}. మీ ప్రిస్క్రిప్షన్లు: \n${context.prescriptions.map((p: any) => `- డాక్టర్ ${p.doctor} ఇచ్చినవి: ${p.medicines.map((m: any) => m.name).join(', ')}`).join('\n')}`,
        emergency: `అత్యవసర పరిస్థితిలో, దయచేసి స్థానిక అత్యవసర సేవలను లేదా అంబులెన్స్‌ను సంప్రదించండి. మీ ప్రొఫైల్ Cupertino లో ఉంది.`,
        doctors: `అందుబాటులో ఉన్న వైద్యులు: \n${context.doctors.map((d: any) => `- **${d.name}** (${d.specialization}) - ${d.hospital}`).join('\n')}`,
        hospitals: `ఆసుపత్రులు: \n${context.hospitals.map((h: any) => `- **${h.name}** (${h.district}) - ఫోన్: ${h.phone || 'లేదు'}`).join('\n')}`,
        general: `నమస్తే ${patientName}! అపాయింట్‌మెంట్‌లు, రిపోర్ట్‌లు, మందులు మరియు వైద్యుల వివరాల కోసం నేను మీకు సహాయం చేయగలను. మీకు ఏమి కావాలో అడగండి?`
      },
      Tamil: {
        appointments: `வணக்கம் ${patientName}. உங்களுக்கு ${context.appointments.length} நியமனங்கள் முன்பதிவு செய்யப்பட்டுள்ளன. \n${context.appointments.map((a: any) => `- **${a.doctor}** (${a.specialization}) தேதி ${new Date(a.date).toLocaleDateString()} - நிலை: ${a.status}`).join('\n')}`,
        reports: `வணக்கம் ${patientName}. உங்களுக்கு ${context.labReports.length} ஆய்வக அறிக்கைகள் உள்ளன. \n${context.labReports.map((l: any) => `- **${l.testName}** - மருத்துவர்: ${l.doctor}. நிலை: ${l.status}`).join('\n')}`,
        medicines: `வணக்கம் ${patientName}. உங்கள் மருந்துச்சீட்டுகள்: \n${context.prescriptions.map((p: any) => `- மருத்துவர் ${p.doctor} பரிந்துரைத்தது: ${p.medicines.map((m: any) => m.name).join(', ')}`).join('\n')}`,
        emergency: `அவசரகாலத்தில், தயவுசெய்து உள்ளூர் அவசர சேவைகளை அல்லது ஆம்புலன்ஸை தொடர்பு கொள்ளவும்.`,
        doctors: `கிடைக்கும் மருத்துவர்கள்: \n${context.doctors.map((d: any) => `- **${d.name}** (${d.specialization}) - ${d.hospital}`).join('\n')}`,
        hospitals: `மருத்துவமனைகள்: \n${context.hospitals.map((h: any) => `- **${h.name}** (${h.district}) - தொலைபேசி: ${h.phone || 'இல்லை'}`).join('\n')}`,
        general: `வணக்கம் ${patientName}! உங்கள் அப்பாயிண்ட்மெண்ட்கள், லேப் ரிப்போர்ட்டுகள், மருந்துச்சீட்டுகள் மற்றும் மருத்துவர்கள் விவரங்களுக்கு நான் உங்களுக்கு உதவ முடியும். உங்களுக்கு என்ன வேண்டும்?`
      },
      Kannada: {
        appointments: `ನಮಸ್ಕಾರ ${patientName}. ನಿಮ್ಮ ${context.appointments.length} ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ. \n${context.appointments.map((a: any) => `- **${a.doctor}** (${a.specialization}) ದಿನಾಂಕ ${new Date(a.date).toLocaleDateString()} - ಸ್ಥಿತಿ: ${a.status}`).join('\n')}`,
        reports: `ನಮಸ್ಕಾರ ${patientName}. ನಿಮ್ಮ ${context.labReports.length} ಲ್ಯಾಬ್ ವರದಿಗಳು ಲಭ್ಯವಿದೆ. \n${context.labReports.map((l: any) => `- **${l.testName}** - ವೈದ್ಯರು: ${l.doctor}. ಸ್ಥಿತಿ: ${l.status}`).join('\n')}`,
        medicines: `ನಮಸ್ಕಾರ ${patientName}. ನಿಮ್ಮ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ಗಳು: \n${context.prescriptions.map((p: any) => `- ವೈದ್ಯರು ${p.doctor} ಸೂಚಿಸಿದ್ದು: ${p.medicines.map((m: any) => m.name).join(', ')}`).join('\n')}`,
        emergency: `ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಲ್ಲಿ, ದಯವಿಟ್ಟು ಸ್ಥಳೀಯ ತುರ್ತು ಸೇವೆಗಳನ್ನು ಅಥವಾ ಅಂಬ್ಯುಲೆನ್ಸ್ ಸಂಪರ್ಕಿಸಿ.`,
        doctors: `ಲಭ್ಯವಿರುವ ವೈದ್ಯರು: \n${context.doctors.map((d: any) => `- **${d.name}** (${d.specialization}) - ${d.hospital}`).join('\n')}`,
        hospitals: `ಆಸ್ಪತ್ರೆಗಳು: \n${context.hospitals.map((h: any) => `- **${h.name}** (${h.district}) - ಫೋನ್: ${h.phone || 'ಇಲ್ಲ'}`).join('\n')}`,
        general: `ನಮಸ್ಕಾರ ${patientName}! ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳು, ವರದಿಗಳು, ಔಷಧಿಗಳು ಮತ್ತು ವೈದ್ಯರ ವಿವರಗಳಿಗಾಗಿ ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನಿಮಗೆ ಏನು ಸಹಾಯ ಬೇಕು?`
      },
      Malayalam: {
        appointments: `ഹലോ ${patientName}. നിങ്ങൾക്ക് ${context.appointments.length} അപ്പോയിന്റ്മെന്റുകൾ ബുക്ക് ചെയ്തിട്ടുണ്ട്. \n${context.appointments.map((a: any) => `- **${a.doctor}** (${a.specialization}) തീയതി ${new Date(a.date).toLocaleDateString()} - നില: ${a.status}`).join('\n')}`,
        reports: `ഹലോ ${patientName}. നിങ്ങൾക്ക് ${context.labReports.length} ലാബ് റിപ്പോർട്ടുകൾ ലഭ്യമാണ്. \n${context.labReports.map((l: any) => `- **${l.testName}** - ഡോക്ടർ: ${l.doctor}. നില: ${l.status}`).join('\n')}`,
        medicines: `ഹലോ ${patientName}. നിങ്ങളുടെ പ്രിസ്ക്രിപ്ഷനുകൾ: \n${context.prescriptions.map((p: any) => `- ഡോക്ടർ ${p.doctor} നിർദ്ദേശിച്ചത്: ${p.medicines.map((m: any) => m.name).join(', ')}`).join('\n')}`,
        emergency: `അടിയന്തിര സാഹചര്യങ്ങളിൽ, ദയവായി പ്രാദേശിക അടിയന്തിര സേവനങ്ങളെയോ ആംബുലൻസിനെയോ ബന്ധപ്പെടുക.`,
        doctors: `ലഭ്യമായ ഡോക്ടർമാർ: \n${context.doctors.map((d: any) => `- **${d.name}** (${d.specialization}) - ${d.hospital}`).join('\n')}`,
        hospitals: `ആശുപത്രികൾ: \n${context.hospitals.map((h: any) => `- **${h.name}** (${h.district}) - ഫോൺ: ${h.phone || 'ലഭ്യമല്ല'}`).join('\n')}`,
        general: `ഹലോ ${patientName}! അപ്പോയിന്റ്മെന്റുകൾ, റിപ്പോർട്ടുകൾ, മരുന്നുകൾ, ഡോക്ടർമാരുടെ വിവരങ്ങൾ എന്നിവയ്ക്ക് ഞാൻ സഹായിക്കാം. എന്താണ് നിങ്ങൾക്ക് അറിയേണ്ടത്?`
      },
      Marathi: {
        appointments: `नमस्कार ${patientName}. तुमचे ${context.appointments.length} अपॉइंटमेंट बुक आहेत. \n${context.appointments.map((a: any) => `- **${a.doctor}** (${a.specialization}) दिनांक ${new Date(a.date).toLocaleDateString()} - स्थिती: ${a.status}`).join('\n')}`,
        reports: `नमस्कार ${patientName}. तुमचे ${context.labReports.length} लॅब रिपोर्ट उपलब्ध आहेत. \n${context.labReports.map((l: any) => `- **${l.testName}** - डॉक्टर: ${l.doctor}. स्थिती: ${l.status}`).join('\n')}`,
        medicines: `नमस्कार ${patientName}. तुमची औषधपत्रे: \n${context.prescriptions.map((p: any) => `-  डॉक्टर ${p.doctor} यांनी लिहून दिलेले: ${p.medicines.map((m: any) => m.name).join(', ')}`).join('\n')}`,
        emergency: `आणीबाणीच्या प्रसंगी, कृपया स्थानिक आणीबाणी सेवा किंवा रुग्णवाहिकेशी संपर्क साधा.`,
        doctors: `उपलब्ध डॉक्टर: \n${context.doctors.map((d: any) => `- **${d.name}** (${d.specialization}) - ${d.hospital}`).join('\n')}`,
        hospitals: `रुग्णालये: \n${context.hospitals.map((h: any) => `- **${h.name}** (${h.district}) - फोन: ${h.phone || 'उपलब्ध नाही'}`).join('\n')}`,
        general: `नमस्कार ${patientName}! मी तुम्हाला तुमचे अपॉइंटमेंट, लॅब रिपोर्ट, औषधे, डॉक्टर आणि रुग्णालयाची माहिती मिळवून देण्यास मदत करू शकतो. मी तुमची काय मदत करू?`
      },
      Bengali: {
        appointments: `হ্যালো ${patientName}। আপনার ${context.appointments.length}টি অ্যাপয়েন্টমেন্ট বুক করা আছে। \n${context.appointments.map((a: any) => `- **${a.doctor}** (${a.specialization}) তারিখ ${new Date(a.date).toLocaleDateString()} - অবস্থা: ${a.status}`).join('\n')}`,
        reports: `হ্যালো ${patientName}। আপনার ${context.labReports.length}টি ল্যাব রিপোর্ট উপলব্ধ আছে। \n${context.labReports.map((l: any) => `- **${l.testName}** - ডাক্তার: ${l.doctor}. অবস্থা: ${l.status}`).join('\n')}`,
        medicines: `হ্যালো ${patientName}। আপনার প্রেসক্রিপশন: \n${context.prescriptions.map((p: any) => `- ডাক্তার ${p.doctor} দ্বারা নির্ধারিত: ${p.medicines.map((m: any) => m.name).join(', ')}`).join('\n')}`,
        emergency: `জরুরী পরিস্থিতিতে, দয়া করে স্থানীয় জরুরী পরিষেবা বা অ্যাম্বুলেন্সের সাথে যোগাযোগ করুন।`,
        doctors: `উপলব্ধ ডাক্তার: \n${context.doctors.map((d: any) => `- **${d.name}** (${d.specialization}) - ${d.hospital}`).join('\n')}`,
        hospitals: `নিবন্ধিত হাসপাতাল: \n${context.hospitals.map((h: any) => `- **${h.name}** (${h.district}) - ফোন: ${h.phone || 'নেই'}`).join('\n')}`,
        general: `হ্যালো ${patientName}! আমি আপনার অ্যাপয়েন্টমেন্ট, ল্যাব রিপোর্ট, প্রেসক্রিপশন এবং ডাক্তারদের বিবরণ পেতে সহায়তা করতে পারি। আমি আপনাকে কীভাবে সাহায্য করতে পারি?`
      }
    };

    // Default to target language dictionary, fallback to English general
    const langDict = responses[language] || responses['English'];
    return langDict[topic] || langDict['general'];
  }
}
