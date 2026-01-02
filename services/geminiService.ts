
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

export const analyzeLectureAudio = async (base64Audio: string, mimeType: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Audio,
              mimeType: mimeType,
            },
          },
          {
            text: `
              Analyze this lecture audio for a concise, high-impact one-page summary.
              
              Task 1: Direct Wisdom Summary (Concise & Impactful)
              - Summarize the main points using a star (*) followed by a short, bold heading.
              - Directly under each heading, write the core message as a direct statement of fact or wisdom.
              - CRITICAL STYLE RULE: Never use meta-reporting phrases like "سخنران می‌گوید" (The speaker says) or "اشاره شد" (It was pointed out).
              - Keep it compact. The goal is to fit everything on a single A4 page. 
              - Focus on the essence.

              Task 2: Precise Podcast Curation
              - Identify 5-8 specific segments for a 10-minute continuous highlight.
              - Ensure each segment starts and ends at complete sentence boundaries.
              
              Task 3: Lecture Themes
              - Identify the core themes of the lecture.

              Respond strictly in Persian (Farsi).
              Return the result in JSON format.
            `,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullSummary: { type: Type.STRING },
          podcastSegments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                startTime: { type: Type.STRING },
                endTime: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                reasoning: { type: Type.STRING },
              },
              required: ["startTime", "endTime", "title", "description", "reasoning"],
            },
          },
          lectureThemes: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["fullSummary", "podcastSegments", "lectureThemes"],
      },
    },
  });

  return JSON.parse(response.text);
};

export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const parseTimeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
};

/**
 * Encodes an AudioBuffer to a 128kbps MP3 Blob using lamejs.
 */
export const audioBufferToMp3Blob = (buffer: AudioBuffer, bitrate: number = 128): Blob => {
  // @ts-ignore
  const mp3encoder = new lamejs.Mp3Encoder(buffer.numberOfChannels, buffer.sampleRate, bitrate);
  const mp3Data = [];
  
  const sampleSize = 1152; // LAME frame size
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;

  // Convert Float32 to Int16
  const convert = (samples: Float32Array) => {
    const int16 = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  };

  const leftInt16 = convert(left);
  const rightInt16 = convert(right);

  for (let i = 0; i < leftInt16.length; i += sampleSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleSize);
    const rightChunk = rightInt16.subarray(i, i + sampleSize);
    let mp3buf;
    if (buffer.numberOfChannels === 1) {
      mp3buf = mp3encoder.encodeMono(leftChunk);
    } else {
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    }
    if (mp3buf.length > 0) mp3Data.push(mp3buf);
  }

  const end = mp3encoder.flush();
  if (end.length > 0) mp3Data.push(end);

  return new Blob(mp3Data, { type: 'audio/mp3' });
};

export const audioBufferToWavBlob = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  const sampleRate = buffer.sampleRate;
  let offset = 0;

  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
    offset += s.length;
  };

  writeString('RIFF');
  view.setUint32(offset, length - 8, true); offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numOfChan, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * numOfChan * 2, true); offset += 4;
  view.setUint16(offset, numOfChan * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString('data');
  view.setUint32(offset, length - offset - 4, true); offset += 4;

  const channels = [];
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let index = 0;
  while (index < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][index]));
      sample = sample < 0 ? sample * 32768 : sample * 32767;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
    index++;
  }

  return new Blob([outBuffer], { type: 'audio/wav' });
};
