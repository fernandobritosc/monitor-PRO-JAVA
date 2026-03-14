/**
 * Utility to convert and compress audio files to MP3 in the browser.
 * Loads lamejs locally from /public/lame.min.js to bypass CSP and module issues.
 */
export class AudioConverter {
    private static async loadLameJs(): Promise<any> {
        // Se já carregado, retorna
        if ((window as any).lamejs) return (window as any).lamejs;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/lame.min.js'; // Caminho local (public folder)
            script.onload = () => {
                const lame = (window as any).lamejs;
                if (lame) {
                    // Shim mandatory globals for lamejs core
                    (window as any).MPEGMode = (window as any).MPEGMode || lame.MPEGMode;
                    (window as any).Lame = (window as any).Lame || lame.Lame;

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

                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const arrayBuffer = await file.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const channels = audioBuffer.numberOfChannels;
                const sampleRate = audioBuffer.sampleRate;
                const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, targetBitrate);
                const mp3Data: any[] = [];

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
                    if (mp3buf.length > 0) mp3Data.push(new Int8Array(mp3buf));
                }

                const mp3last = mp3encoder.flush();
                if (mp3last.length > 0) mp3Data.push(new Int8Array(mp3last));

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
