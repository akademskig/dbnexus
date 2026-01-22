import { SvgIcon, SvgIconProps } from '@mui/material';

export function QueryTemplateIcon(props: SvgIconProps) {
    return (
        <SvgIcon {...props} viewBox="0 0 24 24">
            {/* Window/Browser frame with rounded corners */}
            <rect
                x="2"
                y="4"
                width="20"
                height="16"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            {/* Top bar/header */}
            <rect x="2" y="4" width="20" height="3" rx="2" fill="currentColor" opacity="0.3" />
            <line
                x1="2"
                y1="7"
                x2="22"
                y2="7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            {/* Left angle bracket < */}
            <path
                d="M10 10 L7 13 L10 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Forward slash / */}
            <line
                x1="12.5"
                y1="10"
                x2="11.5"
                y2="16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            {/* Right angle bracket > */}
            <path
                d="M14 10 L17 13 L14 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </SvgIcon>
    );
}
