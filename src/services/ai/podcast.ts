import { GoogleGenAI } from "@google/genai";
import { supabase } from '../supabase';
import { decodeBase64, decodeAudioData, createWavFile } from './audio';
import { processAIError } from './errors';
import { logger } from '../../utils/logger';

export const generatePodcastAudio = async (
  originalText: string,
  referenceId: string,
  apiKey: string,
  onStatusChange: (status: string) => void,
  onStartAudio: () => void,
  onEndAudio: () => void,
  onError: (err: string) => void
): Promise<() => void> => {
  let audioContext: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;

  try {
    const fileName = `${referenceId}_podcast.wav`;
    const bucketName = 'audio-revisions';

    onStatusChange("Buscando cache...");
    const { data: listData } = await supabase.storage.from(bucketName).list('', { search: fileName });
    if (listData && listData.length > 0) {
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      if (publicUrlData?.publicUrl) {
        const htmlAudio = new Audio(publicUrlData.publicUrl);
        htmlAudio.onended = () => onEndAudio();
        onStartAudio();
        htmlAudio.play().catch(e => onError("Erro ao tocar podcast."));
        return () => { htmlAudio.pause(); };
      }
    }

    const ai = new GoogleGenAI({ apiKey });
    onStatusChange("Escrevendo roteiro...");
    const scriptPrompt = `Converta o seguinte texto em um diálogo de podcast curto entre Alex e Bia.Formato estrito: Alex: [fala] Bia: [fala].Texto: "${originalText.substring(0, 3000)}"`;
    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: scriptPrompt }] }]
    });
    const scriptText = scriptResponse.text || '';

    onStatusChange("Gravando Dual Podcast (Gemini 2.5 TTS)...");
    const audioResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Atue como locutor de podcast e diga o seguinte: ${scriptText.substring(0, 8000)}` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          languageCode: 'pt-BR',
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: 'Alex', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
              { speaker: 'Bia', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
            ]
          }
        }
      }
    });

    const base64Audio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Podcast generation failed");

    onStatusChange("Reproduzindo...");
    const AC: typeof AudioContext = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)!;
    audioContext = new AC({ sampleRate: 24000 });
    const audioBytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContext);
    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.onended = () => { onEndAudio(); audioContext?.close(); };
    onStartAudio();
    source.start();

    (async () => {
      try {
        const wavBlob = createWavFile(new Int16Array(audioBytes.buffer), 24000);
        const { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, wavBlob, { contentType: 'audio/wav', upsert: true });

        if (uploadError) {
          logger.error('AI', 'Falha no salvamento do podcast no Supabase', { error: uploadError, file: fileName });
        } else {
          logger.info('AI', `Podcast sincronizado com o servidor: ${fileName}`);
        }
      } catch (e) {
        logger.error('AI', 'Erro na tarefa de background do podcast', { error: e });
      }
    })();

    return () => { if (source) source.stop(); if (audioContext) audioContext.close(); };
  } catch (error: unknown) {
    onError(processAIError(error, 'Gemini').message);
    onEndAudio();
    return () => { };
  }
};
