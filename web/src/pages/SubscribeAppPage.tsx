import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';

export function SubscribeAppPage() {
  useEffect(() => {
    // Navegadores internos podem exigir um toque; o botão permanece como alternativa.
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.assign('docepreco://assinar');
    }
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-500 via-pink-500 to-rose-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
        <Crown size={40} className="text-primary-500 mx-auto mb-5" />
        <h1 className="text-3xl font-bold text-gray-900">Seu próximo passo é Master 💕</h1>
        <p className="text-gray-600 my-5">Abra o DocePreço para conhecer os benefícios e assinar pelo aplicativo.</p>
        <a href="docepreco://assinar" className="block rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold px-5 py-4">
          Abrir assinatura no app
        </a>
        <p className="text-sm text-gray-500 mt-5">Se o app não abrir, tente pelo navegador do celular e confira se o DocePreço está instalado e atualizado.</p>
        <Link to="/download" className="inline-block text-primary-600 font-semibold mt-5">Baixar ou atualizar o DocePreço</Link>
      </div>
    </main>
  );
}
