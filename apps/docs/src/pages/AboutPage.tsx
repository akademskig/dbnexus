import { useState } from 'react';
import styled from '@emotion/styled';
import { motion, AnimatePresence } from 'framer-motion';
import { DocsLayout } from '../components/DocsLayout';

const Title = styled.h1`
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 1rem;
`;

const Subtitle = styled.p`
    color: var(--color-text-secondary);
    font-size: 1.25rem;
    margin-bottom: 2rem;
`;

const Section = styled.section`
    margin-bottom: 2.5rem;
`;

const SectionTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
`;

const Paragraph = styled.p`
    font-size: 1.1rem;
    color: var(--color-text-secondary);
    line-height: 1.7;
    margin-bottom: 1rem;
`;

const DonateButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(247, 147, 26, 0.1);
    border: 1px solid rgba(247, 147, 26, 0.25);
    border-radius: 8px;
    padding: 0.75rem 1.25rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: rgba(247, 147, 26, 0.15);
        border-color: rgba(247, 147, 26, 0.4);
        transform: translateY(-1px);
    }
`;

const BitcoinIcon = styled.img`
    width: 28px;
    height: 28px;
`;

const DonateLabel = styled.span`
    font-size: 0.95rem;
    font-weight: 600;
    color: #f7931a;
`;

const DialogOverlay = styled(motion.div)`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 2rem;
`;

const DialogCard = styled(motion.div)`
    background: var(--color-bg-secondary);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 2rem;
    width: min(90vw, 400px);
    text-align: center;
`;

const DialogHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
`;

const DialogTitle = styled.h3`
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
`;

const QrWrapper = styled.div`
    background: white;
    padding: 1rem;
    border-radius: 8px;
    display: inline-block;
    margin-bottom: 1.5rem;
`;

const QrImage = styled.img`
    width: 200px;
    height: 200px;
    display: block;
    border-radius: 4px;
`;

const AddressWrapper = styled.div`
    display: flex;
    align-items: stretch;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
    margin-bottom: 1.5rem;
`;

const AddressInput = styled.input`
    flex: 1;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    padding: 0.75rem;
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    outline: none;
    min-width: 0;
`;

const CopyButton = styled.button<{ $copied?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${(p) => (p.$copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)')};
    color: ${(p) => (p.$copied ? '#22c55e' : 'var(--color-text-secondary)')};
    border: none;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: ${(p) => (p.$copied ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255, 255, 255, 0.1)')};
        color: ${(p) => (p.$copied ? '#22c55e' : 'var(--color-text)')};
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const CloseButton = styled.button`
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    padding: 0.6rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--color-text);
    }
`;

const DONATION_ADDRESS = 'bc1qhrg37apup3dkdmxmmy2kt0xcrufxjekxnd7x9jm3k0lv5lyzyrjqecryqh';
const QR_CODE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=bitcoin:${DONATION_ADDRESS}`;

export function AboutPage() {
    const [copied, setCopied] = useState(false);
    const [open, setOpen] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(DONATION_ADDRESS);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <DocsLayout>
            <Title>About DB Nexus</Title>
            <Subtitle>
                A local-first database manager built for speed, safety, and clarity.
            </Subtitle>

            <Section>
                <SectionTitle>Why DB Nexus</SectionTitle>
                <Paragraph>
                    DB Nexus was created to make everyday database work feel fast and delightful. It
                    brings query editing, schema visualization, syncing, and safety guardrails
                    together in one modern experience.
                </Paragraph>
                <Paragraph>
                    The project is open source and runs locally so you keep full control of your
                    data and infrastructure. Contributions and feedback are always welcome.
                </Paragraph>
            </Section>

            <Section>
                <SectionTitle>Support Development</SectionTitle>
                <Paragraph>If DB Nexus helps you, consider supporting its development.</Paragraph>
                <DonateButton type="button" onClick={() => setOpen(true)}>
                    <BitcoinIcon
                        src={`${import.meta.env.BASE_URL}Bitcoin.svg.webp`}
                        alt="Bitcoin"
                    />
                    <DonateLabel>Donate Bitcoin</DonateLabel>
                </DonateButton>
            </Section>

            <AnimatePresence>
                {open && (
                    <DialogOverlay
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(false)}
                    >
                        <DialogCard
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <DialogHeader>
                                <BitcoinIcon
                                    src={`${import.meta.env.BASE_URL}Bitcoin.svg.webp`}
                                    alt="Bitcoin"
                                />
                                <DialogTitle>Donate Bitcoin</DialogTitle>
                            </DialogHeader>
                            <QrWrapper>
                                <QrImage src={QR_CODE_URL} alt="Bitcoin QR code" />
                            </QrWrapper>
                            <AddressWrapper>
                                <AddressInput
                                    type="text"
                                    value={DONATION_ADDRESS}
                                    readOnly
                                    onClick={(e) => e.currentTarget.select()}
                                />
                                <CopyButton
                                    type="button"
                                    onClick={handleCopy}
                                    $copied={copied}
                                    title={copied ? 'Copied!' : 'Copy address'}
                                >
                                    {copied ? (
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                        >
                                            <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                    ) : (
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <rect x="9" y="9" width="13" height="13" rx="2" />
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                        </svg>
                                    )}
                                </CopyButton>
                            </AddressWrapper>
                            <CloseButton type="button" onClick={() => setOpen(false)}>
                                Close
                            </CloseButton>
                        </DialogCard>
                    </DialogOverlay>
                )}
            </AnimatePresence>
        </DocsLayout>
    );
}
