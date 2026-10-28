import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import type { Cameo } from "./cameo";

const MODEL_URL = "/models/pioneer.glb";
const HUMANOID_PAGE = "/projects/humanoid";

const LINES: Record<string, string> = {
    arrive: "Hey! I'm Pioneer 👋",
    hover: "Click me! 69 joints inside →",
    wave: "Hi there! 👋",
    thumbs: "Nice cursor. 👍",
    peace: "✌️ Built at UWaterloo",
    count: "1… 2… 3… 22 DOF per hand!",
};

/** The scene's other robots (their hover outlines in ProjectHighlights), in illustration coords. */
const NEIGHBOURS: Record<string, { x: number; y: number; line: string }> = {
    "/projects/eve": {
        x: 1650,
        y: 1300,
        line: "That's Eve, our self-driving car 🚗",
    },
    "/projects/rover": {
        x: 960,
        y: 1760,
        line: "Our rover! Off to the University Rover Challenge 🛞",
    },
    "/projects/micro": {
        x: 2550,
        y: 2100,
        line: "Micro: 1:10 scale and it races 🏁",
    },
    "/projects/humanoid": {
        x: 2150,
        y: 1030,
        line: "Hey, that's me! In 2D 👀",
    },
};

/**
 * Pioneer stepping into the landing-page illustration. Rendered on a transparent canvas over the
 * video; it ignores pointer events itself and listens on the window so the scene's links still work.
 */
const PioneerCameo = () => {
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
        let move: string | undefined;
        let arrived = false;
        let arriveTimer = 0;
        const pick = () =>
            hovering
                ? LINES.hover
                : pointing
                ? NEIGHBOURS[pointing].line
                : move
                ? LINES[move] ?? null
                : arrived
                ? LINES.arrive
                : null;

        // Let the page and video settle first; the model is fetched in the background.
        const start = window.setTimeout(() => {
            import("./cameo").then(({ Cameo }) => {
                if (cancelled || !canvasRef.current) return;
                cameo = new Cameo(canvasRef.current, {
                    onReady: () => setReady(true),
                    onHover: (h) => {
                        hovering = h;
                        document.body.style.cursor = h ? "pointer" : "";
                        setLine(pick());
                    },
                    onMove: (id) => {
                        move = id;
                        setLine(pick());
                    },
                    onHead: (p) => {
                        const b = bubbleRef.current;
                        if (!b) return;
                        if (p && !arrived) {
                            arrived = true;
                            setLine(pick());
                            arriveTimer = window.setTimeout(() => {
                                arrived = false;
                                setLine(pick());
                            }, 4500);
                        }
                        b.style.visibility = p ? "visible" : "hidden";
                        if (p)
                            b.style.transform = `translate(${p.x}px, ${p.y}px)`;
                    },
                });
                cameoRef.current = cameo;
                cameo.load(MODEL_URL).catch(() => undefined);
            });
        }, 600);

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
            window.clearTimeout(start);
            window.clearTimeout(arriveTimer);
            window.removeEventListener("click", onClick, true);
            document.removeEventListener("pointerover", onOver);
            document.removeEventListener("pointerout", onOut);
            document.body.style.cursor = "";
            cameo?.dispose();
        };
    }, [router]);

    return (
        <>
            <canvas
                ref={canvasRef}
                aria-hidden
                className={`pointer-events-none fixed inset-0 h-screen w-screen transition-opacity duration-700 ${
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
                    <div className="relative -rotate-2 whitespace-nowrap rounded-2xl border-[3px] border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-tight text-black shadow-[4px_4px_0_#000]">
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
