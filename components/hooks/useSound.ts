
import { useCallback, useRef, useEffect } from 'react';

interface UseSoundControl {
  play: (loop?: boolean) => void;
  stop: () => void;
  isPlaying: () => boolean;
}

function getMediaErrorCodeString(code: number | undefined): string {
  if (code === undefined) return "UNDEFINED_CODE";
  const ME = typeof MediaError !== 'undefined' ? MediaError : null;
  if (!ME) return `UNKNOWN_MEDIA_ERROR_CODE (${code})`; // MediaError not available

  switch (code) {
    case ME.MEDIA_ERR_ABORTED: return "MEDIA_ERR_ABORTED";
    case ME.MEDIA_ERR_NETWORK: return "MEDIA_ERR_NETWORK";
    case ME.MEDIA_ERR_DECODE: return "MEDIA_ERR_DECODE";
    case ME.MEDIA_ERR_SRC_NOT_SUPPORTED: return "MEDIA_ERR_SRC_NOT_SUPPORTED";
    default: return `UNKNOWN_MEDIA_ERROR_CODE (${code})`;
  }
}

// Fix: Ensure useSound is correctly exported as a named constant to resolve the import error.
// The existing "Fix:" comment below suggests this was intended, this change confirms the implementation.
export const useSound = (soundSrc: string): UseSoundControl => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio(soundSrc);
      audio.preload = 'auto';
      // audio.crossOrigin = "anonymous"; // Commented out to prevent issues with local file URLs (file:///)
      audioRef.current = audio;

      const getResolvedSrc = () => audio.src || soundSrc; // Prefer resolved src if available

      const handleError = (e: Event) => {
        const error = audio.error;
        console.error(
          `Audio Error for ${getResolvedSrc()} (input path: ${soundSrc}):`, 
          error ? `Code: ${error.code} (${getMediaErrorCodeString(error.code)}), Message: "${error.message}"` : "Unknown error",
          e
        );
      };
      const handleCanPlayThrough = () => {
        // console.info(`Audio CanPlayThrough for ${getResolvedSrc()} (input path: ${soundSrc})`);
      };
      const handleLoadedMetadata = () => {
        // console.info(`Audio LoadedMetadata for ${getResolvedSrc()} (input path: ${soundSrc}): Duration=${audio.duration}s`);
      };
      const handleStalled = () => {
          console.warn(`Audio Stalled for ${getResolvedSrc()} (input path: ${soundSrc})`);
      };
      const handleLoadStart = () => {
        console.info(`Audio LoadStart for ${getResolvedSrc()} (input path: ${soundSrc})`);
      };
      const handleSuspend = () => {
        console.warn(`Audio Suspend for ${getResolvedSrc()} (input path: ${soundSrc}). Browser stopped fetching media data.`);
      }

      audio.addEventListener('error', handleError);
      audio.addEventListener('canplaythrough', handleCanPlayThrough);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('stalled', handleStalled);
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('suspend', handleSuspend);


      return () => {
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('stalled', handleStalled);
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('suspend', handleSuspend);

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute('src'); 
          audioRef.current.load(); 
          audioRef.current = null; 
        }
      };
    }
  }, [soundSrc]);

  const play = useCallback((loop: boolean = false) => {
    const audio = audioRef.current;
    if (audio) {
      audio.loop = loop;
      const resolvedSrc = audio.src || soundSrc;

      if (audio.ended || (!loop && audio.currentTime > 0)) {
        audio.currentTime = 0;
      }
      
      audio.play().catch(error => {
        const mediaError = audio.error;
        let errorDetails = 'No MediaError details available for play() rejection.';
        if (mediaError) {
            let message = mediaError.message || "Unknown error during play().";
            if (mediaError.code === (typeof MediaError !== 'undefined' ? MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED : 4)) { 
                message = "The audio source is not supported or cannot be found. Check path, file format, and server/CSP settings.";
            }
            errorDetails = `MediaError code: ${mediaError.code} (${getMediaErrorCodeString(mediaError.code)}), message: "${message}"`;
        }
        console.warn(
          `Error playing sound ${resolvedSrc} (input path: ${soundSrc}):`, error, errorDetails
        );
      });
    } else {
      console.warn(`Attempted to play ${soundSrc} but audio element is not available.`);
    }
  }, [soundSrc]); 

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; 
    }
  }, []);

  const isPlaying = useCallback((): boolean => {
    const audio = audioRef.current;
    if (!audio) return false;
    return !audio.paused && (audio.loop || !audio.ended || audio.currentTime < audio.duration);
  }, []);

  return { play, stop, isPlaying };
};