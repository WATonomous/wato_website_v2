import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import WatoVideo from "../components/WatoVideo";
import ProjectHighlights from "../components/ProjectHighlights";
import PioneerCameo from "../components/Humanoid3D/PioneerCameo";
import { artBox, PIONEER_HOTSPOTS } from "../components/Humanoid3D/artBox";

export default function Home() {
    // Once the live 3D Pioneers are on screen, hide the still of them in the background.
    const [pioneerLive, setPioneerLive] = useState(false);
    return (
        <div className="z-0 w-screen h-screen cursor-pointer overflow-hidden bg-VideoPlaceholder bg-cover">
            <Head>
                {/* Start fetching the 3D model with the page, on the screens that use it (see PioneerCameo). */}
                <link
                    rel="preload"
                    href="/models/pioneer.glb"
                    as="fetch"
                    crossOrigin="anonymous"
                    media="(hover: hover) and (min-aspect-ratio: 23/20)"
                />
            </Head>
            <Link href="/about" className="fixed">
                <WatoVideo hideStill={pioneerLive} />
            </Link>
            <PioneerCameo onLive={setPioneerLive} />
            {/* //Links are internal to the highlight component; div blocks the links on mobile */}
            <div className="[@media(hover:none)_and_(pointer:coarse){&}]:hidden">
                <ProjectHighlights/>
            </div>
            {/* Click targets over both Pioneers, live from the first paint (on phones too), so they
                open the humanoid page even before the 3D has loaded. */}
            <div className="pointer-events-none fixed inset-0">
                {PIONEER_HOTSPOTS.map(([x, y, w, h]) => (
                    <Link
                        key={x}
                        href="/projects/humanoid"
                        aria-label="Pioneer, our humanoid robot"
                        className="pointer-events-auto absolute"
                        style={artBox(x, y, w, h)}
                    />
                ))}
            </div>
            <div className="fixed z-0 h-screen w-screen bg-TopGradient pointer-events-none" />
        </div>
    );
}
