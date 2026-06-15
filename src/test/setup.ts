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
class MockSpeechSynthesisUtterance {
    text: string;
    lang = '';
    rate = 1;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) {
        this.text = text;
    }
}
global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance;

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
} as unknown as SpeechSynthesis;

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
})) as unknown as typeof AudioContext;

// Suprimir warnings do React sobre act()
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
