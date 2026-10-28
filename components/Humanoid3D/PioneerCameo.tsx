import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import type { Cameo } from "./cameo";

const MODEL_URL = "/models/pioneer.glb";
const HUMANOID_PAGE = "/projects/humanoid";

/** The only line, shown while the visitor hovers Pioneer. */
const HOVER_LINE =
    "We're building Pioneer, the first Canadian undergraduate humanoid →";

/** The scene's other robots (their hover outlines in ProjectHighlights), in illustration coords:
 * Pioneer points at whichever one the visitor hovers. */
const NEIGHBOURS: Record<string, { x: number; y: number }> = {
    "/projects/eve": {
        x: 1650,
        y: 1300,
    },
    "/projects/rover": {
        x: 960,
        y: 1760,
    },
    "/projects/micro": {
        x: 2550,
        y: 2100,
    },
    "/projects/humanoid": {
        x: 2150,
        y: 1030,
    },
};

/**
 * Pioneer stepping into the landing-page illustration. Rendered on a transparent canvas over the
 * video; it ignores pointer events itself and listens on the window so the scene's links still work.
 */
interface Props {
    /** Called with true once the live 3D Pioneers are drawing (and false when they go away). */
    onLive?: (live: boolean) => void;
}

const PioneerCameo = ({ onLive }: Props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const cameoRef = useRef<Cameo>();
    const router = useRouter();
    const [line, setLine] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Only where the sidewalk spot is on screen (landscape) and the device can hover.
        const wide = window.innerWidth / window.innerHeight > 1.15;
        const hover = window.matchMedia?.("(hover: hover)").matches ?? true;
        const saveData = (navigator as any).connection?.saveData;
        if (!wide || !hover || saveData) return;
        try {
            if (!document.createElement("canvas").getContext("webgl2")) return;
        } catch {
            return;
        }

        let cameo: Cameo | undefined;
        let cancelled = false;
        let hovering = false;
        let pointing: string | null = null;
        const pick = () => (hovering ? HOVER_LINE : null);

        // Let the page settle first: start once the background video is playing (or after 3 s),
        // in idle time, so the 3D never holds up the rain animation.
        let started = false;
        const start = () => {
            if (started || cancelled) return;
            started = true;
            const idle =
                (window as any).requestIdleCallback ??
                ((f: () => void) => setTimeout(f, 200));
            idle(() => {
                if (!cancelled) begin();
            });
        };
        const video = document.querySelector("video");
        if (video && !video.paused && video.readyState >= 3) start();
        else video?.addEventListener("playing", start, { once: true });
        const fallback = window.setTimeout(start, 3000);

        const begin = () => {
            import("./cameo").then(({ Cameo }) => {
                if (cancelled || !canvasRef.current) return;
                cameo = new Cameo(canvasRef.current, {
                    // Swap after the live robots have drawn a couple of frames: the still in the
                    // background matches them, so a hard cut is invisible.
                    onReady: () =>
                        requestAnimationFrame(() =>
                            requestAnimationFrame(() => {
                                setReady(true);
                                onLive?.(true);
                            })
                        ),
                    onHover: (h) => {
                        hovering = h;
                        document.body.style.cursor = h ? "pointer" : "";
                        setLine(pick());
                    },
                    onHead: (p) => {
                        const b = bubbleRef.current;
                        if (!b) return;
                        b.style.visibility = p ? "visible" : "hidden";
                        if (p)
                            b.style.transform = `translate(${p.x}px, ${p.y}px)`;
                    },
                });
                cameoRef.current = cameo;
                cameo.load(MODEL_URL).catch(() => undefined);
            });
        };

        // Clicking Pioneer opens its page instead of the scene's default link.
        const onClick = (e: MouseEvent) => {
            if (!cameoRef.current?.isHovering) return;
            e.preventDefault();
            e.stopPropagation();
            router.push(HUMANOID_PAGE);
        };
        window.addEventListener("click", onClick, true);

        // Point at whichever robot in the scene the visitor is hovering.
        const neighbourOf = (e: Event) => {
            const a = (e.target as Element | null)?.closest?.("a[href]");
            const href = a?.getAttribute("href");
            return href && NEIGHBOURS[href] ? href : null;
        };
        const onOver = (e: PointerEvent) => {
            const n = neighbourOf(e);
            if (!n || n === pointing) return;
            pointing = n;
            cameoRef.current?.pointAt(NEIGHBOURS[n]);
            setLine(pick());
        };
        const onOut = (e: PointerEvent) => {
            if (!pointing || neighbourOf(e) !== pointing) return;
            pointing = null;
            cameoRef.current?.pointAt(null);
            setLine(pick());
        };
        document.addEventListener("pointerover", onOver);
        document.addEventListener("pointerout", onOut);

        return () => {
            cancelled = true;
            window.clearTimeout(fallback);
            video?.removeEventListener("playing", start);
            window.removeEventListener("click", onClick, true);
            document.removeEventListener("pointerover", onOver);
            document.removeEventListener("pointerout", onOut);
            document.body.style.cursor = "";
            onLive?.(false);
            cameo?.dispose();
        };
    }, [router, onLive]);

    return (
        <>
            <canvas
                ref={canvasRef}
                aria-hidden
                className={`pointer-events-none fixed inset-0 h-screen w-screen ${
                    ready ? "opacity-100" : "opacity-0"
                }`}
            />
            <div
                ref={bubbleRef}
                className="pointer-events-none fixed left-0 top-0"
                style={{ visibility: "hidden" }}
            >
                <div
                    className={`absolute bottom-0 right-0 mb-[clamp(36px,4vw,64px)] origin-bottom-right translate-x-6 transition-all duration-300 ${
                        line ? "scale-100 opacity-100" : "scale-75 opacity-0"
                    }`}
                >
                    <div className="relative w-[19rem] -rotate-2 rounded-2xl border-[3px] border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-tight text-black shadow-[4px_4px_0_#000]">
                        {line}
                        <span className="absolute -bottom-[11px] right-6 h-4 w-4 rotate-45 border-b-[3px] border-r-[3px] border-black bg-white" />
                    </div>
                </div>
            </div>
            <a href={HUMANOID_PAGE} className="sr-only">
                Meet Pioneer, our humanoid robot
            </a>
        </>
    );
};

export default PioneerCameo;
