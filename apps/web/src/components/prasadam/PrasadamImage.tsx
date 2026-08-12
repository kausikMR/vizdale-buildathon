import { BowlIcon } from '../icons'

const seedImages: Record<string, string> = {
  Laddu: '/prasadam/laddu.webp',
  Panchamrutham: '/prasadam/panchamrutham.webp',
  Kumkum: '/prasadam/kumkum.webp',
  'Tulsi Garland': '/prasadam/tulsi-garland.webp',
  Vibhuti: '/prasadam/vibhuti.webp',
  'Festival Hamper': '/prasadam/festival-hamper.webp',
}

export function PrasadamImage({
  name,
  className = '',
  decorative = false,
}: {
  name: string
  className?: string
  decorative?: boolean
}) {
  const src = seedImages[name]

  if (!src) {
    return (
      <span
        aria-hidden="true"
        className={`grid place-items-center bg-secondary text-primary ${className}`}
      >
        <BowlIcon className="size-1/2 max-h-12 max-w-12" />
      </span>
    )
  }

  return (
    <img
      alt={decorative ? '' : `${name} prasadam`}
      className={`object-cover ${className}`}
      decoding="async"
      loading="lazy"
      src={src}
    />
  )
}
