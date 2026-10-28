import Link from "next/link";
import { useState } from "react";
import WatoVideo from "../components/WatoVideo";
import ProjectHighlights from "../components/ProjectHighlights";
import PioneerCameo from "../components/Humanoid3D/PioneerCameo";

export default function Home() {
    // Once the live 3D Pioneers are on screen, hide the still of them in the background.
    const [pioneerLive, setPioneerLive] = useState(false);
    return (
        <div className="z-0 w-screen h-screen cursor-pointer overflow-hidden bg-VideoPlaceholder bg-cover">
            <Link href="/about" className="fixed">
                <WatoVideo hideStill={pioneerLive} />
            </Link>
            <PioneerCameo onLive={setPioneerLive} />
            {/* //Links are internal to the highlight component; div blocks the links on mobile */}
            <div className="[@media(hover:none)_and_(pointer:coarse){&}]:hidden">
                <ProjectHighlights/>
            </div>
            <div className="fixed z-0 h-screen w-screen bg-TopGradient pointer-events-none" />
        </div>
    );
}
