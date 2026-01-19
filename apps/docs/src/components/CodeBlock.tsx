import { useState } from 'react';
import styled from '@emotion/styled';

const Container = styled.div`
    position: relative;
    margin: 1rem 0;
`;

const Pre = styled.pre`
    font-family: var(--font-mono);
    background: var(--color-bg-secondary);
    padding: 1.25rem;
    padding-right: 3.5rem;
    overflow-x: auto;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 0.9rem;
    line-height: 1.6;

    code {
        background: none;
        padding: 0;
        color: var(--color-text);
    }

    .comment {
        color: var(--color-text-secondary);
    }

    .keyword {
        color: var(--color-primary-light);
    }

    .string {
        color: var(--color-accent-green);
    }

    .command {
        color: var(--color-accent-orange);
    }
`;

const CopyButton = styled.button<{ $copied: boolean }>`
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: ${(props) =>
        props.$copied ? 'var(--color-accent-green)' : 'var(--color-bg-tertiary)'};
    border: 1px solid
        ${(props) => (props.$copied ? 'var(--color-accent-green)' : 'rgba(255, 255, 255, 0.1)')};
    border-radius: 4px;
    color: ${(props) => (props.$copied ? 'white' : 'var(--color-text-secondary)')};
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.3rem;

    &:hover {
        background: ${(props) =>
            props.$copied ? 'var(--color-accent-green)' : 'rgba(255, 255, 255, 0.1)'};
        color: var(--color-text);
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const Label = styled.div`
    position: absolute;
    top: -0.6rem;
    left: 1rem;
    background: var(--color-bg-tertiary);
    padding: 0.1rem 0.5rem;
    font-size: 0.7rem;
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

interface CodeBlockProps {
    children: string;
    language?: string;
    label?: string;
}

export function CodeBlock({ children, language, label }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Simple syntax highlighting for shell commands
    const highlightCode = (code: string) => {
        if (language === 'bash' || language === 'shell') {
            return code.split('\n').map((line, i) => {
                if (line.trim().startsWith('#')) {
                    return (
                        <span key={i} className="comment">
                            {line}
                            {'\n'}
                        </span>
                    );
                }
                // Highlight command name (first word after optional $)
                const match = line.match(/^(\$?\s*)(\w+)(.*)/);
                if (match) {
                    return (
                        <span key={i}>
                            {match[1]}
                            <span className="command">{match[2]}</span>
                            {match[3]}
                            {'\n'}
                        </span>
                    );
                }
                return line + '\n';
            });
        }
        return code;
    };

    return (
        <Container>
            {label && <Label>{label}</Label>}
            <Pre>
                <code>{highlightCode(children)}</code>
            </Pre>
            <CopyButton onClick={handleCopy} $copied={copied} title="Copy to clipboard">
                {copied ? (
                    <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copied
                    </>
                ) : (
                    <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy
                    </>
                )}
            </CopyButton>
        </Container>
    );
}
