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
    font-size: 1.2rem;
    color: var(--color-text-secondary);
    line-height: 1.7;
    margin-bottom: 1rem;
`;

const DonateCard = styled.div`
    background: linear-gradient(135deg, rgba(129, 90, 213, 0.08) 0%, rgba(129, 90, 213, 0.02) 100%);
    border: 1px solid rgba(129, 90, 213, 0.2);
    padding: 2rem;
    border-radius: 8px;
`;

const DonateHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
`;

const BitcoinLogo = styled.img`
    width: 32px;
    height: 32px;
`;

const DonateTitle = styled.h3`
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-primary);
    margin: 0;
`;

const DonateContent = styled.div`
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 1.5rem;
    align-items: start;

    @media (max-width: 600px) {
        grid-template-columns: 1fr;
        justify-items: center;
        text-align: center;
    }
`;

const QrWrapper = styled.div`
    background: white;
    padding: 0.5rem;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

    &:hover {
        transform: scale(1.03);
        box-shadow: 0 8px 30px rgba(129, 90, 213, 0.25);
    }
`;

const QrImage = styled.img`
    width: 120px;
    height: 120px;
    display: block;
    border-radius: 8px;
`;

const AddressSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

const AddressLabel = styled.span`
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const AddressWrapper = styled.div`
    position: relative;
    display: flex;
    align-items: stretch;
`;

const Address = styled.code`
    flex: 1;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    background: rgba(0, 0, 0, 0.3);
    padding: 0.75rem 1rem;
    border-radius: 8px 0 0 8px;
    word-break: break-all;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-right: none;
    line-height: 1.5;
`;

const AddressCopyButton = styled.button<{ $copied?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${(p) => (p.$copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(129, 90, 213, 0.15)')};
    color: ${(p) => (p.$copied ? '#22c55e' : 'var(--color-primary)')};
    border: 1px solid ${(p) => (p.$copied ? 'rgba(34, 197, 94, 0.3)' : 'rgba(129, 90, 213, 0.3)')};
    border-left: none;
    border-radius: 0 8px 8px 0;
    padding: 0 1rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: ${(p) => (p.$copied ? 'rgba(34, 197, 94, 0.25)' : 'rgba(129, 90, 213, 0.25)')};
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
`;

