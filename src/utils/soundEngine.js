// Web Audio API Synthesizer for ESTELAR
// Generates all sounds procedurally. No external assets required.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    
    // Synths
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneGain = null;
    this.droneLFO = null;
    
    this.rumbleNode = null;
    this.rumbleFilter = null;
    this.rumbleGain = null;
    
    this.isInitialized = false;
    this.isMuted = false;
  }

  init() {
    if (this.isInitialized) return;
    
    // Create AudioContext
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    
    // Master Volume
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5; // Overall volume
    this.masterGain.connect(this.ctx.destination);
    
    this._initDrone();
    this._initRumble();
    
    this.isInitialized = true;
  }

  _initDrone() {
    // Hans Zimmer style Space Pipe Organ (Dark ambient chord)
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0; // Starts silent
    
    // Create a master filter for the organ to make it sound warm and huge
    const organFilter = this.ctx.createBiquadFilter();
    organFilter.type = 'lowpass';
    organFilter.frequency.value = 800;
    organFilter.Q.value = 2; // Slight resonance
    
    organFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    // Frequencies for a majestic A minor suspended ambient chord
    // A1 (pedal), A2, E3, A3, C4
    const frequencies = [55.00, 110.00, 164.81, 220.00, 261.63];
    const types = ['sine', 'triangle', 'square', 'sawtooth', 'sine'];
    const volumes = [0.6, 0.4, 0.1, 0.05, 0.15]; // Lower frequencies are louder

    this.organOscillators = [];
    
    frequencies.forEach((freq, index) => {
      // Main oscillator
      const osc = this.ctx.createOscillator();
      osc.type = types[index];
      osc.frequency.value = freq;
      
      const gain = this.ctx.createGain();
      gain.gain.value = volumes[index];
      
      osc.connect(gain);
      gain.connect(organFilter);
      osc.start();
      
      // Detuned clone for thick chorus effect (pipe organ style)
      const detunedOsc = this.ctx.createOscillator();
      detunedOsc.type = types[index];
      detunedOsc.frequency.value = freq + (Math.random() * 0.8 - 0.4); // slight drift
      
      const detunedGain = this.ctx.createGain();
      detunedGain.gain.value = volumes[index] * 0.8;
      
      detunedOsc.connect(detunedGain);
      detunedGain.connect(organFilter);
      detunedOsc.start();

      this.organOscillators.push(osc, detunedOsc);
    });
    
    // Slow LFO to modulate the filter frequency for a "breathing" cosmic effect
    this.droneLFO = this.ctx.createOscillator();
    this.droneLFO.type = 'sine';
    this.droneLFO.frequency.value = 0.05; // Very slow (20 seconds per cycle)
    
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 300; // Sweep filter from 500Hz to 1100Hz
    
    this.droneLFO.connect(lfoGain);
    lfoGain.connect(organFilter.frequency);
    
    this.droneLFO.start();
  }

  _initRumble() {
    // Gargantua Rumble (Filtered white noise)
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    this.rumbleNode = this.ctx.createBufferSource();
    this.rumbleNode.buffer = buffer;
    this.rumbleNode.loop = true;
    
    this.rumbleFilter = this.ctx.createBiquadFilter();
    this.rumbleFilter.type = 'lowpass';
    this.rumbleFilter.frequency.value = 100; // Deep rumble
    this.rumbleFilter.Q.value = 5; // Resonance for sci-fi feel
    
    this.rumbleGain = this.ctx.createGain();
    this.rumbleGain.gain.value = 0;
    
    this.rumbleNode.connect(this.rumbleFilter);
    this.rumbleFilter.connect(this.rumbleGain);
    this.rumbleGain.connect(this.masterGain);
    
    this.rumbleNode.start();
  }

  playUIHover() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playUIClick() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }
  
  playWarpJump() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    // Frequency sweeps up dramatically
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + 1.5);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2.0);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 2.0);
  }

  setDroneVolume(targetVol, transitionTime = 2) {
    if (!this.ctx || !this.droneGain) return;
    this.droneGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : targetVol, this.ctx.currentTime + transitionTime);
  }

  setDronePitch(bodyId, bodySize = 1) {
    if (!this.ctx || !this.droneOsc1 || !this.droneOsc2) return;
    
    // Default base frequencies
    let baseFreq = 55.0; // Low A
    
    // Modify based on the planet properties or ID
    if (bodyId === 'sun') {
      baseFreq = 32.7; // Ultra low C for massive bodies
    } else if (bodyId === 'gargantua') {
      baseFreq = 20.0; // Sub-bass, barely audible
    } else {
      // Map size to pitch: smaller bodies have slightly higher pitch
      // size ranges from ~0.06 (moon) to ~0.5 (jupiter)
      const sizeRatio = Math.max(0.05, Math.min(1.0, bodySize));
      // Inverse relation: smaller size = higher pitch
      baseFreq = 55.0 + (1.0 - sizeRatio) * 40.0; 
    }
    
    // Smoothly glide to the new pitch
    this.droneOsc1.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 2.0);
    this.droneOsc2.frequency.setTargetAtTime(baseFreq - 0.5, this.ctx.currentTime, 2.0);
  }

  setRumbleIntensity(intensity) {
    // Intensity 0 to 1
    if (!this.ctx || !this.rumbleGain) return;
    const safeIntensity = Math.max(0, Math.min(1, intensity));
    
    // Increase volume
    this.rumbleGain.gain.setTargetAtTime(this.isMuted ? 0 : (safeIntensity * 0.8), this.ctx.currentTime, 0.1);
    
    // Increase filter cutoff frequency to make it more aggressive
    const cutoff = 50 + safeIntensity * 400;
    this.rumbleFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.1);
  }

  mute() {
    this.isMuted = true;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  unmute() {
    this.isMuted = false;
    if (this.ctx && this.masterGain) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.masterGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.1);
    }
  }
}

// Export singleton instance
export const sound = new SoundEngine();
