import { useState, useEffect, useRef } from "react";
import heic2any from "heic2any";

function HeicImage({ src, alt, className, ...props }) {
  const [convertedUrl, setConvertedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (convertedUrl && convertedUrl.startsWith("blob:")) {
        URL.revokeObjectURL(convertedUrl);
      }
    };
  }, [convertedUrl]);

  useEffect(() => {
    if (!src) {
      setError(true);
      return;
    }

    // Jika bukan HEIC, gunakan langsung
    if (!src.includes(".heic")) {
      setConvertedUrl(src);
      return;
    }

    // Convert HEIC
    async function convertHeic() {
      setLoading(true);
      setError(false);

      try {
        abortControllerRef.current = new AbortController();

        const response = await fetch(src, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch image");
        }

        const blob = await response.blob();

        // Convert HEIC to WEBP (ukuran lebih kecil)
        const convertedBlob = await heic2any({
          blob: blob,
          toType: "image/webp",
          quality: 0.8,
        });

        const url = URL.createObjectURL(convertedBlob);
        setConvertedUrl(url);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("HEIC conversion error:", err);
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    }

    convertHeic();
  }, [src]);

  if (loading) {
    return <div className="heic-loading">Loading...</div>;
  }

  if (error || !convertedUrl) {
    return <div className="heic-error">🎬</div>;
  }

  return <img src={convertedUrl} alt={alt} className={className} {...props} />;
}

export default HeicImage;
