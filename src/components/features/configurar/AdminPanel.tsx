import { Loader2, Shield, Database, Search, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../../../types';

interface AdminPanelProps {
  usersList: UserProfile[];
  currentUserEmail: string;
  loadingUsers: boolean;
  userSearch: string;
  approvalMsg: string | null;
  onUserSearchChange: (v: string) => void;
  onToggleApproval: (userId: string, currentStatus: boolean | undefined) => void;
  onShowSql: () => void;
}

const AdminPanel = ({
  usersList, currentUserEmail, loadingUsers, userSearch, approvalMsg,
  onUserSearchChange, onToggleApproval, onShowSql,
}: AdminPanelProps) => {
  const filteredUsers = usersList.filter(u => u.email?.toLowerCase().includes(userSearch.toLowerCase()));

  return (
    <div className="glass rounded-2xl p-6 border border-purple-500/30 relative overflow-hidden animate-in slide-in-from-right-2">
      {approvalMsg && (
        <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-xs font-bold text-center py-2 animate-in slide-in-from-top-4 z-50">{approvalMsg}</div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h3 className="text-xl font-bold flex items-center gap-2"><Shield size={20} className="text-purple-400" /> Administração de Usuários</h3>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={onShowSql} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold rounded-xl border border-cyan-500/20 flex items-center gap-2 transition-all"><Database size={14} /> Permissões (SQL)</button>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input type="text" placeholder="Filtrar usuários..." className="w-full bg-slate-900/30 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs" value={userSearch} onChange={e => onUserSearchChange(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
        {loadingUsers ? (
          <Loader2 className="animate-spin mx-auto text-purple-400" />
        ) : (
          filteredUsers.map(u => (
            <div key={u.id} className="bg-slate-950/30 p-3 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-xs font-mono">{u.email} {u.email === currentUserEmail && '(Você)'}</span>
              <button
                onClick={() => onToggleApproval(u.id, u.approved)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${u.approved ? 'bg-white/5 text-slate-500' : 'bg-green-600 text-white shadow-lg shadow-green-600/20'}`}
              >
                {u.approved ? 'Bloquear' : <><CheckCircle2 size={12} /> Aprovar</>}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
