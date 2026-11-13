// audio helper functions

export function createWavBlob(samples, sampleRate) {
  // Debug: check waveform statistics
  let min = Infinity, max = -Infinity, sum = 0, nonZero = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += Math.abs(v);
    if (Math.abs(v) > 0.001) nonZero++;
  }
  console.log('WAV input stats:', {
    length: samples.length,
    min: min.toFixed(6),
    max: max.toFixed(6),
    avgAbs: (sum / samples.length).toFixed(6),
    nonZeroSamples: nonZero,
    percentNonZero: ((nonZero / samples.length) * 100).toFixed(1) + '%'
  });

  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// Test function to verify WAV creation works
export function createTestToneBlob(durationSec = 1, frequency = 440, sampleRate = 24000) {
  const numSamples = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    samples[i] = 0.5 * Math.sin(2 * Math.PI * frequency * i / sampleRate);
  }
  return createWavBlob(samples, sampleRate);
}
