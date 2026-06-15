import { logger } from '../../utils/logger';

export const parseAIJSON = <T>(jsonString: string): T => {
  try {
    const startIdx = Math.min(
      jsonString.indexOf('[') !== -1 ? jsonString.indexOf('[') : Infinity,
      jsonString.indexOf('{') !== -1 ? jsonString.indexOf('{') : Infinity
    );
    const endIdx = Math.max(
      jsonString.lastIndexOf(']'),
      jsonString.lastIndexOf('}')
    );

    if (startIdx === Infinity || endIdx === -1 || endIdx < startIdx) {
      throw new Error("Nenhum bloco JSON encontrado na resposta da IA.");
    }

    let cleaned = jsonString.substring(startIdx, endIdx + 1).trim();
    cleaned = cleaned.replace(/```(json)?/g, '').replace(/```/g, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      logger.warn('AI', 'JSON Parse inicial falhou, tentando reparo...');
    }

    cleaned = cleaned.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, "");
    cleaned = cleaned.replace(/(?<!\\)\\(?![\\/"bfnrtu])/g, "\\\\");

    const closeTruncatedJson = (str: string): string => {
      const stack: ("{" | "[")[] = [];
      let inString = false;
      let i = 0;

      while (i < str.length) {
        const char = str[i];
        if (char === '"' && str[i - 1] !== '\\') {
          inString = !inString;
        } else if (!inString) {
          if (char === '{') stack.push('{');
          else if (char === '[') stack.push('[');
          else if (char === '}') stack.pop();
          else if (char === ']') stack.pop();
        }
        i++;
      }

      let result = str;
      if (inString) result += '"';

      const reversedStack = [...stack].reverse();
      for (const open of reversedStack) {
        if (open === '{') result += '}';
        else if (open === '[') result += ']';
      }
      return result;
    };

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      const recovered = closeTruncatedJson(cleaned);
      try {
        return JSON.parse(recovered);
      } catch (e2) {
        if (recovered.startsWith('[')) {
          const lastComma = recovered.lastIndexOf(',');
          if (lastComma > 0) {
            const cut = recovered.substring(0, lastComma) + ']';
            try { return JSON.parse(cut); } catch (e3) { }
          }
        }
      }
    }

    throw new Error("JSON irrecuperável");
  } catch (error) {
    logger.error('AI', 'Falha crítica no parse do JSON da IA', { error, jsonString: jsonString.substring(0, 200) });
    throw new Error("Resposta da IA incompleta ou inválida. Tente novamente com menos texto ou limpe o campo.");
  }
};
