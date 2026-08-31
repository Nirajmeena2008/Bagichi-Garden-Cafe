export function pcmToBase64(pcmData: Float32Array): string {
  const buffer = new ArrayBuffer(pcmData.length * 2);
  const view = new DataView(buffer);
  
  for (let i = 0; i < pcmData.length; i++) {
    const s = Math.max(-1, Math.min(1, pcmData[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true); // little-endian
  }
  
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToPcm(base64: string): Float32Array {
  const binary = atob(base64);
  const len = binary.length;
  const buffer = new ArrayBuffer(len);
  const view = new DataView(buffer);
  
  for (let i = 0; i < len; i++) {
    view.setUint8(i, binary.charCodeAt(i));
  }
  
  const pcmLength = len / 2;
  const pcmData = new Float32Array(pcmLength);
  for (let i = 0; i < pcmLength; i++) {
    const s = view.getInt16(i * 2, true);
    pcmData[i] = s / (s < 0 ? 0x8000 : 0x7FFF);
  }
  return pcmData;
}
