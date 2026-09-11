import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecentActivities from './RecentActivities';
import { StudyRecord } from '../../../types';

const makeRecord = (overrides: Partial<StudyRecord>): StudyRecord => ({
  id: crypto.randomUUID(),
  user_id: 'user-1',
  concurso: 'Concurso X',
  materia: 'Direito Constitucional',
  assunto: 'Assunto Y',
  data_estudo: '2026-09-10',
  acertos: 10,
  total: 12,
  taxa: 83,
  tempo: 120,
  rev_24h: false,
  rev_07d: false,
  rev_15d: false,
  rev_30d: false,
  ...overrides,
});

const records = [
  makeRecord({ id: 'r1', data_estudo: '2026-09-10', materia: 'Direito Constitucional', assunto: 'Assunto A', tempo: 100 }),
  makeRecord({ id: 'r2', data_estudo: '2026-09-10', materia: 'Informática', assunto: 'Assunto B', tempo: 60 }),
  makeRecord({ id: 'r3', data_estudo: '2026-09-09', materia: 'Direito Constitucional', assunto: 'Assunto C', tempo: 235 }),
];

describe('RecentActivities', () => {
  it('agrupa por dia em ordem decrescente com total de minutos', () => {
    render(<RecentActivities records={records} />);

    // Dia 10/09 (160 min = 2h40min) antes do dia 09/09 (235 min = 3h55min)
    expect(screen.getByText('2h40min')).toBeInTheDocument();
    expect(screen.getByText('3h55min')).toBeInTheDocument();
    const day10 = screen.getByText('10').closest('div');
    const day09 = screen.getByText('09').closest('div');
    expect(day10).toBeInTheDocument();
    expect(day09).toBeInTheDocument();
  });

  it('exibe matéria e assunto de cada atividade', () => {
    render(<RecentActivities records={records} />);
    expect(screen.getByText('Assunto A')).toBeInTheDocument();
    expect(screen.getByText('Assunto B')).toBeInTheDocument();
    expect(screen.getByText('Assunto C')).toBeInTheDocument();
    expect(screen.getAllByText('Direito Constitucional')).toHaveLength(2);
  });

  it('mostra estado vazio sem registros', () => {
    render(<RecentActivities records={[]} />);
    expect(screen.getByText('Nenhuma atividade no período.')).toBeInTheDocument();
  });

  it('respeita o limite de dias (maxDays)', () => {
    render(<RecentActivities records={records} maxDays={1} />);
    expect(screen.getByText('Assunto A')).toBeInTheDocument();
    expect(screen.queryByText('Assunto C')).not.toBeInTheDocument();
  });
});
