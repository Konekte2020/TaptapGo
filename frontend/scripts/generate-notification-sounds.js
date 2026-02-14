/**
 * Génère 5 petits fichiers WAV pour les notifications (sons locaux).
 * À exécuter une fois : node scripts/generate-notification-sounds.js
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'sounds');

function createWav(samples, sampleRate = 44100) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * 2; // 16 bit = 2 bytes per sample
  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(36 + dataSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // subchunk1size
  buffer.writeUInt16LE(1, offset); offset += 2;  // PCM
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-32768, Math.min(32767, Math.floor(samples[i] * 32767)));
    buffer.writeInt16LE(s, offset);
    offset += 2;
  }
  return buffer;
}

function tone(freq, durationSec, sampleRate = 44100) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const samples = [];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-3 * t / durationSec); // fade out
    samples.push(0.3 * Math.sin(2 * Math.PI * freq * t) * envelope);
  }
  return samples;
}

const sounds = [
  { name: 'beep1', freq: 880, dur: 0.15 },
  { name: 'beep2', freq: 660, dur: 0.2 },
  { name: 'beep3', freq: 523, dur: 0.25 },
  { name: 'beep4', freq: 440, dur: 0.1 },
  { name: 'beep5', freq: 988, dur: 0.2 },
];

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

sounds.forEach(({ name, freq, dur }) => {
  const samples = tone(freq, dur);
  const wav = createWav(samples);
  fs.writeFileSync(path.join(OUT_DIR, `${name}.wav`), wav);
  console.log('Created', name + '.wav');
});

console.log('Done. 5 sounds in assets/sounds/');
