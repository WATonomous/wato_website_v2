interface WatoVideoProps {
    transparent?: boolean;
    gutter?: boolean;
    /** A second cut of the animation to cross-fade to (e.g. with the drawn robot painted out). */
    altSrc?: string;
    showAlt?: boolean;
}
const WatoVideo = ({ transparent = false, gutter = false, altSrc, showAlt = false }: WatoVideoProps) => {
    return (
        <div
            className={`${
                transparent ? "opacity-30" : ""
            } relative h-screen w-screen bg-VideoPlaceholder bg-cover bg-bottom`}
            style={{ scrollbarGutter: gutter ? "stable" : "unset" }}
        >
            <video
                autoPlay
                playsInline
                muted
                loop
                className={`absolute inset-0 h-full w-full object-cover object-bottom`}
            >   
                <source src="/imgs/wato-animation.mp4" />
                
            </video>
            {altSrc && (
                <video
                    autoPlay
                    playsInline
                    muted
                    loop
                    preload="auto"
                    className={`absolute inset-0 h-full w-full object-cover object-bottom transition-opacity duration-700 ${
                        showAlt ? "opacity-100" : "opacity-0"
                    }`}
                >
                    <source src={altSrc} />
                </video>
            )}
        </div>
    );
};

export default WatoVideo;
