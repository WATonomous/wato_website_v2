import Image from "next/image";
import { Fragment, useState } from "react";
import { useModal } from "../lib/ModalContext";
import { SponsorCardProps } from "../components/Sponsor/SponsorCard";
import { Check, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { useInView } from "react-intersection-observer";
import eveHero from "../public/imgs/projects/eve/eve-hero.jpg";
import ats from "../public/imgs/sponsors/ats.png";
import weef from "../public/imgs/sponsors/weef.avif";
import mef from "../public/imgs/sponsors/mef.avif";
import avril from "../public/imgs/sponsors/avril.jpg";
import lumentum from "../public/imgs/sponsors/lumentum.png";
import intel from "../public/imgs/sponsors/intel.png";
import trimble from "../public/imgs/sponsors/trimble.png";
import altium from "../public/imgs/sponsors/altium.png";
import onep from "../public/imgs/sponsors/1 password.svg";
import google from "../public/imgs/sponsors/google.webp";
import github from "../public/imgs/sponsors/github.png";
import teleport from "../public/imgs/sponsors/teleport.png";
import cloudflare from "../public/imgs/sponsors/cloudflare.png";
import sentry from "../public/imgs/sponsors/sentry.png";
import elastic from "../public/imgs/sponsors/elastic.svg";
import velodyne from "../public/imgs/sponsors/velodyne.png";
import gm from "../public/imgs/sponsors/gm.png";
import foxglove from "../public/imgs/sponsors/foxglove.png";

const GOLD_SPONSORS: SponsorCardProps[] = [
    {
        title: "ATS",
        image: ats,
    },
    {
        title: "WEEF",
        image: weef,
    },
    {
        title: "MEF",
        image: mef,
    },
    {
        title: "AVRIL",
        image: avril,
    },
];

const SILVER_SPONSORS: SponsorCardProps[] = [
    {
        title: "Lumentum",
        image: lumentum,
    },
    {
        title: "Intel",
        image: intel,
    },
];

const BRONZE_SPONSORS: SponsorCardProps[] = [
    // {
    //     title: "Vector",
    //     image: vector,
    // },
    {
        title: "Trimble",
        image: trimble,
    },
];

const PRODUCT_SPONSORS: SponsorCardProps[] = [
    {
        title: "Altium",
        image: altium,
    },
    {
        title: "1Password",
        image: onep,
    },
    {
        title: "Google",
        image: google,
    },
    {
        title: "Github",
        image: github,
    },
    {
        title: "Teleport",
        image: teleport,
    },
    {
        title: "Cloudflare",
        image: cloudflare,
    },
    {
        title: "Sentry",
        image: sentry,
    },
    {
        title: "Elastic",
        image: elastic,
    },
    {
        title: "Velodyne",
        image: velodyne,
    },
    {
        title: "GM",
        image: gm,
    },
    {
        title: "Foxglove",
        image: foxglove,
    },
];

type TierName = "Bronze" | "Silver" | "Gold" | "Platinum";
type BenefitCategory = "Promotion" | "Recruitment";
type FeatureLevel = "none" | "included" | "standard" | "medium" | "large";
type Benefit = {
    label: string;
    category: BenefitCategory;
    values: Record<TierName, FeatureLevel>;
};

const SPONSORSHIP_TIERS: {
    name: TierName;
    price: string;
    tagline: string;
    recommended?: boolean;
}[] = [
    { name: "Bronze", price: "$2,500", tagline: "Great for local supporters" },
    { name: "Silver", price: "$5,000", tagline: "Stronger campus visibility" },
    { name: "Gold", price: "$10,000", tagline: "Best value for hiring + brand", recommended: true },
    { name: "Platinum", price: "$20,000+", tagline: "Maximum visibility and access" },
];

const BENEFITS: Benefit[] = [
    {
        label: "Logo on website",
        category: "Promotion",
        values: {
            Bronze: "included",
            Silver: "included",
            Gold: "included",
            Platinum: "included",
        },
    },
    {
        label: "Logo on vehicle",
        category: "Promotion",
        values: {
            Bronze: "none",
            Silver: "standard",
            Gold: "medium",
            Platinum: "large",
        },
    },
    {
        label: "Logo on team apparel",
        category: "Promotion",
        values: {
            Bronze: "none",
            Silver: "standard",
            Gold: "medium",
            Platinum: "large",
        },
    },
    {
        label: "Logo on social media",
        category: "Promotion",
        values: { Bronze: "none", Silver: "none", Gold: "included", Platinum: "included" },
    },
    {
        label: "Promotional print & yearly banner",
        category: "Promotion",
        values: { Bronze: "none", Silver: "none", Gold: "included", Platinum: "included" },
    },
    {
        label: "Recognition in sponsor presentations",
        category: "Promotion",
        values: {
            Bronze: "included",
            Silver: "included",
            Gold: "included",
            Platinum: "included",
        },
    },
    {
        label: "Recognition among UWaterloo students",
        category: "Promotion",
        values: {
            Bronze: "included",
            Silver: "included",
            Gold: "included",
            Platinum: "included",
        },
    },
    {
        label: "Featured in demos & public events",
        category: "Promotion",
        values: { Bronze: "none", Silver: "none", Gold: "included", Platinum: "included" },
    },
    {
        label: "Dedicated social media spotlight",
        category: "Promotion",
        values: { Bronze: "none", Silver: "none", Gold: "none", Platinum: "included" },
    },
    {
        label: "Featured on website homepage",
        category: "Promotion",
        values: { Bronze: "none", Silver: "none", Gold: "none", Platinum: "included" },
    },
    {
        label: "Mentioned in award ceremonies & news",
        category: "Promotion",
        values: { Bronze: "none", Silver: "none", Gold: "none", Platinum: "included" },
    },
    {
        label: "Opportunities to connect with students",
        category: "Recruitment",
        values: {
            Bronze: "none",
            Silver: "included",
            Gold: "included",
            Platinum: "included",
        },
    },
    {
        label: "Send job postings to team",
        category: "Recruitment",
        values: { Bronze: "none", Silver: "none", Gold: "included", Platinum: "included" },
    },
    {
        label: "Invitation to private vehicle demos",
        category: "Recruitment",
        values: { Bronze: "none", Silver: "none", Gold: "none", Platinum: "included" },
    },
];

const MEDIA_MENTIONS = [
    "The Globe and Mail",
    "CBC",
    "CNBC",
    "570 News",
    "The Amazing Race® Canada",
];

const PRODUCT_DONATION_TYPES = [
    "LiDAR",
    "Cameras",
    "Radar",
    "GPS/IMUs",
    "Computing hardware",
    "Embedded systems",
    "Software licenses",
    "Electronics",
    "Manufacturing services",
    "Testing equipment",
    "Cloud resources",
    "Robotics components",
];

const STATS = [
    "800+ members",
    "50+ active innovators",
    "2nd place SAE AutoDrive",
    "4 faculties",
];

type SponsorTierKind = "Gold" | "Silver" | "Bronze";

const TIER_STYLES: Record<
    SponsorTierKind,
    { accent: string; glow: string }
> = {
    Gold: {
        accent: "#E2B94B",
        glow: "rgba(226,185,75,0.45)",
    },
    Silver: {
        accent: "#9AA7B8",
        glow: "rgba(154,167,184,0.45)",
    },
    Bronze: {
        accent: "#C5875A",
        glow: "rgba(197,135,90,0.45)",
    },
};

const TIERED_MARQUEE_SPONSORS: {
    title: string;
    image: SponsorCardProps["image"];
    tier: SponsorTierKind;
}[] = [
    ...GOLD_SPONSORS.map((s) => ({ ...s, tier: "Gold" as const })),
    ...SILVER_SPONSORS.map((s) => ({ ...s, tier: "Silver" as const })),
    ...BRONZE_SPONSORS.map((s) => ({ ...s, tier: "Bronze" as const })),
];

const SPONSOR_BLURBS: Record<string, string> = {
    ATS: "ATS helps WATonomous scale real-world robotics infrastructure and student impact.",
    WEEF: "WEEF supports student innovation and technical project growth across Waterloo.",
    MEF: "MEF helps fund hands-on engineering work that translates into real systems.",
    AVRIL: "AVRIL enables practical team initiatives that strengthen our product velocity.",
    Lumentum:
        "Lumentum supports critical technology development for autonomy and sensing workflows.",
    Intel: "Intel supports high-performance computing needs for rapid model iteration.",
    Trimble:
        "Trimble contributes enabling technology that strengthens our autonomy stack.",
};

const Sponsor = () => {
    const modalContext = useModal();
    const [expanded, setExpanded] = useState<Record<BenefitCategory, boolean>>({
        Promotion: true,
        Recruitment: true,
    });
    const { ref: sponsorsRef, inView: sponsorsInView } = useInView({
        threshold: 0.2,
        triggerOnce: true,
    });

    const openSponsorConnect = () => {
        modalContext.setSponsorship(true);
        modalContext.setOpen(true);
    };

    const renderFeatureValue = (value: FeatureLevel) => {
        if (value === "none") {
            return (
                <span className="inline-flex items-center justify-center text-slate-500">
                    <Minus size={16} />
                </span>
            );
        }

        if (value === "included") {
            return (
                <span className="inline-flex items-center justify-center text-wato-teal">
                    <Check size={16} />
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-wato-teal/40 bg-wato-teal/10 px-2 py-0.5 text-xs font-medium text-wato-teal">
                <Check size={12} />
                {value === "standard" ? "Standard" : value === "medium" ? "Medium" : "Large"}
            </span>
        );
    };

    return (
        <div className="relative text-white">
            <div className="pointer-events-none fixed inset-0 -z-10">
                <Image
                    src={eveHero}
                    alt="WATonomous Kia Soul EV"
                    fill
                    priority
                    className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-black/30" />
            </div>

            <section className="relative min-h-screen">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-black to-transparent opacity-70" />
                <div className="relative mx-auto flex min-h-screen w-full max-w-[100rem] flex-col justify-end px-8 pb-16 pt-28 md:px-16 lg:w-[90vw] lg:px-0">
                    <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-wato-teal">
                        WATonomous Sponsorship
                    </p>
                    <h1 className="mb-3 max-w-3xl whitespace-pre-line text-4xl font-black">
                        Drive The Future With Us.
                    </h1>
                    <p className="mb-6 max-w-2xl text-sm text-white/90 lg:w-1/2 lg:text-base">
                        Partner with one of Canada&apos;s largest student autonomous
                        vehicle teams and support next-generation engineering talent.
                    </p>
                    <button
                        type="button"
                        onClick={openSponsorConnect}
                        className="mb-10 w-fit rounded-full border border-wato-teal bg-wato-teal/15 px-6 py-2 text-base font-semibold text-wato-teal transition hover:bg-wato-teal hover:text-wato-black-vanta"
                    >
                        Connect With Us
                    </button>
                    <div className="grid gap-3 text-sm font-medium text-white/90 md:grid-cols-4 md:gap-4 md:text-base">
                        {STATS.map((stat) => (
                            <div
                                key={stat}
                                className="rounded-md border border-white/20 bg-black/40 px-4 py-3"
                            >
                                {stat}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="relative bg-black bg-opacity-90 text-sm lg:bg-opacity-80 lg:text-base">
            <section className="border-y border-white/10 py-5">
                <div className="mx-auto w-full max-w-[100rem] px-8 text-sm text-white/90 md:px-16 lg:w-[90vw] lg:px-0 lg:text-base">
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        <span className="font-semibold text-wato-teal">Media Coverage:</span>
                        {MEDIA_MENTIONS.map((outlet, idx) => (
                            <span key={outlet}>
                                {outlet}
                                {idx < MEDIA_MENTIONS.length - 1 ? " · " : ""}
                            </span>
                        ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-3">
                        <span className="font-semibold text-wato-teal">
                            WATonomous alumni now at:
                        </span>
                        <span>NVIDIA · Tesla · AMD · Google · Waymo · Apple · Microsoft</span>
                    </div>
                </div>
            </section>

            <section className="py-16">
                <div className="mx-auto w-full max-w-[100rem] px-8 md:px-16 lg:w-[90vw] lg:px-0">
                    <h2 className="mb-6 text-4xl font-black">
                        About the Team <span className="text-wato-teal">{"//"}</span>
                    </h2>
                    <div className="space-y-4 text-white/90">
                        <p>
                            WATonomous is the University of Waterloo&apos;s student-led
                            autonomous vehicle design team. Our multidisciplinary members
                            design, build, and test real autonomy systems across software,
                            hardware, AI, and systems engineering.
                        </p>
                        <p>
                            We build and iterate on a Level 4 autonomous vehicle platform
                            and compete in high-performance formula autonomous racing.
                            Alongside our vehicle work, teams also push humanoid and rover
                            research to solve challenging real-world autonomy problems.
                        </p>
                        <p>
                            Members work in production-style environments with industry
                            tooling, modern CI workflows, and rapid prototyping cycles.
                            Sponsors help accelerate this pipeline while connecting with
                            high-impact student talent.
                        </p>
                        <p>
                            WATonomous alumni continue into leading companies including
                            NVIDIA, Tesla, AMD, and other top autonomy and software
                            organizations.
                        </p>
                    </div>
                    <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-md border border-white/15 bg-wato-black-vanta px-4 py-3 text-sm">
                            Level 4 autonomous vehicle platform
                        </div>
                        <div className="rounded-md border border-white/15 bg-wato-black-vanta px-4 py-3 text-sm">
                            Formula autonomous racing
                        </div>
                        <div className="rounded-md border border-white/15 bg-wato-black-vanta px-4 py-3 text-sm">
                            Humanoid and rover autonomy research
                        </div>
                        <div className="rounded-md border border-white/15 bg-wato-black-vanta px-4 py-3 text-sm">
                            Alumni at NVIDIA, Tesla, AMD
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-16">
                <div className="mx-auto w-full max-w-[100rem] px-8 md:px-16 lg:w-[90vw] lg:px-0">
                    <h2 className="mb-8 text-4xl font-black">
                        Sponsorship Tiers <span className="text-wato-teal">{"//"}</span>
                    </h2>
                    <div className="overflow-x-auto rounded-xl border border-white/15 bg-[#12161c]">
                        <table className="w-full min-w-[760px] border-collapse">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="w-[380px] px-6 py-4 text-left align-top text-sm font-semibold uppercase tracking-wide text-white/70">
                                        Features
                                    </th>
                                    {SPONSORSHIP_TIERS.map((tier) => (
                                        <th
                                            key={tier.name}
                                            className={`w-[95px] px-2 py-4 text-center align-top ${
                                                tier.recommended
                                                    ? "relative scale-[1.01] border-x border-wato-teal/60 bg-[#16222a]"
                                                    : "bg-[#12161c]"
                                            }`}
                                        >
                                            {tier.recommended && (
                                                <span className="mb-2 inline-block rounded-full bg-wato-teal px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black">
                                                    Most Popular
                                                </span>
                                            )}
                                            <div>
                                                <p className="text-xl font-black text-wato-teal">
                                                    {tier.name}
                                                </p>
                                                <p className="mt-1 text-lg font-semibold text-white">
                                                    {tier.price}
                                                </p>
                                                <p className="mt-3 border-t border-white/10 pt-3 text-xs font-medium text-white/70">
                                                    {tier.tagline}
                                                </p>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(["Promotion", "Recruitment"] as BenefitCategory[]).map(
                                    (category) => (
                                        <Fragment key={`${category}-group`}>
                                            <tr
                                                key={`${category}-header`}
                                                className="border-y border-white/10 bg-black/20"
                                            >
                                                <td className="px-6 py-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setExpanded((prev) => ({
                                                                ...prev,
                                                                [category]: !prev[category],
                                                            }))
                                                        }
                                                        className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-wato-teal"
                                                    >
                                                        {expanded[category] ? (
                                                            <ChevronUp size={16} />
                                                        ) : (
                                                            <ChevronDown size={16} />
                                                        )}
                                                        {category}
                                                    </button>
                                                </td>
                                                <td colSpan={SPONSORSHIP_TIERS.length} />
                                            </tr>
                                            {expanded[category] &&
                                                BENEFITS.filter((b) => b.category === category).map(
                                                    (benefit) => (
                                                        <tr
                                                            key={`${category}-${benefit.label}`}
                                                            className="border-b border-white/5"
                                                        >
                                                            <td className="px-6 py-2 text-sm text-white/85">
                                                                {benefit.label}
                                                            </td>
                                                            {SPONSORSHIP_TIERS.map((tier) => (
                                                                <td
                                                                    key={`${tier.name}-${benefit.label}`}
                                                                    className={`px-2 py-2 text-center ${
                                                                        tier.recommended
                                                                            ? "border-x border-wato-teal/20 bg-[#16222a]"
                                                                            : "bg-[#12161c]"
                                                                    }`}
                                                                >
                                                                    {renderFeatureValue(
                                                                        benefit.values[tier.name]
                                                                    )}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    )
                                                )}
                                        </Fragment>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="py-16">
                <div className="mx-auto w-full max-w-[100rem] px-8 md:px-16 lg:w-[90vw] lg:px-0">
                    <h2 className="mb-4 text-4xl font-black">
                        Product Sponsorship <span className="text-wato-teal">{"//"}</span>
                    </h2>
                    <p className="mb-5 max-w-4xl text-white/90">
                        Product and in-kind sponsors receive Gold-equivalent benefits.
                        If your contribution does not fit a standard package, we can build
                        a custom sponsorship plan.
                    </p>
                    <div className="mb-6 flex flex-wrap gap-2">
                        {PRODUCT_DONATION_TYPES.map((item) => (
                            <span
                                key={item}
                                className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-sm text-white/85"
                            >
                                {item}
                            </span>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={openSponsorConnect}
                        className="rounded-md bg-wato-teal px-6 py-3 text-sm font-semibold text-wato-black-vanta transition hover:opacity-90"
                    >
                        Request a Custom Plan
                    </button>
                </div>
            </section>

            <section className="py-16">
                <div className="mx-auto w-full max-w-[100rem] px-8 md:px-16 lg:w-[90vw] lg:px-0">
                    <div className="mb-8">
                        <h2 className="text-4xl font-black">
                            Current Sponsors <span className="text-wato-teal">{"//"}</span>
                        </h2>
                        <p className="mt-2 text-white/70">
                            Live sponsor showcase with tier-based marquee highlighting.
                        </p>
                    </div>

                    <section
                        ref={sponsorsRef}
                        className={`mb-10 transition-all duration-700 ${
                            sponsorsInView
                                ? "translate-y-0 opacity-100"
                                : "translate-y-6 opacity-0"
                        }`}
                    >
                        <div className="mb-4 flex flex-wrap gap-2">
                            {(["Gold", "Silver", "Bronze"] as SponsorTierKind[]).map((tier) => (
                                <span
                                    key={tier}
                                    className="rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide"
                                    style={{
                                        borderColor: `${TIER_STYLES[tier].accent}66`,
                                        color: TIER_STYLES[tier].accent,
                                    }}
                                >
                                    {tier}
                                </span>
                            ))}
                        </div>

                        <div className="group/marquee relative overflow-hidden rounded-xl border border-white/10 bg-[#12161c] py-10">
                            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#12161c] to-transparent" />
                            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#12161c] to-transparent" />
                            <div
                                className="flex w-max [animation-play-state:running] group-hover/marquee:[animation-play-state:paused]"
                                style={{ animation: "sponsor-marquee 34s linear infinite" }}
                            >
                                {[...TIERED_MARQUEE_SPONSORS, ...TIERED_MARQUEE_SPONSORS].map(
                                    (sponsor, idx) => {
                                        const tierStyle = TIER_STYLES[sponsor.tier];
                                        return (
                                            <div
                                                key={`${sponsor.title}-${idx}`}
                                                className="mx-2"
                                                style={
                                                    {
                                                        "--tier-glow": tierStyle.glow,
                                                    } as React.CSSProperties
                                                }
                                            >
                                                <div
                                                    className="group relative flex h-40 w-72 items-center justify-center overflow-hidden rounded-lg border bg-[#161c24] p-6 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_24px_var(--tier-glow)]"
                                                    style={{
                                                        borderColor: `${tierStyle.accent}44`,
                                                    }}
                                                >
                                                    <Image
                                                        src={sponsor.image}
                                                        alt={`${sponsor.title} sponsor logo`}
                                                        className="max-h-full max-w-full object-contain"
                                                    />
                                                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                                        <p
                                                            className="text-xs font-bold uppercase tracking-wide"
                                                            style={{ color: tierStyle.accent }}
                                                        >
                                                            {sponsor.tier}
                                                        </p>
                                                        <p className="text-sm font-semibold text-white">
                                                            {sponsor.title}
                                                        </p>
                                                        <p className="line-clamp-3 text-xs leading-snug text-white/90">
                                                            {SPONSOR_BLURBS[sponsor.title] ??
                                                                `${sponsor.title} supports WATonomous engineering initiatives.`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="mt-8">
                        <h3 className="mb-4 text-2xl font-black text-wato-teal">Product Sponsors</h3>
                        <div className="group/marquee relative overflow-hidden rounded-xl border border-white/10 bg-[#12161c] py-10">
                            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#12161c] to-transparent" />
                            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#12161c] to-transparent" />
                            <div
                                className="flex w-max [animation-play-state:running] group-hover/marquee:[animation-play-state:paused]"
                                style={{ animation: "sponsor-marquee 28s linear infinite" }}
                            >
                                {[...PRODUCT_SPONSORS, ...PRODUCT_SPONSORS].map((sponsor, idx) => (
                                    <div key={`${sponsor.title}-${idx}`} className="mx-2">
                                        <div className="flex h-32 w-56 items-center justify-center rounded-lg border border-wato-teal/20 bg-[#161c24] p-5 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_24px_rgba(102,221,200,0.35)]">
                                            <Image
                                                src={sponsor.image}
                                                alt={`${sponsor.title} sponsor logo`}
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </section>

            <section className="py-20">
                <div className="mx-auto w-full max-w-[100rem] px-8 text-center md:px-16 lg:w-[90vw] lg:px-0">
                    <h2 className="mb-3 text-4xl font-black">
                        Become a 2026 Sponsor today.
                    </h2>
                    <p className="mb-6 text-white/85">
                        Custom plans are available on request.
                    </p>
                    <button
                        type="button"
                        onClick={openSponsorConnect}
                        className="rounded-md bg-wato-teal px-6 py-3 text-sm font-semibold text-wato-black-vanta transition hover:opacity-90"
                    >
                        Support Us
                    </button>
                </div>
            </section>
            </div>
            <style>{`
                @keyframes sponsor-marquee {
                    from {
                        transform: translateX(0);
                    }
                    to {
                        transform: translateX(-50%);
                    }
                }
            `}</style>
        </div>
    );
};

export default Sponsor;
