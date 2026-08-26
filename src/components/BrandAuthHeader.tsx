import Image from "next/image";
import Link from "next/link";

export default function BrandAuthHeader() {
  return (
    <Link className="standalone-brand" href="/" aria-label="Arva Tracker — halaman utama">
      <Image src="/brand/arva-tracker-symbol.png" alt="Logo Arva Tracker" width={104} height={104} priority />
      <span><b>Arva Tracker</b><small>Langkah kecil, perubahan besar.</small></span>
    </Link>
  );
}
