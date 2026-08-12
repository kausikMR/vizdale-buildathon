import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
      {...props}
    >
      {children}
    </svg>
  )
}

const strokeProps = {
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 1.8,
}

export function LotusIcon(props: IconProps) {
  return (
    <Icon {...props} viewBox="0 0 32 32">
      <path {...strokeProps} d="M16 26c-2.5-6.8-2.1-12 0-18 2.1 6 2.5 11.2 0 18Z" />
      <path {...strokeProps} d="M15.8 26C9.6 22.6 7 18.2 6 12c5.7 2.6 9.2 6.4 9.8 14Z" />
      <path {...strokeProps} d="M16.2 26c6.2-3.4 8.8-7.8 9.8-14-5.7 2.6-9.2 6.4-9.8 14Z" />
      <path {...strokeProps} d="M4 22c4.1-.2 8 1.1 12 4 4-2.9 7.9-4.2 12-4-2.6 4.3-6.6 6-12 6S6.6 26.3 4 22Z" />
    </Icon>
  )
}

export function BowlIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path {...strokeProps} d="M4 10h16c0 5.2-3.6 9-8 9s-8-3.8-8-9Z" />
      <path {...strokeProps} d="M7 22h10M8 6c1-1.2 1-2.5 0-4M12 6c1-1.2 1-2.5 0-4M16 6c1-1.2 1-2.5 0-4" />
    </Icon>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle {...strokeProps} cx="11" cy="11" r="7" />
      <path {...strokeProps} d="m20 20-4-4" />
    </Icon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path {...strokeProps} d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function EditIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path {...strokeProps} d="m4 20 4.2-1 10.6-10.6a2 2 0 0 0-2.8-2.8L5.4 16.2 4 20Z" />
      <path {...strokeProps} d="m14.5 7.1 2.8 2.8" />
    </Icon>
  )
}

export function BoxesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path {...strokeProps} d="m12 3 7 4-7 4-7-4 7-4Z" />
      <path {...strokeProps} d="m5 7 7 4v9l-7-4V7ZM19 7l-7 4v9l7-4V7Z" />
    </Icon>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path {...strokeProps} d="M12 3 2.8 20h18.4L12 3Z" />
      <path {...strokeProps} d="M12 9v5M12 17.5v.1" />
    </Icon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path {...strokeProps} d="m5 12 4 4L19 6" />
    </Icon>
  )
}

export function ArrowIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path {...strokeProps} d="M5 12h14M14 7l5 5-5 5" />
    </Icon>
  )
}
