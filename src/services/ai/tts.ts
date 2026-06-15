import { GoogleGenAI } from "@google/genai";
import { supabase } from '../supabase';
import { decodeBase64, decodeAudioData, createWavFile } from './audio';
import { processAIError } from './errors';
import { logger } from '../../utils/logger';

export const handlePlayRevisionAudio = async (
  text: string,
  revisionId: string,
  apiKey: string,
  onStart: () => void,
  onEnd: () => void,
  onError: (err: string) => void
): Promise<() => void> => {
  let audioContext: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let htmlAudio: HTMLAudioElement | null = null;

  try {
    const fileName = `${revisionId}.wav`;
    const bucketName = 'audio-revisions';

    let cacheExists = false;
    try {
      const { data: listData } = await supabase.storage.from(bucketName).list('', { search: fileName });
      if (listData && listData.length > 0) cacheExists = true;
    } catch (e) { logger.warn('AI', 'Erro cache de áudio', { error: e }); }

    if (cacheExists) {
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      const publicUrl = publicUrlData?.publicUrl;
      if (publicUrl) {
        htmlAudio = new Audio(publicUrl);
        htmlAudio.onended = () => onEnd();
        onStart();
        htmlAudio.play().catch(e => onError("Erro reprodução cache."));
        return () => { if (htmlAudio) htmlAudio.pause(); };
      }
    }

    logger.info('AI', 'Áudio elite (v2.5 TTS)');
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text.substring(0, 4000) }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Kore'
            }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio generation failed");

    const AC: typeof AudioContext = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)!;
    audioContext = new AC({ sampleRate: 24000 });
    const audioBytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContext);
    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.onended = () => { onEnd(); audioContext?.close(); };
    onStart();
    source.start();

    (async () => {
      try {
        const wavBlob = createWavFile(new Int16Array(audioBytes.buffer), 24000);
        const { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, wavBlob, { contentType: 'audio/wav', upsert: true });

        if (uploadError) {
          logger.error('AI', 'Falha no salvamento do áudio no Supabase', { error: uploadError, file: fileName });
        } else {
          logger.info('AI', `Áudio sincronizado com o servidor: ${fileName}`);
        }
      } catch (e) {
        logger.error('AI', 'Erro na tarefa de background do áudio', { error: e });
      }
    })();

    return () => { if (source) source.stop(); if (audioContext) audioContext.close(); };
  } catch (error: unknown) {
    onError(processAIError(error, 'Gemini').message);
    onEnd();
    return () => { };
  }
};

export const deleteCachedAudio = async (revisionId: string) => {
  const bucketName = 'audio-revisions';
  try {
    await supabase.storage.from(bucketName).remove([`${revisionId}.wav`, `${revisionId}_podcast.wav`]);
  } catch (e) { }
};
