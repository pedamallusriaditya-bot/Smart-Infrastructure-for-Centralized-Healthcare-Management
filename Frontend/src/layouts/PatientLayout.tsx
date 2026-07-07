import React, { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import TopNavBar from '../components/layout/TopNavBar';
import { sendPatientChatMessage } from '../api/patient-ai.api';
import { Sparkles, X, MessageSquare, Send, Loader2 } from 'lucide-react';

const INTRO_MESSAGES: Record<string, string> = {
  English: "Hello! I am your CareHive AI assistant. How can I help you today with your appointments, medical reports, prescriptions, doctors, or hospital details?",
  Hindi: "नमस्ते! मैं आपका CareHive AI सहायक हूँ। आज मैं आपके अपॉइंटमेंट, लैब रिपोर्ट, दवाइयों, डॉक्टरों या अस्पताल के विवरण के बारे में क्या मदद कर सकता हूँ?",
  Telugu: "నమస్తే! నేను మీ CareHive AI సహాయకుడిని. అపాయింట్‌మెంట్‌లు, రిపోర్ట్‌లు, మందులు, వైద్యులు లేదా ఆసుపత్రి వివరాల గురించి ఈరోజు నేను మీకు ఎలా సహాయపడగలను?",
  Tamil: "வணக்கம்! நான் உங்கள் CareHive AI உதவியாளர். உங்கள் நியமனங்கள், மருத்துவ அறிக்கைகள், மருந்துகள், மருத்துவர்கள் அல்லது மருத்துவமனை விவரங்களுக்கு நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?",
  Kannada: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ CareHive AI ಸಹಾಯಕ. ಅಪಾಯಿంಟ್‌ಮೆಂಟ್‌ಗಳು, ವರದಿಗಳು, ಔಷಧಿಗಳು, ವೈದ್ಯರು ಅಥವಾ ಆಸ್ಪತ್ರೆ ವಿವರಗಳ ಕುರಿತು ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
  Malayalam: "ഹലോ! ഞാൻ നിങ്ങളുടെ CareHive AI അസിസ്റ്റന്റാണ്. നിങ്ങളുടെ അപ്പോയിന്റ്മെന്റുകൾ, ലാബ് റിപ്പോർട്ടുകൾ, മരുന്നുകൾ, ഡോക്ടർമാർ അല്ലെങ്കിൽ ആശുപത്രി വിവരങ്ങൾ എന്നിവയിൽ ഇന്ന് എനിക്ക് നിങ്ങളെ എങ്ങനെ സഹായിക്കാനാകും?",
  Marathi: "नमस्कार! मी तुमचा CareHive AI सहाय्यक आहे. आज मी तुम्हाला तुमचे अपॉइंटमेंट, लॅब रिपोर्ट, औषध, डॉक्टर किंवा रुग्णालयाच्या तपशीलांबद्दल कशी मदत करू शकतो?",
  Bengali: "হ্যালো! আমি আপনার CareHive AI সহকারী। আজ আমি আপনার অ্যাপয়েন্টমেন্ট, ল্যাব রিপোর্ট, ওষুধ, ডাক্তার বা হাসপাতালের বিবরণ সম্পর্কে কীভাবে সাহায্য করতে পারি?"
};

const SUGGESTIONS: Record<string, string[]> = {
  English: ["My Appointments", "My Prescriptions", "My Lab Reports", "Available Doctors", "Hospital Information"],
  Hindi: ["मेरे अपॉइंटमेंट", "मेरी दवाइयाँ", "मेरी लैब रिपोर्ट", "उपलब्ध डॉक्टर", "अस्पताल की जानकारी"],
  Telugu: ["నా అపాయింట్‌మెంట్‌లు", "నా మందులు", "నా ల్యాబ్ రిపోర్టులు", "అందుబాటులో ఉన్న వైద్యులు", "ఆసుపత్రి సమాచారం"],
  Tamil: ["என் நியமனங்கள்", "என் மருந்துகள்", "என் ஆய்வக அறிக்கைகள்", "கிடைக்கும் மருத்துவர்கள்", "மருத்துவமனை தகவல்"],
  Kannada: ["ನನ್ನ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳು", "ನನ್ನ ಔಷಧಿಗಳು", "ನನ್ನ ಲ್ಯಾಬ್ ವರದಿಗಳು", "ಲಭ್ಯವಿರುವ ವೈದ್ಯರು", "ಆಸ್ಪತ್ರೆ ಮಾಹಿತಿ"],
  Malayalam: ["എന്റെ അപ്പോയിന്റ്മെന്റുകൾ", "എന്റെ मരുന്നുകൾ", "എന്റെ ലാബ് റിപ്പോർട്ടുകൾ", "ലഭ്യമായ ഡോക്ടർമാർ", "ആശുപത്രി വിവരങ്ങൾ"],
  Marathi: ["माझे अपॉइंटमेंट", "माझी औषधे", "माझे लॅब रिपोर्ट्स", "उपलक्ष डॉक्टर", "रुग्णालयाची माहिती"],
  Bengali: ["আমার অ্যাপয়েন্টমেন্ট", "আমার ওষুধ", "আমার ল্যাব রিপোর্ট", "উপলব্ধ ডাক্তার", "হাসপাতাল তথ্য"]
};

const LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Hindi', label: 'हिन्दी' },
  { code: 'Telugu', label: 'తెలుగు' },
  { code: 'Tamil', label: 'தமிழ்' },
  { code: 'Kannada', label: 'ಕನ್ನಡ' },
  { code: 'Malayalam', label: 'മലയാളം' },
  { code: 'Marathi', label: 'मराठी' },
  { code: 'Bengali', label: 'বাংলা' }
];

