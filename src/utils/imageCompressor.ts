/**
 * Utility to compress images (data URLs, Blobs, Files)
 * Converts high-resolution / heavy images into optimized lightweight WebP/JPEG data URLs (~30KB-80KB).
 * This ensures they easily fit within Firestore's 1MB limit and LocalStorage's 5MB quota.
 */

export const compressImage = async (
  input: File | Blob | string,
  maxWidth: number = 960,
  maxHeight: number = 960,
  quality: number = 0.8
): Promise<string> => {
  if (typeof input === 'string') {
    // If it's a standard web URL, no compression needed
    if (/^https?:\/\//i.test(input.trim())) {
      return input.trim();
    }
    // If not a data URL, return as is
    if (!input.startsWith('data:image/')) {
      return input.trim();
    }
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate proportional dimensions
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback if canvas context fails
        if (typeof input === 'string') resolve(input);
        else {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(input as Blob);
        }
        return;
      }

      // Draw white background in case of transparent PNG converted to JPEG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);

      // Try WebP first for optimal compression and clarity, fallback to JPEG
      try {
        const webpData = canvas.toDataURL('image/webp', quality);
        if (webpData.startsWith('data:image/webp')) {
          resolve(webpData);
          return;
        }
      } catch {}

      const jpegData = canvas.toDataURL('image/jpeg', quality);
      resolve(jpegData);
    };

    img.onerror = () => {
      // If image loading fails, return input string or fallback
      if (typeof input === 'string') resolve(input);
      else {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(input as Blob);
      }
    };

    if (typeof input === 'string') {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(input);
    }
  });
};
