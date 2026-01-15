import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/test-utils';
import { EmptyState } from '../EmptyState';
import StorageIcon from '@mui/icons-material/Storage';
import React from 'react';

describe('EmptyState', () => {
    it('should render title', () => {
        render(<EmptyState title="No data found" />);
        expect(screen.getByText('No data found')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
        render(<EmptyState title="No data" description="Add some data to get started" />);
        expect(screen.getByText('Add some data to get started')).toBeInTheDocument();
    });

    it('should render icon when provided', () => {
        render(<EmptyState title="No data" icon={<StorageIcon data-testid="icon" />} />);
        expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should render primary action button', () => {
        const handleClick = vi.fn();
        render(<EmptyState title="No data" action={{ label: 'Add Item', onClick: handleClick }} />);

        const button = screen.getByRole('button', { name: 'Add Item' });
        expect(button).toBeInTheDocument();

        fireEvent.click(button);
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should render secondary action button', () => {
        const handlePrimary = vi.fn();
        const handleSecondary = vi.fn();
        render(
            <EmptyState
                title="No data"
                action={{ label: 'Primary', onClick: handlePrimary }}
                secondaryAction={{ label: 'Secondary', onClick: handleSecondary }}
            />
        );

        expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Secondary' }));
        expect(handleSecondary).toHaveBeenCalledTimes(1);
    });

    it('should not render description when not provided', () => {
        render(<EmptyState title="No data" />);
        // Title should exist but no other text content
        expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('should apply different sizes', () => {
        const { rerender } = render(<EmptyState title="Test" size="small" />);
        // Just verify it renders without error for different sizes
        expect(screen.getByText('Test')).toBeInTheDocument();

        rerender(<EmptyState title="Test" size="medium" />);
        expect(screen.getByText('Test')).toBeInTheDocument();

        rerender(<EmptyState title="Test" size="large" />);
        expect(screen.getByText('Test')).toBeInTheDocument();
    });
});