const CopyButton = styled.button<{ $copied?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: ${(p) => (p.$copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(129, 90, 213, 0.15)')};
    color: ${(p) => (p.$copied ? '#22c55e' : 'var(--color-primary)')};
    border: 1px solid ${(p) => (p.$copied ? 'rgba(34, 197, 94, 0.3)' : 'rgba(129, 90, 213, 0.3)')};
    border-radius: 8px;
    padding: 0.6rem 1rem;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: ${(p) => (p.$copied ? 'rgba(34, 197, 94, 0.25)' : 'rgba(129, 90, 213, 0.25)')};
        transform: translateY(-1px);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const QrButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: transparent;
    color: var(--color-text);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 0.6rem 1rem;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        border-color: rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.05);
        transform: translateY(-1px);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const DialogOverlay = styled(motion.div)`
    position: fixed;
    inset: 0;
    background: rgba(3, 5, 18, 0.9);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 2rem;
`;

const DialogCard = styled(motion.div)`
    background: linear-gradient(180deg, rgba(30, 30, 40, 1) 0%, rgba(20, 20, 28, 1) 100%);
    border: 1px solid rgba(129, 90, 213, 0.2);
    border-radius: 20px;
    padding: 2rem;
    width: min(90vw, 400px);
    text-align: center;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 80px rgba(129, 90, 213, 0.1);
`;

const DialogHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
`;

const DialogTitle = styled.h3`
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-primary);
    margin: 0;
`;

const DialogSubtitle = styled.p`
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    margin-bottom: 1.5rem;
`;

const DialogQrWrapper = styled.div`
    background: white;
    padding: 1rem;
    border-radius: 16px;
    display: inline-block;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const DialogQrImage = styled.img`
    width: min(60vw, 280px);
    height: auto;
    display: block;
    border-radius: 8px;
`;

const DialogAddress = styled.code`
    display: block;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    margin-top: 1.25rem;
    word-break: break-all;
    line-height: 1.5;
`;

const DialogClose = styled.button`
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--color-text);
    font-size: 0.9rem;
    font-weight: 500;
    padding: 0.6rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    margin-top: 1.5rem;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.2);
    }
`;

const DONATION_ADDRESS =
    'bc1qhrg37apup3dkdmxmmy2kt0xcrufxjekxnd7x9jm3k0lv5lyzyrjqecryqh';
const QR_CODE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=bitcoin:${DONATION_ADDRESS}`;

export function AboutPage() {
    const [copied, setCopied] = useState(false);
    const [qrOpen, setQrOpen] = useState(false);

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
            <Subtitle>A local-first database manager built for speed, safety, and clarity.</Subtitle>

            <Section>
                <SectionTitle>Why DB Nexus</SectionTitle>
                <Paragraph>
                    DB Nexus was created to make everyday database work feel fast and delightful.
                    It brings query editing, schema visualization, syncing, and safety guardrails
                    together in one modern experience.
                </Paragraph>
                <Paragraph>
                    The project is open source and runs locally so you keep full control of your
                    data and infrastructure. Contributions and feedback are always welcome.
                </Paragraph>
            </Section>

            <Section>
                <SectionTitle>Support Development</SectionTitle>
                <Paragraph>
                    If DB Nexus helps you, consider supporting its development. Donations go toward
                    development time and future features.
                </Paragraph>
                <DonateCard>
                    <DonateHeader>
                        <BitcoinLogo
                            src={`${import.meta.env.BASE_URL}Bitcoin.svg.webp`}
                            alt="Bitcoin"
                        />
                        <DonateTitle>Bitcoin</DonateTitle>
                    </DonateHeader>
                    <DonateContent>
                        <QrWrapper onClick={() => setQrOpen(true)} title="Click to enlarge">
                            <QrImage src={QR_CODE_URL} alt="Bitcoin donation QR code" />
                        </QrWrapper>
                        <AddressSection>
                            <div>
                                <AddressLabel>Wallet Address</AddressLabel>
                                <AddressWrapper>
                                    <Address>{DONATION_ADDRESS}</Address>
                                    <AddressCopyButton
                                        type="button"
                                        onClick={handleCopy}
                                        $copied={copied}
                                        title={copied ? 'Copied!' : 'Copy address'}
                                    >
                                        {copied ? (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                            </svg>
                                        )}
                                    </AddressCopyButton>
                                </AddressWrapper>
                            </div>
                            <ButtonGroup>
                                <CopyButton type="button" onClick={handleCopy} $copied={copied}>
                                    {copied ? (
                                        <>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                            </svg>
                                            Copy Address
                                        </>
                                    )}
                                </CopyButton>
                                <QrButton type="button" onClick={() => setQrOpen(true)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="7" height="7" />
                                        <rect x="14" y="3" width="7" height="7" />
                                        <rect x="3" y="14" width="7" height="7" />
                                        <rect x="14" y="14" width="3" height="3" />
                                        <rect x="18" y="14" width="3" height="3" />
                                        <rect x="14" y="18" width="3" height="3" />
                                        <rect x="18" y="18" width="3" height="3" />
                                    </svg>
                                    Enlarge QR
                                </QrButton>
                            </ButtonGroup>
                        </AddressSection>
                    </DonateContent>
                </DonateCard>
            </Section>

            <AnimatePresence>
                {qrOpen && (
                    <DialogOverlay
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setQrOpen(false)}
                    >
                        <DialogCard
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <DialogHeader>
                                <BitcoinLogo
                                    src={`${import.meta.env.BASE_URL}Bitcoin.svg.webp`}
                                    alt="Bitcoin"
                                    style={{ width: 28, height: 28 }}
                                />
                                <DialogTitle>Donate Bitcoin</DialogTitle>
                            </DialogHeader>
                            <DialogSubtitle>Scan with your wallet app</DialogSubtitle>
                            <DialogQrWrapper>
                                <DialogQrImage src={QR_CODE_URL} alt="Bitcoin donation QR code" />
                            </DialogQrWrapper>
                            <DialogAddress>{DONATION_ADDRESS}</DialogAddress>
                            <DialogClose type="button" onClick={() => setQrOpen(false)}>
                                Close
                            </DialogClose>
                        </DialogCard>
                    </DialogOverlay>
                )}
            </AnimatePresence>
        </DocsLayout>
    );
}
