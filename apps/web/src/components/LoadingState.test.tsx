import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import { LoadingState, LoadingSkeleton } from './LoadingState';

describe('LoadingState', () => {
    it('should render circular progress by default', () => {
        render(<LoadingState />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render message when provided', () => {
        render(<LoadingState message="Loading data..." />);
        expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should render linear progress when variant is linear', () => {
        render(<LoadingState variant="linear" />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render linear progress with message', () => {
        render(<LoadingState variant="linear" message="Please wait..." />);
        expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('should render different sizes', () => {
        const { rerender } = render(<LoadingState size="small" />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();

        rerender(<LoadingState size="medium" />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();

        rerender(<LoadingState size="large" />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
});

describe('LoadingSkeleton', () => {
    it('should render with default height', () => {
        const { container } = render(<LoadingSkeleton />);
        const skeleton = container.firstChild as HTMLElement;
        expect(skeleton).toBeInTheDocument();
    });

    it('should render with custom height', () => {
        const { container } = render(<LoadingSkeleton height={300} />);
        const skeleton = container.firstChild as HTMLElement;
        expect(skeleton).toBeInTheDocument();
    });
});
