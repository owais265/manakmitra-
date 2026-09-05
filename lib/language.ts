export const detectLanguage = (text: string): 'hi' | 'en' => {
  // Robust Devanagari block detection
  const hindiRegex = /[\u0900-\u097F\u1CD0-\u1CFF\uA8E0-\uA8FF]/;
  return hindiRegex.test(text) ? 'hi' : 'en';
};

export const UI_DICTIONARY = {
  en: {
    disclaimer: 'This information is based on official BIS documents. Please verify with BIS officials for legal matters.',
    instruction: 'Ask your question or describe your product...',
    micDenied: 'Microphone permission denied. Please allow it in your browser settings.',
    micUnsupported: 'Your browser does not support speech recognition. Please use Google Chrome.',
    micWaiting: 'Waiting for microphone permission...',
    errorServer: 'Sorry, there was an error connecting to the server.',
    welcomeTitle: 'Namaste! I am ManakMitra',
    welcomeDesc: 'BIS AI Assistant - Your guide to Indian Standards and Certification',
    thinking: 'ManakMitra is thinking...',
    sources: 'Sources',
    documents: 'documents',
    highConf: 'High Confidence (80-100% match)',
    medConf: 'Needs Verification (55-79% match)',
    lowConf: 'Insufficient Evidence (0-54% match)',
    followUp: 'Please provide these details:',
    contextHelper: 'Contextual Helper',
    relatedStandards: 'Related Standards',
    certRoadmap: 'Certification Roadmap',
    understandingPurity: 'Understanding Purity',
    huidLookup: 'HUID Lookup Tool',
    enterHuid: 'Enter 6-digit HUID',
    verifyJeweller: 'Verify Jeweller',
    quickLinks: 'Quick Links',
    recentChats: 'Recent Chats'
  },
  hi: {
    disclaimer: 'यह जानकारी आधिकारिक BIS दस्तावेज़ों पर आधारित है। कानूनी मामलों के लिए BIS अधिकारियों से सत्यापित करें।',
    instruction: 'अपना सवाल पूछें या प्रोडक्ट बताएं...',
    micDenied: 'माइक्रोफ़ोन की अनुमति अस्वीकार कर दी गई है। कृपया अपने ब्राउज़र में अनुमति दें।',
    micUnsupported: 'आपका ब्राउज़र स्पीच रिकग्निशन को सपोर्ट नहीं करता है। कृपया Google Chrome का उपयोग करें।',
    micWaiting: 'माइक्रोफ़ोन अनुमति की प्रतीक्षा की जा रही है...',
    errorServer: 'क्षमा करें, सर्वर से जुड़ने में त्रुटि हुई।',
    welcomeTitle: 'नमस्ते! मैं मानक-मित्र हूँ',
    welcomeDesc: 'BIS AI असिस्टेंट - भारतीय मानकों और प्रमाणन के लिए आपका मार्गदर्शक',
    thinking: 'मानक-मित्र सोच रहा है...',
    sources: 'स्रोत',
    documents: 'दस्तावेज़',
    highConf: 'उच्च विश्वास (80-100% मिलान)',
    medConf: 'सत्यापन आवश्यक (55-79% मिलान)',
    lowConf: 'अपर्याप्त साक्ष्य (0-54% मिलान)',
    followUp: 'कृपया ये विवरण बताएं:',
    contextHelper: 'प्रासंगिक सहायक (Contextual Helper)',
    relatedStandards: 'संबंधित मानक (Related Standards)',
    certRoadmap: 'प्रमाणन रोडमैप (Certification Roadmap)',
    understandingPurity: 'शुद्धता को समझना (Understanding Purity)',
    huidLookup: 'HUID लुकअप टूल',
    enterHuid: '6-अंकीय HUID दर्ज करें',
    verifyJeweller: 'ज्वैलर को सत्यापित करें',
    quickLinks: 'त्वरित लिंक (Quick Links)',
    recentChats: 'हाल की बातचीत (Recent Chats)'
  }
};

export const getUIDisclaimers = (lang: 'hi' | 'en'): string => {
  return UI_DICTIONARY[lang].disclaimer;
};

export const getUIInstructions = (lang: 'hi' | 'en'): string => {
  return UI_DICTIONARY[lang].instruction;
};

