// Sons de notification générés dans le navigateur (aucun fichier). Jouent quand l'app est ouverte.
let AC: AudioContext | null = null;
function ctx() {
  try {
    if (!AC) { const C: any = (window as any).AudioContext || (window as any).webkitAudioContext; if (!C) return null; AC = new C(); }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  } catch { return null; }
}
function tone(c: AudioContext, t: number, f: number, dur: number, type: OscillatorType, vol: number, out: AudioNode) {
  const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
}
function bell(c: AudioContext, t: number, f: number, dur: number, vol: number, out: AudioNode) {
  tone(c, t, f, dur, 'sine', vol, out); tone(c, t, f * 2.76, dur * 0.45, 'sine', vol * 0.32, out); tone(c, t, f * 5.4, dur * 0.2, 'sine', vol * 0.14, out);
}
function noise(c: AudioContext, t: number, dur: number, vol: number, out: AudioNode, hp: number) {
  const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(out); s.start(t);
}
function drum(c: AudioContext, t: number, f0: number, f1: number, dur: number, vol: number, out: AudioNode) {
  const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
}
export const SOUNDS: Record<string, { label: string; len: number; play: (c: AudioContext, t: number, o: AudioNode) => void }> = {
  tching: { label: 'Tching ! (Zelvo)', len: 1.1, play: (c, t, o) => { noise(c, t, 0.05, 0.7, o, 5000); bell(c, t + 0.05, 2349, 0.9, 0.26, o); bell(c, t + 0.05, 3520, 0.6, 0.12, o); noise(c, t + 0.22, 0.04, 0.45, o, 6000); bell(c, t + 0.26, 3136, 1, 0.24, o); bell(c, t + 0.26, 4186, 0.7, 0.1, o); } },
  cloche: { label: 'Cloche', len: 1.2, play: (c, t, o) => [1046.5, 1318.5, 1568, 2093].forEach((f, i) => bell(c, t + i * 0.11, f, 0.9, 0.22, o)) },
  retro: { label: 'Caisse rétro', len: 1.5, play: (c, t, o) => { [0, 0.07, 0.14].forEach((d) => noise(c, t + d, 0.035, 0.6, o, 3000)); drum(c, t + 0.24, 180, 70, 0.12, 0.5, o); noise(c, t + 0.26, 0.28, 0.25, o, 1200); bell(c, t + 0.3, 2093, 1.1, 0.3, o); bell(c, t + 0.3, 2637, 0.9, 0.16, o); } },
  pieces: { label: 'Pluie de pièces', len: 1.4, play: (c, t, o) => { [0, 0.09, 0.16, 0.25, 0.31, 0.4, 0.46, 0.55].forEach((d, i) => { const f = [3951, 4186, 3729, 4435, 3520, 4699, 3951, 4186][i]; tone(c, t + d, f, 0.25, 'sine', 0.16, o); tone(c, t + d, f * 1.5, 0.12, 'sine', 0.06, o); noise(c, t + d, 0.02, 0.25, o, 7000); }); bell(c, t + 0.7, 2637, 0.7, 0.2, o); } },
  caisse: { label: 'Caisse', len: 1.2, play: (c, t, o) => { noise(c, t, 0.08, 0.55, o, 2500); noise(c, t + 0.1, 0.14, 0.45, o, 4200); bell(c, t + 0.17, 2637, 1, 0.24, o); bell(c, t + 0.17, 3136, 1, 0.14, o); } },
  djembe: { label: 'Djembé', len: 1.4, play: (c, t, o) => { drum(c, t, 220, 90, 0.35, 0.9, o); drum(c, t + 0.16, 330, 170, 0.18, 0.6, o); drum(c, t + 0.27, 330, 170, 0.18, 0.6, o); drum(c, t + 0.42, 220, 90, 0.4, 0.9, o); bell(c, t + 0.62, 1568, 0.8, 0.2, o); } },
  kora: { label: 'Kora', len: 1.1, play: (c, t, o) => [523.25, 659.25, 784, 1046.5, 1318.5].forEach((f, i) => { tone(c, t + i * 0.09, f, 0.7, 'triangle', 0.24, o); tone(c, t + i * 0.09, f * 2, 0.35, 'sine', 0.07, o); }) },
};
export function playSound(key: string, times = 1) {
  const c = ctx(); const s = SOUNDS[key]; if (!c || !s) return;
  const out = c.createGain(); out.gain.value = 0.9; out.connect(c.destination);
  const t = c.currentTime + 0.03;
  for (let i = 0; i < times; i++) s.play(c, t + i * (s.len + 0.25), out);
}
export function getPref<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }
export function setPref(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
