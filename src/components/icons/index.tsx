'use client'

// BDR OS v2 — Custom SVG Icon Library
// All icons are custom-drawn, stroke-based, 24x24 viewBox
// No Heroicons, Lucide, FontAwesome, or any stock library
// Colors inherit from context via currentColor

import React from 'react'

interface IconProps {
  size?: number
  className?: string
  strokeWidth?: number
}

const defaultProps = { size: 20, strokeWidth: 2 }

// ── Helper: base SVG wrapper ──────────────────────────────────────────────────
function Icon({
  size = 20,
  className = '',
  strokeWidth = 2,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// ── Navigation Icons ──────────────────────────────────────────────────────────

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" />
    </Icon>
  )
}

export function TodayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M3 9H21" />
      <path d="M8 2V6M16 2V6" />
      <path d="M8 14L10.5 16.5L16 11" strokeWidth={2.5} />
    </Icon>
  )
}

export function TrainIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 3H22" />
      <path d="M2 8H22" />
      <path d="M2 13H14" />
      <path d="M2 18H10" />
      <circle cx="19" cy="16" r="4" />
      <path d="M19 14V16.5L20.5 18" />
    </Icon>
  )
}

export function WinsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2L14.9 9.26L22.9 9.27L16.8 14.14L19.1 21.5L12 17L4.9 21.5L7.2 14.14L1.1 9.27L9.1 9.26L12 2Z" />
    </Icon>
  )
}

export function CoachIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2C6.48 2 2 6.48 2 12C2 14.4 2.85 16.6 4.27 18.33L3 22L7 20.73C8.57 21.54 10.23 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" />
      <path d="M8 10H8.01M12 10H12.01M16 10H16.01" strokeWidth={3} />
    </Icon>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Icon>
  )
}

export function DashboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </Icon>
  )
}

// ── Action Icons ──────────────────────────────────────────────────────────────

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12L9 17L20 6" strokeWidth={2.5} />
    </Icon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5V19M5 12H19" />
    </Icon>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12H19M13 6L19 12L13 18" />
    </Icon>
  )
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 12H5M11 18L5 12L11 6" />
    </Icon>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6L15 12L9 18" />
    </Icon>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9L12 15L18 9" />
    </Icon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6L18 18M18 6L6 18" />
    </Icon>
  )
}

export function BackIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 12H4M10 6L4 12L10 18" />
    </Icon>
  )
}

// ── Content Icons ─────────────────────────────────────────────────────────────

export function BookIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20V22H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z" />
      <path d="M8 7H16M8 11H12" />
    </Icon>
  )
}

export function DocumentIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 2H6A2 2 0 0 0 4 4V20A2 2 0 0 0 6 22H18A2 2 0 0 0 20 20V8L14 2Z" />
      <path d="M14 2V8H20" />
      <path d="M8 13H16M8 17H12" />
    </Icon>
  )
}

export function LinkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Icon>
  )
}

export function VideoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M16 10L22 6V18L16 14" />
    </Icon>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M10 8L16 12L10 16V8Z" fill="currentColor" stroke="none" />
    </Icon>
  )
}

// ── Belt / Progress Icons ─────────────────────────────────────────────────────

export function BeltIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="9" width="20" height="6" rx="3" />
      <rect x="9" y="8" width="6" height="8" rx="1" />
    </Icon>
  )
}

export function TrophyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 2H18V12A6 6 0 0 1 6 12V2Z" />
      <path d="M6 7H3A3 3 0 0 0 3 13L6 13" />
      <path d="M18 7H21A3 3 0 0 1 21 13H18" />
      <path d="M12 18V22" />
      <path d="M8 22H16" />
    </Icon>
  )
}

export function FlameIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.5 14.5A4.5 4.5 0 0 0 12 19a4.5 4.5 0 0 0 4.5-4.5c0-2.5-1.5-4-1.5-4S14 13 12 13c-2 0-3.5-1-3.5-1S8.5 12 8.5 14.5Z" />
      <path d="M12 2C12 2 15 6 15 9C15 11 13.5 12.5 12 13C10.5 12.5 9 11 9 9C9 6 12 2 12 2Z" />
    </Icon>
  )
}

