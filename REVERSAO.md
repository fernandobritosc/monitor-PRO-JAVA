# Guia de Reversão e Segurança - MonitorPro

Este documento contém as instruções para você gerenciar as versões do seu projeto de forma independente, garantindo que você possa desfazer alterações a qualquer momento.

## 🛡️ Opções de Segurança

### 1. Snapshot Rápido (Backup Local)
Antes de fazer mudanças grandes ou quando o projeto estiver em um estado perfeito, você pode criar uma cópia de segurança.

**Como fazer:**
No terminal do VS Code, execute:
```powershell
python .agent/scripts/backup.py
```
Isso criará uma pasta criptografada com a data e hora dentro de `.backups/`.

### 2. Reversão (Rollback)
Se algo quebrar ou se você não gostar de uma atualização, você pode voltar no tempo.

**Como fazer:**
No terminal do VS Code, execute:
```powershell
python .agent/scripts/rollback.py
```
O script listará as datas disponíveis. Escolha o número correspondente e dê Enter. O código será restaurado para aquele momento exato.

### 3. Git (Controle de Versão Profissional)
O projeto já está inicializado com Git. Esta é a ferramenta mais segura.

**Comandos Úteis:**
- `git status`: Ver o que mudou.
- `git add .` + `git commit -m "Minha mensagem"`: Salvar o progresso atual.
- `git checkout .`: CANCELAR todas as mudanças não salvas no momento (perigoso, mas útil).

## 📄 Histórico de Mudanças
Consulte o arquivo `CHANGELOG.md` na raiz do projeto para ver o que foi alterado em cada versão entregue por mim.

---
> [!TIP]
> Recomendo fazer um `python .agent/scripts/backup.py` pelo menos uma vez por dia ou antes de começarmos uma nova funcionalidade grande.