const PatientLayout = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState('English');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'model'; content: string }>>([
    { role: 'model', content: INTRO_MESSAGES.English }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update welcome message on language change if it's the only message in history
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'model') {
      setMessages([{ role: 'model', content: INTRO_MESSAGES[language] || INTRO_MESSAGES.English }]);
    }
  }, [language]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    // Add user message to state
    const userMsg = { role: 'user' as const, content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Send chat to API (history includes preceding logs)
      const data = await sendPatientChatMessage(trimmed, language, messages);
      setMessages([...updatedMessages, { role: 'model', content: data.reply }]);
    } catch (err: any) {
      console.error(err);
      setMessages([
        ...updatedMessages,
        { role: 'model', content: "Sorry, I am having trouble connecting right now. Please check your connection and try again." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatMessageText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={idx} className="min-h-[1em] leading-relaxed">
          {parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-extrabold text-gray-900 dark:text-white">{part}</strong> : part))}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface relative">
      <TopNavBar />
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-xl space-y-xl">
        <Outlet />
      </main>
      <footer className="bg-surface dark:bg-surface-dim border-t border-outline-variant flex flex-col md:flex-row justify-between items-center w-full px-margin-desktop py-lg mt-auto">
        <div className="mb-md md:mb-0">
          <span className="font-label-lg text-label-lg font-bold text-on-surface">CareHive</span>
          <p className="font-label-md text-label-md text-secondary dark:text-secondary-fixed-dim mt-xs">© 2024 CareHive. All rights reserved.</p>
        </div>
        <div className="flex gap-xl">
          <a href="#" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            Privacy Policy
          </a>
          <a href="#" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            Terms of Service
          </a>
          <a href="#" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            Support
          </a>
        </div>
      </footer>

      {/* Floating Action Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 md:right-10 w-14 h-14 rounded-full bg-gradient-to-tr from-[#00488d] to-violet-600 hover:to-violet-700 text-white shadow-lg flex items-center justify-center cursor-pointer transition-all duration-300 transform hover:scale-105 active:scale-95 z-50 group"
        title="CareHive Multilingual Assistant"
      >
        {isOpen ? (
          <X className="w-6 h-6 transition-all duration-300 rotate-90" />
        ) : (
          <div className="relative">
            <MessageSquare className="w-6 h-6 transition-all duration-300" />
            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500"></span>
            </span>
          </div>
        )}
      </button>

      {/* Floating Chat Window Overlay */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 md:right-10 w-[90vw] sm:w-[420px] h-[520px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-250 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50 transition-all duration-300 animate-fadeIn">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#00488d] to-violet-600 p-4 text-white flex justify-between items-center select-none shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-sm tracking-tight leading-tight">CareHive AI Companion</h4>
                <p className="text-[9px] text-white/70 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-ping"></span>
                  Active Multilingual Agent
                </p>
              </div>
            </div>

            {/* Language Dropdown Selector */}
            <div className="flex items-center gap-1.5">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-2 py-1 text-xs font-bold text-white cursor-pointer focus:outline-none"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code} className="text-gray-800 bg-white font-medium">
                    {l.label}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/10 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 text-left text-xs bg-slate-50/50 dark:bg-slate-950/20">
            {messages.map((m, idx) => {
              const isAI = m.role === 'model';
              return (
                <div key={idx} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-3 shadow-2xs leading-relaxed transition-all ${
                    isAI 
                      ? 'bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-tl-none' 
                      : 'bg-[#00488d] text-white rounded-tr-none'
                  }`}>
                    {formatMessageText(m.content)}
                  </div>
                </div>
              );
            })}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded-2xl rounded-tl-none p-3 flex items-center gap-2 text-gray-500 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00488d]" />
                  <span>AI is compiling translation...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions scroll row */}
          <div className="px-4 py-2 border-t border-gray-100 bg-white dark:bg-slate-950 overflow-x-auto flex gap-1.5 scrollbar-thin select-none">
            {(SUGGESTIONS[language] || SUGGESTIONS.English).map((s) => (
              <button
                key={s}
                onClick={() => handleSendMessage(s)}
                disabled={loading}
                className="shrink-0 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-[10px] font-bold text-gray-600 dark:text-slate-300 px-3 py-1.5 rounded-full transition-all cursor-pointer disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Text Input Row */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="p-3 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask appointments, lab results, prescriptions..."
              className="flex-grow border border-gray-250 dark:border-slate-700 rounded-2xl px-3 py-2 text-xs focus:outline-none dark:bg-slate-800 dark:text-white"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-full bg-[#00488d] disabled:opacity-50 hover:bg-[#003c76] text-white flex items-center justify-center cursor-pointer transition-all shadow-sm shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PatientLayout;