import os
import shutil
import sys

# Configurações
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BACKUP_DIR = os.path.join(PROJECT_ROOT, ".backups")

def list_backups():
    if not os.path.exists(BACKUP_DIR):
        print("Nenhum backup encontrado.")
        return []
    
    backups = sorted([d for d in os.listdir(BACKUP_DIR) if os.path.isdir(os.path.join(BACKUP_DIR, d))], reverse=True)
    return backups

def restore_backup(backup_name):
    src_dir = os.path.join(BACKUP_DIR, backup_name)
    if not os.path.exists(src_dir):
        print(f"Erro: Backup {backup_name} não encontrado.")
        return

    print(f"Restaurando backup: {backup_name}...")
    
    items = os.listdir(src_dir)
    for item in items:
        src = os.path.join(src_dir, item)
        dst = os.path.join(PROJECT_ROOT, item)
        
        if os.path.exists(dst):
            if os.path.isdir(dst):
                shutil.rmtree(dst)
            else:
                os.remove(dst)
        
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
        print(f"  [RESTAURADO] {item}")
        
    print(f"\nRestauração concluída com sucesso!")

if __name__ == "__main__":
    backups = list_backups()
    if not backups:
        sys.exit(0)
        
    print("Backups disponíveis:")
    for i, b in enumerate(backups):
        print(f"[{i}] {b}")
        
    choice = input("\nEscolha o número do backup para restaurar (ou Enter para cancelar): ")
    if choice.isdigit() and int(choice) < len(backups):
        restore_backup(backups[int(choice)])
    else:
        print("Operação cancelada.")
