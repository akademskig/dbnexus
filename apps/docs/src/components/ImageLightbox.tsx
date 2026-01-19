import { useState } from 'react';
import styled from '@emotion/styled';
import { motion, AnimatePresence } from 'framer-motion';

const Thumbnail = styled.img`
    width: 100%;
    cursor: zoom-in;
    transition: opacity 0.2s;

    &:hover {
        opacity: 0.9;
    }
`;

const Overlay = styled(motion.div)`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: zoom-out;
    padding: 2rem;
`;

const LargeImage = styled(motion.img)`
    max-width: 95vw;
    max-height: 95vh;
    object-fit: contain;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
`;

const CloseHint = styled.div`
    position: fixed;
    top: 1rem;
    right: 1rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.875rem;
    z-index: 1001;
`;

interface ImageLightboxProps {
    src: string;
    alt: string;
    className?: string;
}

export function ImageLightbox({ src, alt, className }: ImageLightboxProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Thumbnail src={src} alt={alt} className={className} onClick={() => setIsOpen(true)} />
            <AnimatePresence>
                {isOpen && (
                    <Overlay
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                    >
                        <CloseHint>Click anywhere to close</CloseHint>
                        <LargeImage
                            src={src}
                            alt={alt}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25 }}
                        />
                    </Overlay>
                )}
            </AnimatePresence>
        </>
    );
}
