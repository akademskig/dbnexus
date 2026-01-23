import { useEffect, useRef } from 'react';

interface AutoScrollOptions {
    scrollZone?: number; // Size of the trigger zone at top/bottom in pixels
    scrollSpeed?: number; // Speed multiplier for scrolling
}

/**
 * Hook to enable auto-scrolling when dragging near the edges of the viewport
 */
export function useDragAutoScroll(options: AutoScrollOptions = {}) {
    const { scrollZone = 100, scrollSpeed = 10 } = options;
    const isDraggingRef = useRef(false);
    const animationFrameRef = useRef<number | null>(null);
    const mouseYRef = useRef(0);

    useEffect(() => {
        // Single persistent auto-scroll loop
        const autoScroll = () => {
            if (!isDraggingRef.current) return;

            const viewportHeight = window.innerHeight;
            const distanceFromTop = mouseYRef.current;
            const distanceFromBottom = viewportHeight - mouseYRef.current;

            let scrollAmount = 0;
            // Scroll up when near top
            if (distanceFromTop < scrollZone) {
                const intensity = 1 - distanceFromTop / scrollZone;
                scrollAmount = -scrollSpeed * intensity;
            }
            // Scroll down when near bottom
            else if (distanceFromBottom < scrollZone) {
                const intensity = 1 - distanceFromBottom / scrollZone;
                scrollAmount = scrollSpeed * intensity;
            }

            if (scrollAmount !== 0) {
                window.scrollBy(0, scrollAmount);
            }

            // Continue loop while dragging
            animationFrameRef.current = requestAnimationFrame(autoScroll);
        };

        const handleDragStart = () => {
            isDraggingRef.current = true;
            // Start the persistent animation loop once
            animationFrameRef.current = requestAnimationFrame(autoScroll);
        };

        const handleDragEnd = () => {
            isDraggingRef.current = false;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };

        const handleDragOver = (e: DragEvent) => {
            // Only update mouse position, don't restart the loop
            mouseYRef.current = e.clientY;
        };

        // Attach event listeners
        document.addEventListener('dragstart', handleDragStart);
        document.addEventListener('dragend', handleDragEnd);
        document.addEventListener('drop', handleDragEnd); // Also stop on drop
        document.addEventListener('dragover', handleDragOver);

        return () => {
            document.removeEventListener('dragstart', handleDragStart);
            document.removeEventListener('dragend', handleDragEnd);
            document.removeEventListener('drop', handleDragEnd);
            document.removeEventListener('dragover', handleDragOver);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [scrollZone, scrollSpeed]);
}