export function StarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2L14.9 9.26L22.9 9.27L16.8 14.14L19.1 21.5L12 17L4.9 21.5L7.2 14.14L1.1 9.27L9.1 9.26L12 2Z" />
    </Icon>
  )
}

export function StarFilledIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M12 2L14.9 9.26L22.9 9.27L16.8 14.14L19.1 21.5L12 17L4.9 21.5L7.2 14.14L1.1 9.27L9.1 9.26L12 2Z"
        fill="currentColor"
        stroke="none"
      />
    </Icon>
  )
}

export function XpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="9"
        fontWeight="800"
        fill="currentColor"
        stroke="none"
        fontFamily="Inter, sans-serif"
      >
        XP
      </text>
    </Icon>
  )
}

// ── Notification Icons ────────────────────────────────────────────────────────

export function BellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" />
      <path d="M13.73 21A2 2 0 0 1 10.27 21" />
    </Icon>
  )
}

export function BellDotIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" />
      <path d="M13.73 21A2 2 0 0 1 10.27 21" />
      <circle cx="19" cy="5" r="4" fill="currentColor" stroke="none" />
    </Icon>
  )
}

// ── Analytics / Data Icons ────────────────────────────────────────────────────

export function ChartRisingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M22 7L13.5 15.5L8.5 10.5L2 17" />
      <path d="M16 7H22V13" />
    </Icon>
  )
}

export function BarChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3"  y="14" width="4" height="7" rx="1" />
      <rect x="10" y="9"  width="4" height="12" rx="1" />
      <rect x="17" y="5"  width="4" height="16" rx="1" />
      <path d="M2 21H22" />
    </Icon>
  )
}

export function PipelineIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="4" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="20" cy="12" r="2" />
      <path d="M6 12H10M14 12H18" />
      <path d="M4 6V10M12 6V10M20 6V10M4 14V18M12 14V18M20 14V18" />
    </Icon>
  )
}

// ── User / Team Icons ─────────────────────────────────────────────────────────

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20C4 17.8 7.6 16 12 16C16.4 16 20 17.8 20 20" />
    </Icon>
  )
}

export function TeamIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="15" cy="8" r="3" />
      <path d="M3 20C3 17.8 5.7 16 9 16" />
      <path d="M15 16C18.3 16 21 17.8 21 20" />
      <path d="M9 16C11.2 16 13.3 16.7 15 18" />
    </Icon>
  )
}

export function OrgChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="9" y="2"  width="6" height="4" rx="1" />
      <rect x="2" y="10" width="6" height="4" rx="1" />
      <rect x="9" y="10" width="6" height="4" rx="1" />
      <rect x="16" y="10" width="6" height="4" rx="1" />
      <path d="M12 6V10" />
      <path d="M5 14V18" />
      <path d="M12 14V18" />
      <path d="M19 14V18" />
      <path d="M5 10V7H19V10" />
    </Icon>
  )
}

// ── Product Icons ─────────────────────────────────────────────────────────────

export function DatabaseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V12C3 13.66 7.03 15 12 15C16.97 15 21 13.66 21 12V5" />
      <path d="M3 12V19C3 20.66 7.03 22 12 22C16.97 22 21 20.66 21 19V12" />
    </Icon>
  )
}

export function CoinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7V17" />
      <path d="M14.5 9.5C14.5 8.12 13.38 7 12 7C10.62 7 9.5 8.12 9.5 9.5C9.5 10.88 10.62 12 12 12C13.38 12 14.5 13.12 14.5 14.5C14.5 15.88 13.38 17 12 17C10.62 17 9.5 15.88 9.5 14.5" />
    </Icon>
  )
}

export function PhoneIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M22 16.92V19.92A2 2 0 0 1 19.93 21.98C16.86 21.66 13.93 20.59 11.36 18.81C8.96 17.18 6.94 15.17 5.31 12.77C3.52 10.19 2.44 7.24 2.13 4.16A2 2 0 0 1 4.1 2H7.1A2 2 0 0 1 9.1 3.72C9.37 5.13 9.83 6.5 10.47 7.79A2 2 0 0 1 9.97 9.93L8.72 11.18C10.27 13.67 12.33 15.73 14.82 17.28L16.07 16.03A2 2 0 0 1 18.21 15.53C19.5 16.17 20.87 16.63 22.28 16.9A2 2 0 0 1 22 16.92Z" />
    </Icon>
  )
}

