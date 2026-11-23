// Stand-in for next/link in the static preview: a plain anchor. preview/main.tsx
// turns clicks on "/path" links into hash routes.
import type { AnchorHTMLAttributes } from "react";

export default function Link({ href, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a href={href} {...rest} />;
}
