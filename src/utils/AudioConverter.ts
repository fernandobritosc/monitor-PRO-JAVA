/**
 * Utility to convert and compress audio files to MP3 in the browser.
 * Loads lamejs locally from /public/lame.min.js to bypass CSP and module issues.
 */
interface LameJs {
  Mp3Encoder: new (channels: number, sampleRate: number, bitrate: number) => {
    encodeBuffer: (left: Int16Array, right: Int16Array) => Int8Array;
    flush: () => Int8Array;
  };
  MPEGMode: unknown;
  Lame: unknown;
}

const win = window as unknown as {
  lamejs?: LameJs;
  webkitAudioContext?: typeof AudioContext;
  MPEGMode?: unknown;
  Lame?: unknown;
};

export class AudioConverter {
    private static async loadLameJs(): Promise<LameJs> {
        // Se já carregado, retorna
        if (win.lamejs) return win.lamejs;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/lame.min.js'; // Caminho local (public folder)
            script.onload = () => {
                const lame = win.lamejs;
                if (lame) {
                    // Shim mandatory globals for lamejs core
                    win.MPEGMode = win.MPEGMode || lame.MPEGMode;
                    win.Lame = win.Lame || lame.Lame;

                    console.log("Lamejs carregado localmente com sucesso.");
                    resolve(lame);
                } else {
                    reject(new Error("lamejs não encontrado no objeto window"));
                }
            };
            script.onerror = () => reject(new Error("Falha ao carregar /lame.min.js - verifique se o arquivo está na pasta public"));
            document.head.appendChild(script);
        });
    }

    static async convertToMp3(file: File, targetBitrate: number = 64): Promise<File> {
        return new Promise(async (resolve, reject) => {
            try {
                const lamejs = await this.loadLameJs();

                const AC: typeof AudioContext = (window.AudioContext || win.webkitAudioContext)!;
                const audioContext = new AC();
                const arrayBuffer = await file.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const channels = audioBuffer.numberOfChannels;
                const sampleRate = audioBuffer.sampleRate;
                const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, targetBitrate);
                const mp3Data: ArrayBuffer[] = [];

                const samplesL = audioBuffer.getChannelData(0);
                const samplesR = channels > 1 ? audioBuffer.getChannelData(1) : samplesL;

                // Converte Float32 para Int16
                const floatToInt16 = (float32: Float32Array) => {
                    const int16 = new Int16Array(float32.length);
                    for (let i = 0; i < float32.length; i++) {
                        const s = Math.max(-1, Math.min(1, float32[i]));
                        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    return int16;
                };

                const int16L = floatToInt16(samplesL);
                const int16R = floatToInt16(samplesR);

                const sampleBlockSize = 1152;
                for (let i = 0; i < int16L.length; i += sampleBlockSize) {
                    const leftChunk = int16L.subarray(i, i + sampleBlockSize);
                    const rightChunk = int16R.subarray(i, i + sampleBlockSize);
                    const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
                    if (mp3buf.length > 0) mp3Data.push(new Int8Array(mp3buf).buffer);
                }

                const mp3last = mp3encoder.flush();
                if (mp3last.length > 0) mp3Data.push(new Int8Array(mp3last).buffer);

                const blob = new Blob(mp3Data, { type: 'audio/mp3' });
                const newName = file.name.replace(/\.[^/.]+$/, "") + ".mp3";

                await audioContext.close();
                resolve(new File([blob], newName, { type: 'audio/mp3' }));
            } catch (error) {
                console.error("Erro na conversão MP3:", error);
                reject(error);
            }
        });
    }
}