export function IntegrationIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2"  y="2" width="8" height="8" rx="2" />
      <rect x="14" y="2" width="8" height="8" rx="2" />
      <rect x="2"  y="14" width="8" height="8" rx="2" />
      <circle cx="18" cy="18" r="4" />
      <path d="M10 6H14M10 18H14M6 10V14M18 10V14M16 18H20M18 16V20" />
    </Icon>
  )
}

export function HubIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="3"  r="2" />
      <circle cx="21" cy="8"  r="2" />
      <circle cx="21" cy="16" r="2" />
      <circle cx="12" cy="21" r="2" />
      <circle cx="3"  cy="16" r="2" />
      <circle cx="3"  cy="8"  r="2" />
      <path d="M12 5V9M19.3 9.5L14.5 11M19.3 14.5L14.5 13M12 15V19M9.5 13L4.7 14.5M9.5 11L4.7 9.5" />
    </Icon>
  )
}

export function ProductsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="3" width="7" height="7" rx="1" />
      <rect x="15" y="3" width="7" height="7" rx="1" />
      <rect x="2" y="14" width="7" height="7" rx="1" />
      <rect x="15" y="14" width="7" height="7" rx="1" />
    </Icon>
  )
}

export function HandshakeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 8C14 8 13 7 12 7C11 7 9 8 9 8L4 12L6 14L9 11" />
      <path d="M10 8C10 8 11 9 12 9C13 9 15 8 15 8L20 12L18 14L15 11" />
      <path d="M6 14L9 17L15 17L18 14" />
      <path d="M9 17L9 20M15 17L15 20" />
    </Icon>
  )
}

export function DocumentSignIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 2H6A2 2 0 0 0 4 4V20A2 2 0 0 0 6 22H18A2 2 0 0 0 20 20V8L14 2Z" />
      <path d="M14 2V8H20" />
      <path d="M7 14H15M7 18H11" />
      <path d="M15 15L17 17L21 13" strokeWidth={2.5} />
    </Icon>
  )
}

export function ChecklistIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 5H7A2 2 0 0 0 5 7V19A2 2 0 0 0 7 21H17A2 2 0 0 0 19 19V7A2 2 0 0 0 17 5H15" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12L11 14L15 10" />
      <path d="M9 17H15" />
    </Icon>
  )
}

export function TargetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      <path d="M22 12H20M4 12H2M12 22V20M12 4V2" />
    </Icon>
  )
}

// ── UI Utility Icons ──────────────────────────────────────────────────────────

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21L16.65 16.65" />
    </Icon>
  )
}

export function FilterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" />
    </Icon>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 6H21M3 12H21M3 18H21" />
    </Icon>
  )
}

export function MoreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="5"  r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16V12M12 8H12.01" strokeWidth={2.5} />
    </Icon>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.29 3.86L1.82 18A2 2 0 0 0 3.54 21H20.46A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z" />
      <path d="M12 9V13M12 17H12.01" strokeWidth={2.5} />
    </Icon>
  )
}

export function SuccessIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M7 12L10 15L17 8" strokeWidth={2.5} />
    </Icon>
  )
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 13V19A2 2 0 0 1 16 21H5A2 2 0 0 1 3 19V8A2 2 0 0 1 5 6H11" />
      <path d="M15 3H21V9" />
      <path d="M10 14L21 3" />
    </Icon>
  )
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4A2 2 0 0 1 2 13V4A2 2 0 0 1 4 2H13A2 2 0 0 1 15 4V5" />
    </Icon>
  )
}

export function EditIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 4H4A2 2 0 0 0 2 6V20A2 2 0 0 0 4 22H18A2 2 0 0 0 20 20V13" />
      <path d="M18.5 2.5A2.12 2.12 0 0 1 21 5L12 14L8 15L9 11L18.5 2.5Z" />
    </Icon>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 6H21" />
      <path d="M19 6L18.1 19.1A2 2 0 0 1 16.1 21H7.9A2 2 0 0 1 5.9 19.1L5 6" />
      <path d="M8 6V4A2 2 0 0 1 10 2H14A2 2 0 0 1 16 4V6" />
    </Icon>
  )
}

