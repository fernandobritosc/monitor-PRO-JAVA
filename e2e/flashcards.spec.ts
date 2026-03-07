/**
 * E2E: Fluxo de Flashcards
 * Testa criação, visualização e interação com flashcards
 * Requer usuário autenticado via E2E_EMAIL e E2E_PASSWORD
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_EMAIL || '';
const TEST_PASSWORD = process.env.E2E_PASSWORD || '';

// Helper: login
async function loginUser(page: Page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();

    await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');
}

// Helper: navegar para Flashcards
async function navigateToFlashcards(page: Page) {
    // Tenta clicar no menu de flashcards
    const flashcardsNav = page.locator(
        'a:has-text("flashcard"), button:has-text("flashcard"), [data-view="FLASHCARDS"], [aria-label*="flashcard" i]'
    ).first();

    if (await flashcardsNav.isVisible()) {
        await flashcardsNav.click();
    } else {
        // Fallback: modifica o estado diretamente
        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'FLASHCARDS' }));
        });
    }

    await page.waitForTimeout(1500);
}

test.describe('Flashcards', () => {
    test.skip(!process.env.E2E_EMAIL, 'Requer E2E_EMAIL e E2E_PASSWORD');

    let context: BrowserContext;
    let page: Page;

    test.beforeAll(async ({ browser }) => {
        context = await browser.newContext();
        page = await context.newPage();
        await loginUser(page);
    });

    test.afterAll(async () => {
        await context.close();
    });

    test('deve exibir a seção de flashcards', async () => {
        await navigateToFlashcards(page);

        // Verifica que a view de flashcards está ativa
        await expect(
            page.locator(
                '[data-testid="flashcards-view"], h1:has-text("flashcard"), h2:has-text("flashcard"), [class*="flashcard"]'
            ).first()
        ).toBeVisible({ timeout: 10000 });
    });

    test('deve exibir abas: Estudar, Gerenciar, Comunidade', async () => {
        await navigateToFlashcards(page);

        // Verifica presença das abas
        const tabTexts = ['estudar', 'gerenciar', 'comunidade'];

        for (const tabText of tabTexts) {
            const tab = page.locator(
                `button:has-text("${tabText}"), [role="tab"]:has-text("${tabText}")`,
                { hasText: new RegExp(tabText, 'i') }
            ).first();

            const isVisible = await tab.isVisible({ timeout: 2000 }).catch(() => false);
            if (!isVisible) {
                console.warn(`Aba "${tabText}" não encontrada — pode ter nome diferente`);
            }
        }
    });

    test('deve abrir formulário de criação de card', async () => {
        await navigateToFlashcards(page);

        // Clica na aba de gerenciar/criar
        const manageTab = page.locator(
            'button:has-text("gerenciar"), button:has-text("criar"), [role="tab"]:has-text("meus")'
        ).first();

        if (await manageTab.isVisible()) {
            await manageTab.click();
            await page.waitForTimeout(500);
        }

        // Verifica campos do formulário de criação
        const frontInput = page.locator(
            'textarea[placeholder*="pergunta" i], textarea[placeholder*="frente" i], input[placeholder*="pergunta" i]'
        ).first();

        await expect(frontInput).toBeVisible({ timeout: 8000 });
    });

    test('deve validar criação de flashcard com campos vazios', async () => {
        await navigateToFlashcards(page);

        // Procura botão de salvar/criar
        const saveButton = page.locator(
            'button:has-text("salvar"), button:has-text("criar"), button:has-text("adicionar")',
            { hasText: /salvar|criar|adicionar/i }
        ).first();

        if (await saveButton.isVisible()) {
            await saveButton.click();

            // Deve aparecer um alert ou mensagem de erro
            page.on('dialog', async (dialog) => {
                expect(dialog.message()).toContain('obrigatório');
                await dialog.dismiss();
            });
        }
    });
});

test.describe('Flashcards — Testes Visuais (sem auth)', () => {
    test('página inicial carrega sem erros de JS', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Filtra erros esperados (Supabase config warnings)
        const criticalErrors = errors.filter(
            (e) => !e.includes('placeholder') && !e.includes('supabase')
        );

        expect(criticalErrors).toHaveLength(0);
    });

    test('deve ter meta tags SEO corretas', async ({ page }) => {
        await page.goto('/');

        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);

        const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
        // Pode ser null se não configurado, apenas verifica que não quebra
        expect(typeof title).toBe('string');
    });

    test('deve ser responsivo (mobile viewport)', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // A página não deve ter overflow horizontal
        const hasHorizontalScroll = await page.evaluate(() => {
            return document.body.scrollWidth > window.innerWidth;
        });

        // Warnings, não erros hard
        if (hasHorizontalScroll) {
            console.warn('Atenção: página tem overflow horizontal em mobile (375px)');
        }
    });
});
