import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-[72px] font-[900] leading-none text-navy-ink/15">404</div>
      <h1 className="mt-2 text-h2 text-dark-text">Page not found</h1>
      <p className="mb-6 mt-1 max-w-sm text-sm text-gray">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link href="/home" className="btn-primary">Back to Home</Link>
    </div>
  )
}
