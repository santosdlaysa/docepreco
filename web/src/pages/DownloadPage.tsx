import { Smartphone, Download, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';

export function DownloadPage() {
  const [copied, setCopied] = useState<'ios' | 'android' | null>(null);

  const copyToClipboard = (link: string, type: 'ios' | 'android') => {
    navigator.clipboard.writeText(link);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-pink-500 to-rose-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-pink-600 mb-6 shadow-lg">
            <Smartphone size={40} className="text-white" />
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2">DocePreço</h1>
          <p className="text-gray-500 mb-8">Baixe o app e comece a lucrar com seus doces</p>

          {/* Divider */}
          <div className="w-12 h-1 bg-gradient-to-r from-primary-500 to-pink-500 rounded-full mx-auto mb-8" />

          {/* iOS Download */}
          <div className="mb-4">
            <a
              href="https://apps.apple.com/us/app/docepre%C3%A7o/id6761034172"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center w-full gap-3 bg-black text-white px-6 py-4 rounded-2xl text-base font-bold hover:bg-gray-900 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <Smartphone size={20} />
              Baixar para iOS
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          {/* Android Download */}
          <div className="mb-6">
            <a
              href="https://play.google.com/store/apps/details?id=com.orgenyx"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center w-full gap-3 bg-emerald-600 text-white px-6 py-4 rounded-2xl text-base font-bold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <Smartphone size={20} />
              Baixar para Android
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          {/* Copy Links */}
          <div className="space-y-3 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Copiar link</p>

            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard('https://apps.apple.com/us/app/docepre%C3%A7o/id6761034172', 'ios')}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
              >
                <Download size={14} />
                {copied === 'ios' ? 'Copiado!' : 'iOS'}
              </button>

              <button
                onClick={() => copyToClipboard('https://play.google.com/store/apps/details?id=com.orgenyx', 'android')}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
              >
                <Download size={14} />
                {copied === 'android' ? 'Copiado!' : 'Android'}
              </button>
            </div>
          </div>

          {/* Footer Message */}
          <p className="mt-8 text-xs text-gray-400">
            Gratuito para começar. Sem cartão de crédito.
          </p>
        </div>

        {/* Social Hint */}
        <div className="mt-8 text-center text-white text-sm">
          <p>Compartilhe na sua bio do Instagram 👇</p>
          <p className="text-white/70 text-xs mt-2">Coloque o link desta página na sua bio</p>
        </div>
      </div>
    </div>
  );
}
