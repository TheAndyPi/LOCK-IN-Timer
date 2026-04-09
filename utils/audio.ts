// Dissonant alarm to ensure discomfort
let audioContext: AudioContext | null = null;
let osc1: OscillatorNode | null = null;
let osc2: OscillatorNode | null = null;
let gainNode: GainNode | null = null;

const initAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
};

export const playAlarm = () => {
  initAudio();
  if (!audioContext) return;
  if (osc1) return; // Already playing

  // Create gain node
  gainNode = audioContext.createGain();
  gainNode.gain.value = 0.8; // Loud but not clipping
  gainNode.connect(audioContext.destination);

  const now = audioContext.currentTime;

  // Oscillator 1: The "Root" Siren
  osc1 = audioContext.createOscillator();
  osc1.type = 'sawtooth'; // Harsh tone
  osc1.frequency.setValueAtTime(500, now);
  // Fast modulation
  osc1.frequency.linearRampToValueAtTime(1000, now + 0.2);
  osc1.frequency.linearRampToValueAtTime(500, now + 0.4);
  
  // Oscillator 2: The "Dissonant" Interval (Tritone-ish) to create anxiety
  osc2 = audioContext.createOscillator();
  osc2.type = 'square'; // Very harsh chiptune-like tone
  osc2.frequency.setValueAtTime(725, now); // ~F#5 (Tritone from C5 approx)
  // Counter-modulation
  osc2.frequency.linearRampToValueAtTime(300, now + 0.2);
  osc2.frequency.linearRampToValueAtTime(725, now + 0.4);

  // LFO to drive the loop of both frequencies
  const lfo = audioContext.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 5; // 5Hz fast siren
  
  // Connect LFO to frequency parameters implies manual looping for Web Audio or simpler approach:
  // For simplicity and browser compatibility without complex graph, we use a looped buffer or just rely on the effect.
  // Actually, let's just use the LFO to gate the volume for a "stutter" effect which is annoying.
  
  const stutter = audioContext.createGain();
  stutter.gain.setValueAtTime(1, now);
  // We will just let the raw oscillators screech. The linearRamp above only happens once.
  // To make it loop, we need to set specific periodic waves or use an LFO connected to frequency.
  
  // Resetting to a simpler, reliable screeching LFO driven setup:
  
  // Re-configure Osc1
  osc1.disconnect();
  osc1 = audioContext.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.value = 800;
  
  // Re-configure Osc2
  osc2.disconnect();
  osc2 = audioContext.createOscillator();
  osc2.type = 'square';
  osc2.frequency.value = 1200; // Dissonant

  // Modulator
  const mod = audioContext.createOscillator();
  mod.type = 'sawtooth';
  mod.frequency.value = 8; // 8Hz modulation (very fast)
  
  const modGain = audioContext.createGain();
  modGain.gain.value = 500; // Swing range
  
  mod.connect(modGain);
  modGain.connect(osc1.frequency);
  modGain.connect(osc2.frequency);
  
  mod.start();
  osc1.start();
  osc2.start();
  
  osc1.connect(gainNode);
  osc2.connect(gainNode);

  // Store references to stop later (we need to stop the modulator too, but for simplicity of cleanup...)
  // We'll attach the mod to the osc1 object to clean it up
  (osc1 as any)._mod = mod;
};

export const stopAlarm = () => {
  if (osc1) {
    try {
      if ((osc1 as any)._mod) (osc1 as any)._mod.stop();
      osc1.stop();
      osc1.disconnect();
    } catch (e) { console.error(e); }
    osc1 = null;
  }
  if (osc2) {
    try {
      osc2.stop();
      osc2.disconnect();
    } catch (e) { console.error(e); }
    osc2 = null;
  }
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
};

export const playSuccessChime = () => {
  initAudio();
  if (!audioContext) return;
  const now = audioContext.currentTime;
  
  // Pleasant Major Arpeggio (C Majorish)
  // C5, E5, G5, C6
  const notes = [523.25, 659.25, 783.99, 1046.50]; 
  
  notes.forEach((freq, i) => {
      const osc = audioContext!.createOscillator();
      const gain = audioContext!.createGain();
      
      osc.type = 'sine'; // Pure tone
      osc.frequency.value = freq;
      
      // Envelope
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 1.5);
      
      osc.connect(gain);
      gain.connect(audioContext!.destination);
      
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 1.6);
  });
};

export const playBreakEndChime = () => {
    initAudio();
    if (!audioContext) return;
    const now = audioContext.currentTime;
    
    // Alert but not painful. A distinct interval. A4 -> A5.
    const notes = [440, 880];
    
    notes.forEach((freq, i) => {
      const osc = audioContext!.createOscillator();
      const gain = audioContext!.createGain();
      
      osc.type = 'triangle'; // Slightly richer than sine
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, now + i * 0.2);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.2 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.8);
      
      osc.connect(gain);
      gain.connect(audioContext!.destination);
      
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.9);
  });
};