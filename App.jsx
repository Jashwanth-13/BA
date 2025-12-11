import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

function App() {
  const [gigs, setGigs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [listening, setListening] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  // Load gigs from localStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('gigs') || '[]');
    setGigs(saved);
  }, []);

  // Save gigs to localStorage
  useEffect(() => {
    localStorage.setItem('gigs', JSON.stringify(gigs));
  }, [gigs]);

  // ULTRA-SENSITIVE VOICE INIT
  const initVoice = useCallback(() => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.maxAlternatives = 3;
    recognitionRef.current.lang = 'en-IN';

    recognitionRef.current.onresult = (e) => {
      const finalResult = Array.from(e.results).find(r => r.isFinal)?.[0]?.transcript || 
                         e.results[e.results.length - 1][0].transcript;
      if (finalResult?.trim()) {
        setTranscript(finalResult);
      }
    };

    recognitionRef.current.onerror = (e) => {
      if (e.error === 'no-speech' && listening) {
        setTimeout(() => recognitionRef.current?.start(), 200);
      }
    };

    recognitionRef.current.onend = () => {
      if (listening) setTimeout(() => recognitionRef.current?.start(), 300);
    };
  }, [listening]);

  // Toggle Voice
  const toggleVoice = () => {
    if (!listening) {
      initVoice();
      recognitionRef.current?.start();
      setListening(true);
      speak("Namaste bhai! GigWorker full voice control ON! Gig post karo, book karo, services dekho!");
    } else {
      recognitionRef.current?.stop();
      setListening(false);
      speak("Voice OFF ho gaya!");
    }
  };

  // SPEAK
  const speak = (text) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;
    speechSynthesis.speak(utterance);
    
    setChatMessages(prev => [...prev.slice(-10), { sender: 'bot', text, time: new Date().toLocaleTimeString() }]);
  };

  // PROCESS ALL COMMANDS
  const processCommand = useCallback((cmd) => {
    console.log('🎤 Command:', cmd);

    // 1. SERVICES LIST (Dynamic from YOUR gigs)
    if (cmd.includes('service') || cmd.includes('kya') || cmd.includes('सर्विस')) {
      const services = [...new Set(gigs.map(g => g.workTitle))];
      const list = services.length 
        ? services.slice(0, 5).map(s => s).join(', ')
        : 'No services yet';
      speak(`Available: ${list}. Kahiye "${services[0]?.toLowerCase()} book karo"`);
      return;
    }

    // 2. BOOK SERVICE (Dynamic)
    const serviceKeywords = {
      plumber: ['plumber', 'प्लंबर', 'pipe', 'leak', 'tap', 'नल'],
      electrician: ['electrician', 'इलेक्ट्रीशियन', 'fuse', 'light', 'fan', 'बिजली'],
      painter: ['painter', 'पेंटर', 'paint', 'रंग']
    };

    for (const [service, keywords] of Object.entries(serviceKeywords)) {
      if (keywords.some(kw => cmd.includes(kw))) {
        const existing = gigs.find(g => g.workTitle.toLowerCase().includes(service));
        const newGig = {
          id: Date.now(),
          workTitle: service.charAt(0).toUpperCase() + service.slice(1),
          name: 'Voice Customer',
          mobile: `98${Math.floor(1000000 + Math.random() * 9000000)}`,
          wage: existing?.wage || 500,
          time: 'Kal Subah 9 AM',
          workersRequired: 1,
          currentWorkers: 0,
          location: existing?.location || 'Customer Location'
        };
        setGigs(prev => [newGig, ...prev]);
        speak(`${service} book ho gaya! ₹${newGig.wage}`);
        document.getElementById('gigsList')?.scrollIntoView();
        return;
      }
    }

    // 3. POST GIG FORM
    if (cmd.includes('post') || cmd.includes('gig') || cmd.includes('daalo') || cmd.includes('form')) {
      setShowForm(true);
      document.getElementById('gigForm')?.scrollIntoView();
      speak('Gig form khol diya!');
      return;
    }

    // 4. SHOW GIGS
    if (cmd.includes('gigs') || cmd.includes('show') || cmd.includes('dikhao')) {
      document.getElementById('gigsList')?.scrollIntoView();
      speak(`${gigs.length} gigs hain!`);
      return;
    }

    // 5. DELETE LAST
    if (cmd.includes('delete') || cmd.includes('हटाओ')) {
      if (gigs.length > 0) {
        const newGigs = gigs.slice(0, -1);
        setGigs(newGigs);
        speak('Last gig delete!');
      }
      return;
    }

    // 6. GREETING
    if (cmd.includes('hello') || cmd.includes('hi') || cmd.includes('नमस्ते')) {
      speak(`Namaste! ${gigs.length} gigs active. Boliye: services, post gig, plumber book!`);
      return;
    }

    // FALLBACK
    speak('Samajh nahi aaya. Kahiye: services dikhao, post gig, plumber book karo!');
  }, [gigs]);

  // TRANSCRIPT HANDLER
  useEffect(() => {
    if (transcript) {
      processCommand(transcript);
      setTranscript('');
    }
  }, [transcript, processCommand]);

  // MANUAL POST GIG
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const gig = {
      id: Date.now(),
      workTitle: formData.get('workTitle'),
      name: formData.get('name'),
      mobile: formData.get('mobile'),
      wage: parseInt(formData.get('wage')),
      time: formData.get('time'),
      workersRequired: 1,
      currentWorkers: 0
    };
    setGigs(prev => [gig, ...prev]);
    setShowForm(false);
    speak('Gig post ho gaya!');
  };

  return (
    <div style={{ padding: 40, maxWidth: 800, margin: '0 auto' }}>
      {/* BIG VOICE BUTTON */}
      <div 
        style={{
          position: 'fixed',
          top: 30,
          right: 30,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: listening ? '#ff4444' : '#4CAF50',
          border: '5px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          cursor: 'pointer',
          boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
          zIndex: 1000
        }}
        onClick={toggleVoice}
      >
        {listening ? '🔴' : '🎤'}
      </div>

      {/* STATUS */}
      {listening && (
        <div style={{
          position: 'fixed',
          top: 130,
          right: 30,
          background: 'rgba(255,0,0,0.9)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: 30,
          fontWeight: 'bold',
          animation: 'pulse 1.5s infinite',
          zIndex: 999
        }}>
          🎙️ LIVE Listening...
        </div>
      )}

      <h1 style={{ textAlign: 'center', marginBottom: 40, fontSize: '3em' }}>
        🎯 GigWorker Voice App
      </h1>

      {/* CHAT */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 25,
        marginBottom: 30,
        maxHeight: 300,
        overflowY: 'auto',
        backdropFilter: 'blur(10px)'
      }}>
        <h3>💬 Voice Chat</h3>
        {chatMessages.slice(-8).map((msg, i) => (
          <div key={i} style={{
            padding: 12,
            margin: 8,
            borderRadius: 15,
            background: msg.sender === 'bot' ? 'rgba(255,255,255,0.2)' : '#4CAF50',
            color: msg.sender === 'bot' ? 'white' : 'white'
          }}>
            <strong>{msg.sender === 'bot' ? '🤖 Bot' : '👤 You'}:</strong> {msg.text}
          </div>
        ))}
      </div>

      {/* POST GIG FORM */}
      {showForm && (
        <div id="gigForm" style={{
          background: 'rgba(255,255,255,0.15)',
          padding: 30,
          borderRadius: 20,
          marginBottom: 30,
          backdropFilter: 'blur(10px)'
        }}>
          <h2>📝 Post New Gig</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 15 }}>
            <input name="name" placeholder="👤 Name" required style={{ padding: 15, borderRadius: 10, border: 'none' }} />
            <input name="mobile" placeholder="📱 Mobile" required style={{ padding: 15, borderRadius: 10, border: 'none' }} />
            <input name="workTitle" placeholder="💼 Service (Plumber)" required style={{ padding: 15, borderRadius: 10, border: 'none' }} />
            <input name="wage" type="number" placeholder="💰 ₹500" required style={{ padding: 15, borderRadius: 10, border: 'none' }} />
            <input name="time" placeholder="🕒 Kal Subah" required style={{ padding: 15, borderRadius: 10, border: 'none' }} />
            <button type="submit" style={{ padding: 18, background: '#4CAF50', color: 'white', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 'bold' }}>
              🚀 Post Gig
            </button>
          </form>
        </div>
      )}

      {/* GIGS LIST */}
      <div id="gigsList" style={{
        background: 'rgba(255,255,255,0.15)',
        padding: 30,
        borderRadius: 20,
        backdropFilter: 'blur(10px)'
      }}>
        <h2>📋 All Gigs ({gigs.length})</h2>
        {gigs.length === 0 ? (
          <p style={{ textAlign: 'center', opacity: 0.7 }}>No gigs yet. Voice bolo: "plumber book karo"!</p>
        ) : (
          gigs.slice(0, 10).map(gig => (
            <div key={gig.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 20,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 15,
              margin: 10,
              backdropFilter: 'blur(5px)'
            }}>
              <div>
                <h3>{gig.workTitle}</h3>
                <p>{gig.name} | ₹{gig.wage} | {gig.time}</p>
              </div>
              <button 
                onClick={() => {
                  setGigs(gigs.filter(g => g.id !== gig.id));
                  speak('Gig delete!');
                }}
                style={{
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 10,
                  cursor: 'pointer'
                }}
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      <div style={{
        textAlign: 'center',
        padding: 30,
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        marginTop: 30
      }}>
        💡 <strong>Voice Commands:</strong> "services dikhao" | "plumber book karo" | "post gig" | "gigs show karo" | "delete"
      </div>
    </div>
  );
}

export default App;
