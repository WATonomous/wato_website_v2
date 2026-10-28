import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import type { Cameo } from "./cameo";

const MODEL_URL = "/models/pioneer.glb";
const HUMANOID_PAGE = "/projects/humanoid";

const LINES: Record<string, string> = {
    arrive: "Hey! I'm Pioneer 👋",
    hover: "Click me! I've got 69 joints to show you →",
    wave: "Hi there! 👋",
    thumbs: "Nice cursor. 👍",
    peace: "✌️ Built at UWaterloo",
    count: "1… 2… 3… 22 DOF per hand!",
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
        let move: string | undefined;
        let arrived = false;
        let arriveTimer = 0;
        const pick = () =>
            hovering
                ? LINES.hover
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

        return () => {
            cancelled = true;
            window.clearTimeout(start);
            window.clearTimeout(arriveTimer);
            window.removeEventListener("click", onClick, true);
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
                    className={`absolute bottom-0 left-0 mb-[clamp(36px,4vw,64px)] -translate-x-[15%] transition-all duration-300 ${
                        line ? "scale-100 opacity-100" : "scale-75 opacity-0"
                    }`}
                >
                    <div className="relative -rotate-2 whitespace-nowrap rounded-2xl border-[3px] border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-tight text-black shadow-[4px_4px_0_#000]">
                        {line}
                        <span className="absolute -bottom-[11px] left-6 h-4 w-4 rotate-45 border-b-[3px] border-r-[3px] border-black bg-white" />
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
