import { ReactNode } from 'react';
import styled from '@emotion/styled';
import { DocsSidebar } from './DocsSidebar';

const Container = styled.div`
    max-width: 1100px;
    margin: 0 auto;
    padding: 2.5rem 2rem;
    display: flex;
    gap: 3rem;

    @media (max-width: 900px) {
        flex-direction: column;
        gap: 0;
    }
`;

const Content = styled.div`
    flex: 1;
    min-width: 0;
`;

interface DocsLayoutProps {
    children: ReactNode;
}

export function DocsLayout({ children }: DocsLayoutProps) {
    return (
        <Container>
            <DocsSidebar />
            <Content>{children}</Content>
        </Container>
    );
}
