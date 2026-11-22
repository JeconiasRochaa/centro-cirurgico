import { Outlet } from 'react-router-dom';
import { useMirrorSync } from '@/hooks/useMirrorSync';

/** Layout de painéis (TV/sala de espera): tela cheia, sem menu. Se a aba foi aberta por um usuário da equipe, mantém os espelhos em dia. */
export default function KioskLayout() {
  useMirrorSync();
  return <div className="min-h-screen bg-surface"><Outlet /></div>;
}
