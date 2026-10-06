/**
 * Converte um arquivo de imagem em data URL JPEG, redimensionado para no máximo
 * `maxSide` px. Redesenhar no canvas garante que o resultado abre em qualquer
 * navegador e no app — formatos como HEIC/TIFF passariam pelo `accept="image/*"`
 * mas apareceriam quebrados para quem recebe. Rejeita se o navegador não
 * conseguir decodificar o arquivo.
 */
export function imageFileToJpegDataUrl(file: File, maxSide = 1600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Não foi possível processar a imagem'));
      // Fundo branco: PNG com transparência não fica preto no JPEG.
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Formato de imagem não suportado. Envie um print em JPG ou PNG.'));
    };
    img.src = url;
  });
}
