import React from 'react';
import { EditalMateria } from '../types';

interface QuestionsBankProps {
  missaoAtiva: string;
  editais: EditalMateria[];
}

const QuestionsBank: React.FC<QuestionsBankProps> = ({ missaoAtiva, editais }) => {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Banco de Questões</h2>
      <p className="text-slate-400">
        Missão Ativa: {missaoAtiva}
      </p>
      <p className="text-slate-400">
        Total de Editais: {editais.length}
      </p>
      {/* TODO: Implementar o conteúdo do QuestionsBank */}
    </div>
  );
};

export default QuestionsBank;