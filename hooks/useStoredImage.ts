import { useState, useEffect } from 'react';
import { getImage } from '../services/imageStore';

// In-memory cache to avoid re-fetching images from DB within a session.
const cache = new Map<string, string>();

export function useStoredImage(keyOrUrl: string | undefined) {
    const [src, setSrc] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Reset state if key is undefined
        if (!keyOrUrl) {
            setSrc(undefined);
            setIsLoading(false);
            return;
        }

        // If it's not a DB key, just use it as the src directly (e.g., a blob URL or an existing base64)
        if (!keyOrUrl.startsWith('idb://')) {
            setSrc(keyOrUrl);
            setIsLoading(false);
            return;
        }

        // Check cache first
        if (cache.has(keyOrUrl)) {
            setSrc(cache.get(keyOrUrl));
            setIsLoading(false);
            return;
        }

        let isCancelled = false;
        const fetchImage = async () => {
            setIsLoading(true);
            try {
                const imageData = await getImage(keyOrUrl);
                if (!isCancelled) {
                    if (imageData) {
                        cache.set(keyOrUrl, imageData); // Update cache
                        setSrc(imageData);
                    } else {
                        // Handle case where image is not found in DB
                        console.warn(`Image with key ${keyOrUrl} not found in IndexedDB.`);
                        setSrc(undefined);
                    }
                }
            } catch (error) {
                console.error("Failed to load image from IndexedDB", error);
                if (!isCancelled) {
                    setSrc(undefined);
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchImage();

        // Cleanup function to prevent state updates on unmounted components
        return () => {
            isCancelled = true;
        };
    }, [keyOrUrl]);

    return { src, isLoading };
}
