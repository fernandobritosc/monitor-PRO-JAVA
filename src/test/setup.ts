import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = String(value); },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
        get length() { return Object.keys(store).length; },
        key: (index: number) => Object.keys(store)[index] ?? null,
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock console methods para testes mais limpos
global.console = {
    ...console,
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

// Mock window.location.reload
Object.defineProperty(window, 'location', {
    writable: true,
    value: {
        ...window.location,
        reload: vi.fn(),
    },
});

// Mock SpeechSynthesisUtterance
global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
    text,
    lang: '',
    rate: 1,
    onend: null,
    onerror: null,
})) as any;

global.speechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
    pending: false,
    speaking: false,
    paused: false,
    onvoiceschanged: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
} as any;

// Mock AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
    createBufferSource: vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
    })),
    createBuffer: vi.fn(),
    destination: {},
    close: vi.fn(),
    sampleRate: 44100,
})) as any;

// Suprimir warnings do React sobre act()
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