export function LogoutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H9" />
      <path d="M16 17L21 12L16 7" />
      <path d="M21 12H9" />
    </Icon>
  )
}

export function UploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15" />
      <path d="M17 8L12 3L7 8" />
      <path d="M12 3V15" />
    </Icon>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15" />
      <path d="M7 10L12 15L17 10" />
      <path d="M12 15V3" />
    </Icon>
  )
}

export function MailIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 6L12 13L22 6" />
    </Icon>
  )
}

export function SlackIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.5 14.5A1.5 1.5 0 1 0 8.5 11.5H7A1.5 1.5 0 0 0 7 14.5H8.5Z" />
      <path d="M15.5 9.5A1.5 1.5 0 1 0 15.5 12.5H17A1.5 1.5 0 0 0 17 9.5H15.5Z" />
      <path d="M14.5 8.5A1.5 1.5 0 1 0 11.5 8.5V10H14.5V8.5Z" />
      <path d="M9.5 15.5A1.5 1.5 0 1 0 12.5 15.5V14H9.5V15.5Z" />
      <path d="M7 12.5A1.5 1.5 0 0 0 8.5 14H10V11H8.5A1.5 1.5 0 0 0 7 12.5Z" />
      <path d="M17 11.5A1.5 1.5 0 0 0 15.5 10H14V13H15.5A1.5 1.5 0 0 0 17 11.5Z" />
      <path d="M11.5 17A1.5 1.5 0 0 0 13 15.5V14H10V15.5A1.5 1.5 0 0 0 11.5 17Z" />
      <path d="M12.5 7A1.5 1.5 0 0 0 11 8.5V10H14V8.5A1.5 1.5 0 0 0 12.5 7Z" />
    </Icon>
  )
}

export function HubspotIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
      <path d="M12 2V5M12 19V22M2 12H5M19 12H22" />
      <path d="M5.64 5.64L7.76 7.76M16.24 16.24L18.36 18.36M5.64 18.36L7.76 16.24M16.24 7.76L18.36 5.64" />
    </Icon>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7A4 4 0 0 1 16 7V11" />
    </Icon>
  )
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2L4 6V12C4 16.42 7.52 20.56 12 22C16.48 20.56 20 16.42 20 12V6L12 2Z" />
      <path d="M9 12L11 14L15 10" strokeWidth={2.5} />
    </Icon>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10H21" />
      <path d="M8 2V6M16 2V6" />
    </Icon>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6V12L16 14" />
    </Icon>
  )
}

export function RefreshIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M1 4V10H7" />
      <path d="M23 20V14H17" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" />
    </Icon>
  )
}

export function EyeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M1 12S5 4 12 4 23 12 23 12 19 20 12 20 1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  )
}

// ── Gamification Icons ────────────────────────────────────────────────────────

export function LightningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
    </Icon>
  )
}

export function MedalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="15" r="7" />
      <path d="M8 6L7 2H17L16 6" />
      <path d="M8 6H16" />
      <path d="M12 10V14L14 16" />
    </Icon>
  )
}

export function LeaderboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="6"  y="11" width="4" height="9" rx="1" />
      <rect x="14" y="7"  width="4" height="13" rx="1" />
      <rect x="1"  y="14" width="4" height="6" rx="1" />
      <rect x="19" y="14" width="4" height="6" rx="1" />
      <path d="M2 21H22" />
    </Icon>
  )
}

export function GrowIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2C12 2 17 7 17 12C17 15.31 14.76 18.09 12 19C9.24 18.09 7 15.31 7 12C7 7 12 2 12 2Z" />
      <path d="M12 19V22" />
      <path d="M8 22H16" />
      <path d="M9 10C9 10 10 12 12 12C14 12 15 10 15 10" />
    </Icon>
  )
}

// Notes/Capture — a speech-bubble silhouette (rounded body + tail), so it never
// gets mistaken for BookIcon (Resources) or DocumentIcon at collapsed-rail size;
// both of those read as a rectangular page and were too close to call at a glance.
export function NoteIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6C4 4.9 4.9 4 6 4H18C19.1 4 20 4.9 20 6V15C20 16.1 19.1 17 18 17H9L5 21V17H6C4.9 17 4 16.1 4 15V6Z" />
      <path d="M8 9H16M8 12.5H13" />
    </Icon>
  )
}

