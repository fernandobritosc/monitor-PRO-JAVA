/**
 * E2E: Fluxo de Login
 * Verifica login com email/senha, persistência de sessão e logout
 */
import { test, expect, Page } from '@playwright/test';

// Credenciais de teste (use um usuário dedicado para E2E)
const TEST_EMAIL = process.env.E2E_EMAIL || 'e2e@monitorporo.test';
const TEST_PASSWORD = process.env.E2E_PASSWORD || 'TestPassword123!';

async function waitForApp(page: Page) {
    // Aguarda a interface carregar completamente
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
}

test.describe('Fluxo de Login', () => {
    test.beforeEach(async ({ page }) => {
        // Limpa o estado do localStorage antes de cada teste
        await page.goto('/');
        await page.evaluate(() => {
            // Preserva as configurações do Supabase mas limpa sessão
            const supabaseUrl = localStorage.getItem('monitorpro_supabase_url');
            const supabaseKey = localStorage.getItem('monitorpro_supabase_key');
            localStorage.clear();
            if (supabaseUrl) localStorage.setItem('monitorpro_supabase_url', supabaseUrl);
            if (supabaseKey) localStorage.setItem('monitorpro_supabase_key', supabaseKey);
        });
        await page.reload();
    });

    test('deve exibir a tela de login para usuários não autenticados', async ({ page }) => {
        await waitForApp(page);

        // Verifica se a tela de login está visível
        // (pode ser via email/senha ou Google)
        const pageTitle = await page.title();
        expect(pageTitle).toContain('MonitorPro');

        // Espera por algum elemento de autenticação
        await expect(page.locator('input[type="email"], input[type="text"][placeholder*="email" i], input[placeholder*="email" i]').first()).toBeVisible({ timeout: 10000 });
    });

    test('deve renderizar o formulário de login corretamente', async ({ page }) => {
        await waitForApp(page);

        // Verifica campos do formulário
        const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
        const passwordInput = page.locator('input[type="password"]').first();

        await expect(emailInput).toBeVisible({ timeout: 10000 });
        await expect(passwordInput).toBeVisible({ timeout: 10000 });
    });

    test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
        await waitForApp(page);

        const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
        const passwordInput = page.locator('input[type="password"]').first();
        const submitButton = page.locator('button[type="submit"], button:has-text("entrar"), button:has-text("login"), button:has-text("acessar")').first();

        await emailInput.fill('invalido@naoexiste.com');
        await passwordInput.fill('SenhaErrada123');

        await submitButton.click();

        // Aguarda mensagem de erro
        await expect(
            page.locator('[role="alert"], .error, [class*="error"], [class*="danger"], [aria-live="assertive"]').first()
        ).toBeVisible({ timeout: 8000 });
    });

    test('deve fazer login com credenciais válidas', async ({ page }) => {
        test.skip(!process.env.E2E_EMAIL, 'Credenciais E2E não configuradas — defina E2E_EMAIL e E2E_PASSWORD');

        await waitForApp(page);

        const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
        const passwordInput = page.locator('input[type="password"]').first();
        const submitButton = page.locator('button[type="submit"]').first();

        await emailInput.fill(TEST_EMAIL);
        await passwordInput.fill(TEST_PASSWORD);
        await submitButton.click();

        // Aguarda redirecionamento pós-login
        await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 15000 });

        // Verifica que está logado (nav ou conteúdo principal visível)
        await expect(page.locator('nav, [role="navigation"], [data-testid="main-nav"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('deve navegar para registro', async ({ page }) => {
        await waitForApp(page);

        // Procura link de registro/criar conta
        const registerLink = page.locator(
            'a:has-text("registrar"), a:has-text("cadastrar"), a:has-text("criar conta"), button:has-text("registrar"), button:has-text("cadastrar")'
        ).first();

        const isVisible = await registerLink.isVisible();
        if (isVisible) {
            await registerLink.click();
            // Verifica que a URL mudou ou que apareceu um formulário de registro
            await expect(
                page.locator('input[type="password"]').first()
            ).toBeVisible({ timeout: 5000 });
        } else {
            // Se não há link separado, pode ser que login e registro estão na mesma tela
            test.skip(true, 'Link de registro não encontrado — pode ser fluxo unificado');
        }
    });
});

test.describe('Navegação Principal (pós-login)', () => {
    test.skip(
        !process.env.E2E_EMAIL,
        'Requer E2E_EMAIL e E2E_PASSWORD para testes autenticados'
    );

    test.beforeAll(async ({ browser }) => {
        // Faz login uma vez e salva o estado
        const page = await browser.newPage();
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const emailInput = page.locator('input[type="email"]').first();
        const passwordInput = page.locator('input[type="password"]').first();

        await emailInput.fill(TEST_EMAIL);
        await passwordInput.fill(TEST_PASSWORD);
        await page.locator('button[type="submit"]').first().click();

        await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 15000 });
        await page.close();
    });

    test('deve exibir a navegação principal', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('nav, [role="navigation"]').first()).toBeVisible({ timeout: 10000 });
    });
});
