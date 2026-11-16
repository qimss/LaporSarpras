export function Logo({ inverse = false }: { inverse?: boolean }) {
  return <span className={`logo ${inverse ? "logo-inverse" : ""}`}>L</span>;
}
