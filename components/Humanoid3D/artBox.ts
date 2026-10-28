// The alley animation is object-cover and bottom-anchored over 4000x2244 art. These place things on
// top of it in pure CSS (so they are right from the first paint, at any screen size): one art pixel
// is `ART_SCALE` CSS pixels.
const ART_SCALE = "max(100vw / 4000, 100vh / 2244)";

/** CSS position for a box given in art pixels, inside a full-screen, viewport-sized container. */
export function artBox(x: number, y: number, w: number, h: number) {
    return {
        left: `calc(50% + ${x - 2000} * ${ART_SCALE})`,
        top: `calc(100% - ${2244 - y} * ${ART_SCALE})`,
        width: `calc(${w} * ${ART_SCALE})`,
        height: `calc(${h} * ${ART_SCALE})`,
    };
}

/** The still of both Pioneers (public/imgs/pioneer-landing.png), in art pixels. */
export const PIONEER_STILL = { x: 1836, y: 891, w: 1639, h: 965 };

/**
 * Click targets over each Pioneer, in art pixels, with the teal hover outline cut from the still
 * (public/imgs/pioneer-outline-<name>.png, the same size as the box).
 */
export const PIONEER_HOTSPOTS = [
    { name: "sidewalk", x: 3150, y: 1180, w: 320, h: 670 }, // by the bakery
    { name: "peek", x: 1900, y: 891, w: 570, h: 390 }, // behind Eve (above the car)
];
