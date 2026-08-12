import Image from "next/image";
import Link from "next/link";
import type { Country } from "@/data/mock";
import { CountryFlag } from "@/components/common/CountryFlag";
import { cn } from "@/lib/utils";

const countryImages: Record<string, string> = {
  canada: "/images/news-canada.jpg",
  uk: "/images/news-uk.jpg",
  usa: "/images/news-library.jpg",
  australia: "/images/news-australia.jpg",
  germany: "/images/news-germany.jpg",
  ireland: "/images/news-uk.jpg",
  netherlands: "/images/news-germany.jpg",
  france: "/images/news-library.jpg",
};

export function CountryCard({
  country,
  className,
}: {
  country: Country;
  className?: string;
}) {
  const image = countryImages[country.id] ?? "/images/hero-campus.jpg";

  return (
    <article className={cn("group overflow-hidden", className)}>
      <Link href={`/countries/${country.id}`} className="block">
        {/* Image with overlay */}
        <div className="relative overflow-hidden">
          <Image
            src={image}
            alt={`Study in ${country.name}`}
            width={800}
            height={500}
            className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          {/* Flag + name overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CountryFlag country={country.name} size="md" />
              <h3 className="font-display text-lg font-extrabold text-white leading-none">
                {country.name}
              </h3>
            </div>
            <p className="eyebrow text-white/70">{country.universities} universities</p>
          </div>
        </div>

        {/* Stats below image */}
        <div className="border border-t-0 border-border bg-card p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="eyebrow text-muted-foreground">Avg Tuition</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">{country.averageTuition}</p>
            </div>
            <div>
              <p className="eyebrow text-muted-foreground">Main Intake</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">{country.popularIntake}</p>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
