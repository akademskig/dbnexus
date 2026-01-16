import { Outlet, Link, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';

const Header = styled.header`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: rgba(10, 10, 15, 0.8);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const Nav = styled.nav`
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const Logo = styled(Link)`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 1.25rem;

    span:first-of-type {
        background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
`;

const NavLinks = styled.div`
    display: flex;
    align-items: center;
    gap: 2rem;
`;

const NavLink = styled(Link)<{ $active?: boolean }>`
    color: ${(props) => (props.$active ? 'var(--color-text)' : 'var(--color-text-secondary)')};
    font-weight: 500;
    font-size: 0.95rem;
    transition: color 0.2s;

    &:hover {
        color: var(--color-text);
    }
`;

const GitHubLink = styled.a`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-bg-tertiary);
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.9rem;
    transition: background 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
`;

const Main = styled.main`
    min-height: 100vh;
    padding-top: 72px;
`;

const Footer = styled.footer`
    background: var(--color-bg-secondary);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding: 3rem 2rem;
`;

const FooterContent = styled.div`
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
`;

const FooterText = styled.p`
    color: var(--color-text-secondary);
    font-size: 0.9rem;
`;

const FooterLinks = styled.div`
    display: flex;
    gap: 1.5rem;

    a {
        color: var(--color-text-secondary);
        font-size: 0.9rem;
        transition: color 0.2s;

        &:hover {
            color: var(--color-text);
        }
    }
`;

export function Layout() {
    const location = useLocation();

    return (
        <>
            <Header>
                <Nav>
                    <Logo to="/">
                        <span>DB</span>
                        <span>Nexus</span>
                    </Logo>
                    <NavLinks>
                        <NavLink to="/docs" $active={location.pathname.startsWith('/docs')}>
                            Docs
                        </NavLink>
                        <NavLink
                            to="/docs/features"
                            $active={location.pathname === '/docs/features'}
                        >
                            Features
                        </NavLink>
                        <GitHubLink
                            href="https://github.com/akademskig/dbnexus"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            GitHub
                        </GitHubLink>
                    </NavLinks>
                </Nav>
            </Header>
            <Main>
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Outlet />
                </motion.div>
            </Main>
            <Footer>
                <FooterContent>
                    <FooterText>© 2026 DB Nexus. Open source under MIT License.</FooterText>
                    <FooterLinks>
                        <a
                            href="https://github.com/akademskig/dbnexus"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            GitHub
                        </a>
                        <a
                            href="https://www.npmjs.com/package/dbnexus"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            npm
                        </a>
                        <Link to="/docs">Documentation</Link>
                    </FooterLinks>
                </FooterContent>
            </Footer>
        </>
    );
}
