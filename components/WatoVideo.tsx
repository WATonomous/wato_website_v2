import { artBox, PIONEER_STILL } from "./Humanoid3D/artBox";

interface WatoVideoProps {
    transparent?: boolean;
    gutter?: boolean;
    /** Hide the still of the Pioneers (the landing page swaps in live 3D ones over it). */
    hideStill?: boolean;
}

// The alley animation (with the drawn robot painted out) and a still of the 3D Pioneers standing in it.
const WatoVideo = ({ transparent = false, gutter = false, hideStill = false }: WatoVideoProps) => {
    return (
        <div
            className={`${
                transparent ? "opacity-30" : ""
            } relative h-screen w-screen overflow-hidden bg-VideoPlaceholder bg-cover bg-bottom`}
            style={{ scrollbarGutter: gutter ? "stable" : "unset" }}
        >
            <video
                autoPlay
                playsInline
                muted
                loop
                className={`absolute inset-0 h-full w-full object-cover object-bottom`}
            >   
                <source src="/imgs/wato-animation-pioneer.mp4" />
                
            </video>
            <img
                src="/imgs/pioneer-landing.png"
                alt=""
                aria-hidden
                className={`pointer-events-none absolute max-w-none ${hideStill ? "invisible" : ""}`}
                style={artBox(PIONEER_STILL.x, PIONEER_STILL.y, PIONEER_STILL.w, PIONEER_STILL.h)}
            />
        </div>
    );
};

export default WatoVideo;
