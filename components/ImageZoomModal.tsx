import React from 'react';
import { useStoredImage } from '../hooks/useStoredImage';
import Spinner from './Spinner';
import { XIcon } from './icons';

interface ImageZoomModalProps {
    imageKey: string;
    onClose: () => void;
}

const ImageZoomModal = ({ imageKey, onClose }: ImageZoomModalProps) => {
    const { src, isLoading } = useStoredImage(imageKey);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[150] flex justify-center items-center backdrop-blur-md animate-fadeIn" onClick={onClose} role="dialog" aria-modal="true">
            <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 bg-black/30 rounded-full hover:bg-black/50 transition-colors z-10">
                <XIcon className="w-8 h-8" />
            </button>
            <div className="w-full h-full flex justify-center items-center p-4" onClick={e => e.stopPropagation()}>
                {isLoading && <Spinner />}
                {src && (
                    <img
                        src={src}
                        alt="Zoomed view"
                        className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl"
                    />
                )}
            </div>
        </div>
    );
};

export default ImageZoomModal;
