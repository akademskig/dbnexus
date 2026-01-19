import { Link, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';

const Sidebar = styled.aside`
    width: 240px;
    flex-shrink: 0;
    position: sticky;
    top: 90px;
    height: fit-content;
    max-height: calc(100vh - 120px);
    overflow-y: auto;

    @media (max-width: 900px) {
        display: none;
    }
`;

const SidebarSection = styled.div`
    margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h4`
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
    margin-bottom: 0.6rem;
    padding-left: 0.875rem;
`;

const NavList = styled.ul`
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
`;

const NavItemBase = `
    display: block;
    padding: 0.85rem 1.1rem;
    font-size: 1.1rem;
    transition: all 0.15s;

    &:hover {
        color: var(--color-text);
        background: rgba(255, 255, 255, 0.03);
    }
`;

const NavItem = styled(Link)<{ $active?: boolean }>`
    ${NavItemBase}
    color: ${(props) => (props.$active ? 'var(--color-text)' : 'var(--color-text-secondary)')};
    background: ${(props) => (props.$active ? 'rgba(99, 102, 241, 0.1)' : 'transparent')};
    border-left: 2px solid ${(props) => (props.$active ? 'var(--color-primary)' : 'transparent')};
`;

const ExternalNavItem = styled.a`
    ${NavItemBase}
    color: var(--color-text-secondary);
    background: transparent;
    border-left: 2px solid transparent;
`;

const navigation = [
    {
        title: 'Getting Started',
        items: [
            { label: 'Installation', href: '/docs/getting-started' },
            { label: 'CLI Reference', href: '/docs/cli' },
        ],
    },
    {
        title: 'Features',
        items: [
            { label: 'Overview', href: '/docs/features' },
            { label: 'Keyboard Shortcuts', href: '/docs/shortcuts' },
        ],
    },
    {
        title: 'Resources',
        items: [
            { label: 'Changelog', href: '/changelog' },
            { label: 'GitHub', href: 'https://github.com/akademskig/dbnexus', external: true },
        ],
    },
];

export function DocsSidebar() {
    const location = useLocation();

    return (
        <Sidebar>
            {navigation.map((section) => (
                <SidebarSection key={section.title}>
                    <SectionTitle>{section.title}</SectionTitle>
                    <NavList>
                        {section.items.map((item) =>
                            item.external ? (
                                <ExternalNavItem
                                    key={item.href}
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {item.label} ↗
                                </ExternalNavItem>
                            ) : (
                                <NavItem
                                    key={item.href}
                                    to={item.href}
                                    $active={location.pathname === item.href}
                                >
                                    {item.label}
                                </NavItem>
                            )
                        )}
                    </NavList>
                </SidebarSection>
            ))}
        </Sidebar>
    );
}
