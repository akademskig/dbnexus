import { useColorSchemeStore, getColorSchemeColors } from '../stores/colorSchemeStore';

interface DynamicLogoProps {
    size?: number;
    className?: string;
}

export function DynamicLogo({ size = 64, className }: DynamicLogoProps) {
    const colorScheme = useColorSchemeStore((state) => state.colorScheme);
    const colors = getColorSchemeColors(colorScheme);

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            fill="none"
            width={size}
            height={size}
            className={className}
        >
            <defs>
                <linearGradient id={`grad-${colorScheme}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={colors.primaryLight} />
                    <stop offset="100%" stopColor={colors.primary} />
                </linearGradient>
            </defs>

            {/* D shape */}
            <path
                d="M14 12 L14 52 L28 52 C40 52 46 42 46 32 C46 22 40 12 28 12 Z"
                fill="none"
                stroke={`url(#grad-${colorScheme})`}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Circuit lines from D */}
            <line
                x1="46"
                y1="32"
                x2="56"
                y2="32"
                stroke={`url(#grad-${colorScheme})`}
                strokeWidth="2"
            />
            <line
                x1="56"
                y1="32"
                x2="56"
                y2="18"
                stroke={`url(#grad-${colorScheme})`}
                strokeWidth="2"
            />
            <line
                x1="56"
                y1="32"
                x2="56"
                y2="46"
                stroke={`url(#grad-${colorScheme})`}
                strokeWidth="2"
            />

            {/* Connection nodes */}
            <circle
                cx="56"
                cy="18"
                r="3"
                fill="none"
                stroke={`url(#grad-${colorScheme})`}
                strokeWidth="2"
            />
            <circle
                cx="56"
                cy="46"
                r="3"
                fill="none"
                stroke={`url(#grad-${colorScheme})`}
                strokeWidth="2"
            />
            <circle cx="56" cy="32" r="2" fill={`url(#grad-${colorScheme})`} />

            {/* Inner accent */}
            <circle
                cx="28"
                cy="32"
                r="6"
                fill="none"
                stroke={`url(#grad-${colorScheme})`}
                strokeWidth="2"
                opacity="0.5"
            />
            <circle cx="28" cy="32" r="2" fill={`url(#grad-${colorScheme})`} />
        </svg>
    );
}

// Full logo with text
export function DynamicLogoFull({ size = 40, className }: DynamicLogoProps) {
    const colorScheme = useColorSchemeStore((state) => state.colorScheme);
    const colors = getColorSchemeColors(colorScheme);

    return (
        <div
            className={className}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
            <DynamicLogo size={size} />
            <span
                style={{
                    backgroundColor: colors.primary,
                    color: 'white',
                    fontWeight: 800,
                    fontSize: size * 0.35,
                    padding: '0.15rem 0.4rem',
                    fontFamily: '"JetBrains Mono", monospace',
                }}
            >
                DB
            </span>
            <span
                style={{
                    color: colors.primary,
                    fontWeight: 700,
                    fontSize: size * 0.45,
                    fontFamily: '"JetBrains Mono", monospace',
                }}
            >
                Nexus
            </span>
        </div>
    );
}
