/**
 * Client-side image compression and perceptual hash generation
 * Protects user bandwidth, compresses before sending to /api/verify,
 * and detects duplicate photo re-use.
 */

export async function compressImage(
  file: File,
  maxWidth = 900,
  maxHeight = 900,
  quality = 0.75
): Promise<{ dataUrl: string; hash: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const hash = generatePerceptualHash(img);

        resolve({ dataUrl, hash });
      };
      img.onerror = () => reject(new Error('Gagal memuat gambar untuk kompresi'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar'));
    reader.readAsDataURL(file);
  });
}

/**
 * 8x8 Average Perceptual Hash (aHash)
 * Scales the image down to an 8x8 grayscale matrix and computes 64-bit fingerprint.
 * Two identical or slightly modified photos will produce identical or near-identical hashes.
 */
function generatePerceptualHash(img: HTMLImageElement): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'hash-' + Math.random().toString(36).substring(2, 9);

    ctx.drawImage(img, 0, 0, 8, 8);
    const imgData = ctx.getImageData(0, 0, 8, 8).data;

    let total = 0;
    const grays: number[] = [];
    for (let i = 0; i < imgData.length; i += 4) {
      // Luminance formula
      const gray = Math.round(imgData[i] * 0.299 + imgData[i + 1] * 0.587 + imgData[i + 2] * 0.114);
      grays.push(gray);
      total += gray;
    }

    const avg = total / 64;
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += grays[i] >= avg ? '1' : '0';
    }

    // Convert 64-bit binary string into 16-char hexadecimal
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = hash.substring(i, i + 4);
      hex += parseInt(nibble, 2).toString(16);
    }
    return hex;
  } catch {
    return 'hash-' + Date.now().toString(36);
  }
}
