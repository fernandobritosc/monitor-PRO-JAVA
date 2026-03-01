import os
import shutil
from datetime import datetime

# Configurações
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BACKUP_DIR = os.path.join(PROJECT_ROOT, ".backups")
FILES_TO_BACKUP = [
    "views",
    "components",
    "services",
    "hooks",
    "utils",
    "App.tsx",
    "types.ts",
    "index.css",
    "package.json",
    "vite.config.ts"
]

def create_backup(label="manual"):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(BACKUP_DIR, f"{timestamp}_{label}")
    
    if not os.path.exists(backup_path):
        os.makedirs(backup_path)
        
    print(f"Iniciando backup em: {backup_path}")
    
    for item in FILES_TO_BACKUP:
        src = os.path.join(PROJECT_ROOT, item)
        dst = os.path.join(backup_path, item)
        
        if os.path.exists(src):
            if os.path.isdir(src):
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)
            print(f"  [OK] {item}")
        else:
            print(f"  [AVISO] {item} não encontrado.")
            
    print(f"\nBackup concluído com sucesso!")

if __name__ == "__main__":
    create_backup()
