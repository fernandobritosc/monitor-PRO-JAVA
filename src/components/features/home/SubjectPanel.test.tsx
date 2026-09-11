import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SubjectPanel from './SubjectPanel';

const subjects = [
  { materia: 'Direito Constitucional', time: 99, correct: 113, total: 140 },
  { materia: 'RML', time: 60, correct: 0, total: 0 },
];

describe('SubjectPanel', () => {
  it('renderiza linhas por disciplina com acertos, erros, total e %', () => {
    render(<SubjectPanel subjects={subjects} simulados={{ time: 0, correct: 0, total: 0 }} />);

    expect(screen.getByText('Direito Constitucional')).toBeInTheDocument();
    // 113 acertos, 27 erros (140-113), 140 total, 81% (113/140)
    expect(screen.getByText('113')).toBeInTheDocument();
    expect(screen.getByText('27')).toBeInTheDocument();
    expect(screen.getByText('140')).toBeInTheDocument();
    expect(screen.getByText('81')).toBeInTheDocument();
  });

  it('formata o tempo como XhYYmin', () => {
    render(<SubjectPanel subjects={subjects} simulados={{ time: 0, correct: 0, total: 0 }} />);
    expect(screen.getByText('1h39min')).toBeInTheDocument();
    expect(screen.getByText('1h00min')).toBeInTheDocument();
  });

  it('mostra zeros quando a disciplina não tem questões', () => {
    render(<SubjectPanel subjects={subjects} simulados={{ time: 0, correct: 0, total: 0 }} />);
    // Linha RML: 0 acertos, 0 erros, 0 total + badge 0%
    expect(screen.getAllByText('0')).toHaveLength(4);
  });

  it('exibe o rodapé de Simulados apenas quando há dados', () => {
    const { rerender } = render(
      <SubjectPanel subjects={subjects} simulados={{ time: 1506, correct: 452, total: 630 }} />
    );
    expect(screen.getByText('Simulados')).toBeInTheDocument();
    expect(screen.getByText('25h06min')).toBeInTheDocument();

    rerender(<SubjectPanel subjects={subjects} simulados={{ time: 0, correct: 0, total: 0 }} />);
    expect(screen.queryByText('Simulados')).not.toBeInTheDocument();
  });

  it('mostra estado vazio sem dados', () => {
    render(<SubjectPanel subjects={[]} simulados={{ time: 0, correct: 0, total: 0 }} />);
    expect(screen.getByText('Nenhum estudo registrado no período.')).toBeInTheDocument();
  });

  it('destaca a linha ao clicar e remove ao clicar de novo', () => {
    render(<SubjectPanel subjects={subjects} simulados={{ time: 0, correct: 0, total: 0 }} />);
    const row = () => screen.getByText('Direito Constitucional').closest('tr');

    expect(row()?.className).not.toContain('bg-teal-500/10');
    fireEvent.click(screen.getByText('Direito Constitucional'));
    expect(row()?.className).toContain('bg-teal-500/10');
    fireEvent.click(screen.getByText('Direito Constitucional'));
    expect(row()?.className).not.toContain('bg-teal-500/10');
  });
});
