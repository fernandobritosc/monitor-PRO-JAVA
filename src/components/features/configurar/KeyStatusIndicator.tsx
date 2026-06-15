import { Check, AlertCircle } from 'lucide-react';

interface KeyStatusIndicatorProps {
  value: string;
  type: 'url' | 'supabase' | 'gemini' | 'groq';
}

const KeyStatusIndicator = ({ value, type }: KeyStatusIndicatorProps) => {
  let status: 'ok' | 'warn' | 'error' = 'error';
  let message = 'Vazio';

  if (!value) {
    status = 'error';
    message = 'Não configurado';
  } else {
    switch (type) {
      case 'url':
        if (value.startsWith('https://') && value.includes('supabase.co')) {
          status = 'ok'; message = 'OK';
        } else {
          status = 'warn'; message = 'Formato inválido';
        }
        break;
      case 'supabase':
        if (value.startsWith('ey')) {
          status = 'ok'; message = 'OK';
        } else {
          status = 'warn'; message = 'Formato inválido';
        }
        break;
      case 'gemini':
        if (value.startsWith('AIza')) {
          status = 'ok'; message = 'OK';
        } else {
          status = 'warn'; message = 'Formato inválido';
        }
        break;
      case 'groq':
        if (value.startsWith('gsk_')) {
          status = 'ok'; message = 'OK';
        } else {
          status = 'warn'; message = 'Formato inválido';
        }
        break;
    }
  }

  const colors = {
    ok: 'text-green-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  };

  const Icon = status === 'ok' ? Check : AlertCircle;

  return (
    <div className={`flex items-center gap-1.5 text-[10px] font-bold ${colors[status]}`}>
      <Icon size={12} />
      <span>{message}</span>
    </div>
  );
};

export default KeyStatusIndicator;
