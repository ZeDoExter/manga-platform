import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <div className="h-display text-[9rem] leading-none text-accent md:text-[14rem]">404</div>
        <p className="font-display text-2xl">This page was never drawn.</p>
        <p className="mx-auto mt-2 max-w-md text-muted">The panel you’re looking for doesn’t exist — or the creator hasn’t published it yet.</p>
        <Link href="/" className="btn mt-6">Back to the front page</Link>
      </div>
    </div>
  );
}
