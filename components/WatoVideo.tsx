interface WatoVideoProps {
    transparent?: boolean;
    gutter?: boolean;
    /** Hide the still of the Pioneers (the landing page swaps in live 3D ones over it). */
    hideStill?: boolean;
}

// The alley animation (with the drawn robot painted out) and a still of the 3D Pioneers standing in
// it. The video is object-cover and bottom-anchored over 4000x2244 art, so the still is placed with
// the same mapping in pure CSS: one art pixel is `scale` CSS pixels.
const scale = "max(100vw / 4000, 100vh / 2244)";
const STILL = { x: 1836, y: 891, w: 1639, h: 965 };

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
                style={{
                    left: `calc(50% + ${STILL.x - 2000} * ${scale})`,
                    top: `calc(100% - ${2244 - STILL.y} * ${scale})`,
                    width: `calc(${STILL.w} * ${scale})`,
                    height: `calc(${STILL.h} * ${scale})`,
                }}
            />
        </div>
    );
};

export default WatoVideo;
