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

/** Where each Pioneer stands in the art, for click targets: [x, y, w, h]. */
export const PIONEER_HOTSPOTS: [number, number, number, number][] = [
    [3150, 1180, 320, 670], // on the sidewalk by the bakery
    [1900, 891, 570, 390], // peeking out from behind Eve (above the car)
];
