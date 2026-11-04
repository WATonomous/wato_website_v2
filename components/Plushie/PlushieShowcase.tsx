import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Plushie } from "./plushie";
import poster from "../../public/imgs/projects/humanoid/plushie.png";

const TITLE = "Meet the Pioneer Plushie";
const SUBTITLE = "The Team's Newest (and Softest) Member";
const CONTENT = `Every humanoid needs a sidekick. The Pioneer plushie is our mascot: the robot's helmet, visor and chest lights, sewn in fleece and stuffed for hugging.`;
const HINT = "Tap to squeeze · drag to spin";

const HEART_COLORS = ["#66ddc8", "#ff7a1c", "#ffffff"];

/** The plushie in 3D: loads when the section scrolls near, draws only while on screen. */
const PlushieShowcase = () => {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const heartsRef = useRef<HTMLDivElement>(null);
    const plushRef = useRef<Plushie>();
    const [live, setLive] = useState(false);

    useEffect(() => {
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        if (!wrap || !canvas) return;
        try {
            if (!document.createElement("canvas").getContext("webgl2")) return;
        } catch {
            return;
        }

        let cancelled = false;
        let visible = false;
        let plush: Plushie | undefined;

        const resize = () => {
            const r = wrap.getBoundingClientRect();
            plush?.setSize(Math.max(1, r.width), Math.max(1, r.height));
        };
        const ro = new ResizeObserver(resize);
        ro.observe(wrap);

        const load = () =>
            import("./plushie").then(async ({ Plushie }) => {
                if (cancelled) return;
                plush = new Plushie(canvas);
                plushRef.current = plush;
                resize();
                await plush.warm();
                if (cancelled) return;
                setLive(true);
                if (visible) plush.start();
            });

        let loading: Promise<void> | undefined;
        const io = new IntersectionObserver(
            ([e]) => {
                visible = e.isIntersecting;
                if (visible && !loading) loading = load();
                if (visible) plush?.start();
                else plush?.stop();
            },
            { rootMargin: "300px" }
        );
        io.observe(wrap);

        return () => {
            cancelled = true;
            io.disconnect();
            ro.disconnect();
            plush?.dispose();
            plushRef.current = undefined;
        };
    }, []);

    // ---- interaction
    const down = useRef<{ x: number; y: number; moved: boolean } | null>(null);
    const toLocal = (e: React.PointerEvent) => {
        const r = wrapRef.current!.getBoundingClientRect();
        return {
            x: ((e.clientX - r.left) / r.width) * 2 - 1,
            y: -(((e.clientY - r.top) / r.height) * 2 - 1),
        };
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const p = plushRef.current;
        if (!p) return;
        const l = toLocal(e);
        // aim the head roughly where the cursor is, relative to the face
        p.lookAt({ x: l.x, y: l.y - 0.35 });
        if (down.current) {
            if (Math.abs(e.clientX - down.current.x) > 4) down.current.moved = true;
            if (down.current.moved) p.dragMove(e.clientX);
        }
    };
    const onPointerDown = (e: React.PointerEvent) => {
        down.current = { x: e.clientX, y: e.clientY, moved: false };
        (e.target as Element).setPointerCapture?.(e.pointerId);
        plushRef.current?.dragStart(e.clientX);
    };
    const onPointerUp = (e: React.PointerEvent) => {
        const d = down.current;
        down.current = null;
        plushRef.current?.dragEnd();
        if (d && !d.moved) squeeze(e.clientX, e.clientY);
    };
    const onPointerLeave = () => plushRef.current?.lookAt(null);

    const squeeze = (cx?: number, cy?: number) => {
        plushRef.current?.boop();
        const box = heartsRef.current;
        if (!box) return;
        const r = box.getBoundingClientRect();
        const ox = cx !== undefined ? cx - r.left : r.width / 2;
        const oy = cy !== undefined ? cy - r.top : r.height * 0.4;
        for (let i = 0; i < 6; i++) {
            const h = document.createElement("span");
            h.textContent = "♥";
            h.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;font-size:${
                16 + Math.random() * 14
            }px;color:${HEART_COLORS[i % 3]};pointer-events:none;`;
            box.appendChild(h);
            const dx = (Math.random() - 0.5) * 160;
            const dy = -80 - Math.random() * 120;
            h.animate(
                [
                    { transform: "translate(-50%,-50%) scale(0.4)", opacity: 0 },
                    { transform: `translate(calc(-50% + ${dx * 0.4}px), calc(-50% + ${dy * 0.4}px)) scale(1.1)`, opacity: 1, offset: 0.25 },
                    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.9) rotate(${dx / 8}deg)`, opacity: 0 },
                ],
                { duration: 1100 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.3,1)", delay: i * 40 }
            ).onfinish = () => h.remove();
        }
    };

    return (
        <div className="relative flex flex-col items-center overflow-hidden bg-black bg-opacity-90 py-24 lg:bg-opacity-80">
            <div className="relative z-10 flex w-full max-w-[95rem] flex-col items-center gap-x-16 px-8 md:px-16 lg:w-[85vw] lg:flex-row lg:px-0">
                <div className="flex flex-col justify-center text-white max-lg:items-center max-lg:text-center lg:w-[51%]">
                    <div className="text-3xl font-black lg:text-4xl">
                        {TITLE}&nbsp;<span className="text-wato-teal">{"//"}</span>
                    </div>
                    <div className="text-base italic text-wato-teal lg:mb-6 lg:mt-2 lg:text-lg">
                        {SUBTITLE}
                    </div>
                    <div className="max-lg:py-8 max-lg:text-sm">{CONTENT}</div>
                    <button
                        type="button"
                        onClick={() => squeeze()}
                        className="mt-6 w-fit rounded-full border border-wato-teal/40 px-5 py-2 text-sm font-semibold text-wato-teal transition hover:bg-wato-teal/10"
                    >
                        Give it a squeeze ♥
                    </button>
                </div>
                <div className="relative mt-10 aspect-[5/6] w-full max-w-[26rem] lg:mt-0 lg:w-[40%]">
                    {/* warm spotlight the plushie stands in */}
                    <div className="pointer-events-none absolute inset-x-[6%] bottom-[2%] top-[10%] rounded-full bg-[radial-gradient(closest-side,rgba(255,196,140,0.22),rgba(102,221,200,0.06)_60%,transparent)]" />
                    <div
                        ref={wrapRef}
                        className="absolute inset-0 cursor-grab touch-pan-y select-none active:cursor-grabbing"
                        onPointerMove={onPointerMove}
                        onPointerDown={onPointerDown}
                        onPointerUp={onPointerUp}
                        onPointerCancel={() => {
                            down.current = null;
                            plushRef.current?.dragEnd();
                        }}
                        onPointerLeave={onPointerLeave}
                    >
                        <Image
                            src={poster}
                            alt="The Pioneer plushie: a white fleece astronaut robot with a big dark visor and three orange chest lights"
                            className={`pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${
                                live ? "opacity-0" : "opacity-100"
                            }`}
                            priority={false}
                        />
                        <canvas
                            ref={canvasRef}
                            aria-hidden
                            className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
                                live ? "opacity-100" : "opacity-0"
                            }`}
                        />
                    </div>
                    <div ref={heartsRef} className="pointer-events-none absolute inset-0" />
                    <div className="pointer-events-none absolute -bottom-6 w-full text-center text-xs text-white/50">
                        {HINT}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlushieShowcase;
