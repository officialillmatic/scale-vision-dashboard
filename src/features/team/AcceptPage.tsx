'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AcceptPage() {
  const [msg, setMsg] = useState('Validando invitación...');

  useEffect(() => {
    (async () => {
      try {
        const token = new URLSearchParams(location.search).get('token');
        if (!token) { setMsg('Falta el token de invitación.'); return; }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setMsg('Debes iniciar sesión para aceptar la invitación.');
          return;
        }

        const r = await fetch('/api/team/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, userId: user.id }),
        });
        const j = await r.json();
        if (!r.ok) { setMsg(j.error || 'No se pudo aceptar la invitación.'); return; }

        setMsg('¡Listo! Te uniste al equipo. Redirigiendo...');
        setTimeout(() => { location.href = '/team'; }, 1200);
      } catch (e: any) {
        setMsg(e?.message ?? 'Error inesperado');
      }
    })();
  }, []);

  return (
    <div className="p-8 text-center">
      <h1 className="text-xl font-bold mb-2">Aceptar invitación</h1>
      <p className="opacity-80">{msg}</p>
    </div>
  );
}
