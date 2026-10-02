'use client';

import { useEffect, useState } from 'react';

export default function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 2600);
    };
    window.addEventListener('manga-toast', onToast);
    return () => {
      window.removeEventListener('manga-toast', onToast);
      clearTimeout(t);
    };
  }, []);

  if (!msg) return null;
  return <div className="toast show" dangerouslySetInnerHTML={{ __html: msg }} />;
}