// Agentic CRM — a low, sleek race-car silhouette (front wing, cockpit hump,
// rear wing, two wheels) to read as "engineered speed," distinct from every
// other rounded/organic icon in the set.
export function RaceCarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 15H4" />
      <path d="M20 15H22" />
      <path d="M3.5 15C3.5 12 5 10.5 7 10L8.5 7.5C9 6.7 9.8 6.2 10.7 6.2H14.3C15.4 6.2 16.4 6.8 16.9 7.8L18 10C19.7 10.3 21 11.8 21 13.5V15" />
      <path d="M3.5 15H21" />
      <path d="M8.5 10H16" />
      <circle cx="7" cy="17.5" r="2" />
      <circle cx="17" cy="17.5" r="2" />
      <path d="M9 17.5H15" />
    </Icon>
  )
}

// Learning Center — a stylized brain (learning/coaching), distinct in
// silhouette from the open-book / graduation icons it replaces.
export function BrainIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 4.5C7.3 4.5 6 5.8 6 7.3C4.6 7.7 3.5 9 3.5 10.5C3.5 11.4 3.9 12.2 4.5 12.8C4.2 13.3 4 13.9 4 14.5C4 16.2 5.3 17.6 7 17.7V18.5C7 19.9 8.1 21 9.5 21C10.9 21 12 19.9 12 18.5V7C12 5.6 10.7 4.5 9 4.5Z" />
      <path d="M15 4.5C16.7 4.5 18 5.8 18 7.3C19.4 7.7 20.5 9 20.5 10.5C20.5 11.4 20.1 12.2 19.5 12.8C19.8 13.3 20 13.9 20 14.5C20 16.2 18.7 17.6 17 17.7V18.5C17 19.9 15.9 21 14.5 21C13.1 21 12 19.9 12 18.5V7C12 5.6 13.3 4.5 15 4.5Z" />
      <path d="M9 9.5C9.8 9.5 10.5 10.2 10.5 11" />
      <path d="M15 9.5C14.2 9.5 13.5 10.2 13.5 11" />
      <path d="M7 13.5C7.8 13.5 8.5 12.9 8.7 12.2" />
      <path d="M17 13.5C16.2 13.5 15.5 12.9 15.3 12.2" />
    </Icon>
  )
}

// ── Icon Map (for dynamic icon rendering) ─────────────────────────────────────

export const ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  'home':         HomeIcon,
  'today':        TodayIcon,
  'train':        TrainIcon,
  'wins':         WinsIcon,
  'coach':        CoachIcon,
  'settings':     SettingsIcon,
  'dashboard':    DashboardIcon,
  'database':     DatabaseIcon,
  'chart-rising': ChartRisingIcon,
  'pipeline':     PipelineIcon,
  'handshake':    HandshakeIcon,
  'document-sign': DocumentSignIcon,
  'hub':          HubIcon,
  'coin':         CoinIcon,
  'phone':        PhoneIcon,
  'checklist':    ChecklistIcon,
  'integration':  IntegrationIcon,
  'products':     ProductsIcon,
  'org-chart':    OrgChartIcon,
  'target':       TargetIcon,
  'race-car':     RaceCarIcon,
  'brain':        BrainIcon,
  'note':         NoteIcon,
  'belt':         BeltIcon,
  'trophy':       TrophyIcon,
  'flame':        FlameIcon,
  'star':         StarIcon,
  'bell':         BellIcon,
  'bell-dot':     BellDotIcon,
  'leaderboard':  LeaderboardIcon,
  'lightning':    LightningIcon,
  'medal':        MedalIcon,
  'grow':         GrowIcon,
  'book':         BookIcon,
  'lock':         LockIcon,
  'shield':       ShieldIcon,
  'logout':       LogoutIcon,
  'mail':         MailIcon,
  'slack':        SlackIcon,
  'hubspot':      HubspotIcon,
}

export function DynamicIcon({ name, ...props }: { name: string } & IconProps) {
  const Component = ICON_MAP[name]
  if (!Component) return <Icon {...props}><circle cx="12" cy="12" r="10" /></Icon>
  return <Component {...props} />
}
