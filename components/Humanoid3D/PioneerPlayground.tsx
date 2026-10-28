import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { FaArrowAltCircleDown } from "react-icons/fa";
import type { Stage, HoverInfo, RenderMode } from "./stage";
import { MOVES, MOVE_BY_ID } from "./moves";
import type { PioneerRobot } from "./robot";
import { jointGroup } from "./names";
import type { HandMirror } from "./teleop";

const MODEL_URL = "/models/pioneer.glb";
const KONAMI = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
];
const HERO_MOVES = ["wave", "flex", "dance"];
const GROUP_COLORS: Record<string, string> = {
    "Head & Torso": "#F6F8FA",
    Arms: "#66DDC8",
    Hands: "#4A7EB3",
    Legs: "#FFC94A",
};

interface Props {
    title: string;
    subtitle: string;
    cta: string;
    link: string;
    secondaryCta?: string;
    secondaryLink?: string;
    fallbackImage: string;
}

interface Line {
    who: "you" | "pioneer";
    text: string;
}

const deg = (r: number) => `${Math.round((r * 180) / Math.PI)}°`;

function webglAvailable() {
    try {
        const c = document.createElement("canvas");
        return !!(window.WebGL2RenderingContext && c.getContext("webgl2"));
    } catch {
        return false;
    }
}

const PioneerPlayground = ({
    title,
    subtitle,
    cta,
    link,
    secondaryCta,
    secondaryLink,
    fallbackImage,
}: Props) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scopeRef = useRef<HTMLCanvasElement>(null);
    const stageRef = useRef<Stage>();
    const robotRef = useRef<PioneerRobot>();
    const mirrorRef = useRef<HandMirror>();
    const camBoxRef = useRef<HTMLDivElement>(null);
    const termEndRef = useRef<HTMLDivElement>(null);

    const [supported, setSupported] = useState(true);
    const [progress, setProgress] = useState(0);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [hover, setHover] = useState<HoverInfo | null>(null);
    const [activeMove, setActiveMove] = useState<string>();
    const [mode, setMode] = useState<RenderMode>("studio");
    const [explode, setExplode] = useState(0);
    const [disco, setDisco] = useState(false);
    const [mirror, setMirror] = useState<"off" | "loading" | "on" | "error">(
        "off"
    );
    const [handsSeen, setHandsSeen] = useState(0);
    const [height, setHeight] = useState(0);
    const [cmd, setCmd] = useState("");
    const [lines, setLines] = useState<Line[]>([
        {
            who: "pioneer",
            text: "Pioneer online. 69 joints nominal. Type `help`.",
        },
    ]);
    const [touched, setTouched] = useState(false);

    // ------------------------------------------------------------------ stage lifecycle
    useEffect(() => {
        if (!webglAvailable()) {
            setSupported(false);
            return;
        }
        let stage: Stage | undefined;
        let io: IntersectionObserver | undefined;
        let cancelled = false;
        // three.js is only fetched on the client, after the page (and its SEO copy) has rendered.
        import("./stage").then(
            ({ Stage }) => {
                if (cancelled) return;
                stage = new Stage(canvasRef.current!, hostRef.current!, {
                    onProgress: setProgress,
                    onReady: (robot) => {
                        robotRef.current = robot;
                        setHeight(robot.height);
                        setReady(true);
                    },
                    onHover: setHover,
                    onMoveEnd: () => setActiveMove(undefined),
                    onError: () => setFailed(true),
                });
                stageRef.current = stage;
                stage.setHeroLayout(true);
                stage.load(MODEL_URL);
                stage.start();
                const s = stage;
                io = new IntersectionObserver(
                    ([e]) => s.setVisible(e.isIntersecting),
                    { threshold: 0 }
                );
                io.observe(hostRef.current!);
            },
            () => setFailed(true)
        );
        return () => {
            cancelled = true;
            io?.disconnect();
            mirrorRef.current?.stop();
            stage?.dispose();
        };
    }, []);

    // Live joint "scope": one bar per joint, normalised to its range.
    useEffect(() => {
        if (!ready || !playing) return;
        let raf = 0;
        const draw = () => {
            raf = requestAnimationFrame(draw);
            const c = scopeRef.current;
            const robot = robotRef.current;
            if (!c || !robot) return;
            const dpr = Math.min(window.devicePixelRatio, 2);
            const w = c.clientWidth;
            const h = c.clientHeight;
            if (c.width !== w * dpr) {
                c.width = w * dpr;
                c.height = h * dpr;
            }
            const g = c.getContext("2d")!;
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            g.clearRect(0, 0, w, h);
            const joints = Array.from(robot.joints.values());
            const bw = w / joints.length;
            joints.forEach((j, i) => {
                const span = j.upper - j.lower || 1;
                const n = (j.value - j.lower) / span;
                const bh = Math.max(2, n * (h - 2));
                g.fillStyle = GROUP_COLORS[jointGroup(j.name)];
                g.globalAlpha = hover?.joint === j.name ? 1 : 0.75;
                g.fillRect(i * bw + 0.5, h - bh, Math.max(1, bw - 1.5), bh);
            });
        };
        draw();
        return () => cancelAnimationFrame(raf);
    }, [ready, playing, hover?.joint]);

    // ------------------------------------------------------------------ actions
    const say = useCallback((text: string, who: Line["who"] = "pioneer") => {
        setLines((l) => [...l.slice(-30), { who, text }]);
    }, []);

    const play = useCallback((id: string) => {
        stageRef.current?.play(id);
        setActiveMove(id);
        setTouched(true);
    }, []);

    const enter = () => {
        setPlaying(true);
        setTouched(true);
    };
    const exit = useCallback(() => {
        setPlaying(false);
        setHover(null);
    }, []);

    useEffect(() => {
        const s = stageRef.current;
        if (!s) return;
        s.setHeroLayout(!playing);
        s.setZoom(playing);
        document.documentElement.classList.toggle("overflow-y-hidden", playing);
        return () =>
            document.documentElement.classList.remove("overflow-y-hidden");
    }, [playing]);

    useEffect(() => {
        if (stageRef.current) stageRef.current.explodeTarget = explode;
    }, [explode]);
    useEffect(() => {
        stageRef.current?.setMode(mode);
    }, [mode, ready]);
    useEffect(() => {
        stageRef.current?.setDisco(disco);
    }, [disco]);
    useEffect(() => {
        termEndRef.current?.scrollIntoView({ block: "nearest" });
    }, [lines]);

    const toggleMirror = useCallback(async () => {
        if (mirrorRef.current) {
            mirrorRef.current.stop();
            mirrorRef.current = undefined;
            stageRef.current?.setExternalPose(null);
            setMirror("off");
            setHandsSeen(0);
            return;
        }
        setMirror("loading");
        try {
            const { HandMirror } = await import("./teleop");
            const m = new HandMirror((pose, n) => {
                stageRef.current?.setExternalPose(n ? pose : null);
                setHandsSeen(n);
            });
            mirrorRef.current = m;
            const v = m.element;
            v.className = "h-full w-full -scale-x-100 object-cover";
            camBoxRef.current?.replaceChildren(v);
            await m.start();
            setMirror("on");
        } catch (e) {
            mirrorRef.current?.stop();
            mirrorRef.current = undefined;
            setMirror("error");
        }
    }, []);

    // Turn the webcam off when leaving the playground.
    useEffect(() => {
        if (!playing && mirrorRef.current) toggleMirror();
    }, [playing, toggleMirror]);

    // ------------------------------------------------------------------ keyboard
    useEffect(() => {
        let seq: string[] = [];
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && playing) exit();
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;
            seq = [...seq, e.key].slice(-KONAMI.length);
            if (seq.join() === KONAMI.join()) {
                setDisco(true);
                play("dance");
                say("🪩 Cheat code accepted. Disco subroutine engaged.");
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [playing, exit, play, say]);

    // ------------------------------------------------------------------ terminal
    const run = (raw: string) => {
        const input = raw.trim();
        if (!input) return;
        say(input, "you");
        const c = input.toLowerCase().replace(/^\/|^pioneer\s+/, "");
        const stage = stageRef.current;
        if (MOVE_BY_ID[c]) {
            play(c);
            say(`Executing \`${c}\`. ${MOVE_BY_ID[c].blurb}`);
            return;
        }
        switch (c) {
            case "help":
            case "?":
                say(
                    `Moves: ${MOVES.map((m) => m.id).join(
                        ", "
                    )}. Also: studio, holo, comic, blueprint, explode, assemble, disco, mirror, reset, stats.`
                );
                break;
            case "holo":
            case "hologram":
            case "xray":
                setMode("hologram");
                say("Switching to hologram render.");
                break;
            case "comic":
            case "toon":
                setMode("comic");
                say(
                    "POW! Comic-book renderer: cel shading, ink lines, halftone dots."
                );
                break;
            case "blueprint":
            case "cad":
                setMode("blueprint");
                say(
                    "Blueprint view: every crease of the CAD as a line drawing."
                );
                break;
            case "studio":
                setMode("studio");
                say("Back to studio lighting.");
                break;
            case "explode":
                setExplode(1);
                say("Exploded view. Every link pulled off its joint.");
                break;
            case "assemble":
                setExplode(0);
                say("Reassembling.");
                break;
            case "disco":
                setDisco((d) => !d);
                say("🪩");
                break;
            case "mirror":
            case "teleop":
                toggleMirror();
                say("Toggling webcam mirror mode. Show me your hands.");
                break;
            case "reset":
            case "stop":
                stage?.resetPose();
                setActiveMove(undefined);
                setExplode(0);
                say("Pose reset.");
                break;
            case "stats":
            case "specs":
                say(
                    `69 joints (3 torso/head, 14 arm, 40 hand, 12 leg) · ${height.toFixed(
                        2
                    )} m tall · ~44.7 kg est. CAD mass · CubeMars actuators.`
                );
                break;
            case "hello":
            case "hi":
            case "hey":
                play("wave");
                say("Hi! 👋");
                break;
            case "sudo make me a sandwich":
                say(
                    "Permission denied: kitchen manipulation policy not trained yet. Try Isaac Lab in a few terms."
                );
                break;
            case "walk":
                play("march");
                say(
                    "Locomotion policy still in sim. Marching in place instead."
                );
                break;
            default:
                say(`Unknown command \`${c}\`. Try \`help\`.`);
        }
    };

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        run(cmd);
        setCmd("");
    };

    // ------------------------------------------------------------------ render
    const stageClass = playing ? "fixed inset-0 z-[60]" : "absolute inset-0";

    return (
        <section
            className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-[#05080b]"
            aria-label="Interactive 3D model of Pioneer"
        >
            {/* Static fallback when WebGL is missing or the model fails. */}
            {(!supported || failed) && (
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-70"
                    style={{ backgroundImage: `url(${fallbackImage})` }}
                />
            )}

            <div
                ref={hostRef}
                className={`${stageClass} bg-[radial-gradient(ellipse_at_60%_40%,#0f2a2a_0%,#071013_45%,#030506_100%)] transition-[background] duration-500`}
            >
                <canvas
                    ref={canvasRef}
                    className={`h-full w-full transition-opacity duration-1000 ${
                        ready ? "opacity-100" : "opacity-0"
                    } ${playing ? "touch-none" : "max-lg:pointer-events-none"}`}
                />

                {/* Loading */}
                {supported && !ready && !failed && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center lg:justify-end lg:pr-[22vw]">
                        <div className="w-56 font-mono text-xs text-wato-teal">
                            <div className="mb-2 animate-pulse">
                                booting pioneer… {Math.round(progress * 100)}%
                            </div>
                            <div className="h-[2px] w-full bg-white/10">
                                <div
                                    className="h-full bg-wato-teal transition-all"
                                    style={{ width: `${progress * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Joint tooltip */}
                {hover && (
                    <div
                        className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 rounded-md border border-wato-teal/40 bg-black/80 px-3 py-2 text-xs text-white shadow-[0_0_24px_rgba(102,221,200,0.25)] backdrop-blur"
                        style={{
                            left: hover.x,
                            top: Math.max(8, hover.y - 96),
                        }}
                    >
                        <div className="font-bold">{hover.label}</div>
                        <div className="font-mono text-[10px] text-wato-grey">
                            {hover.joint}
                        </div>
                        <div className="mt-1 flex justify-between font-mono">
                            <span className="text-wato-teal">
                                {deg(hover.value)}
                            </span>
                            <span className="text-wato-grey">
                                {deg(hover.lower)} … {deg(hover.upper)}
                            </span>
                        </div>
                        <div className="mt-1 h-1 w-full rounded bg-white/10">
                            <div
                                className="h-full rounded bg-wato-teal"
                                style={{
                                    width: `${
                                        ((hover.value - hover.lower) /
                                            (hover.upper - hover.lower || 1)) *
                                        100
                                    }%`,
                                }}
                            />
                        </div>
                        {!hover.dragging && (
                            <div className="mt-1 text-[10px] text-wato-grey">
                                drag to move this joint
                            </div>
                        )}
                    </div>
                )}

                {/* Playground UI */}
                {playing && (
                    <>
                        <div className="pointer-events-none absolute left-4 top-4 rounded-md bg-black/40 px-3 py-2 text-white backdrop-blur-sm md:left-8 md:top-8">
                            <div className="text-lg font-black md:text-2xl">
                                PIONEER&nbsp;
                                <span className="text-wato-teal">{"//"}</span>
                                &nbsp;PLAYGROUND
                            </div>
                            <div className="mt-1 font-mono text-[11px] text-wato-grey">
                                69 joints ·{" "}
                                {height ? `${height.toFixed(2)} m` : "…"} · drag
                                a limb
                                <span className="hidden md:inline">
                                    {" "}
                                    · scroll to zoom · drag space to orbit
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={exit}
                            className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-sm text-white backdrop-blur transition hover:border-wato-teal hover:text-wato-teal md:right-8 md:top-8"
                        >
                            ✕ Exit{" "}
                            <span className="hidden font-mono text-xs text-wato-grey md:inline">
                                esc
                            </span>
                        </button>

                        {/* Webcam preview */}
                        <div
                            className={`absolute right-4 top-20 overflow-hidden rounded-md border border-wato-teal/50 bg-black md:right-8 md:top-24 ${
                                mirror === "on" || mirror === "loading"
                                    ? "h-28 w-36 md:h-36 md:w-48"
                                    : "hidden"
                            }`}
                        >
                            <div ref={camBoxRef} className="h-full w-full" />
                            <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 font-mono text-[10px] text-wato-teal">
                                {mirror === "loading"
                                    ? "loading hand tracker…"
                                    : handsSeen
                                    ? `${handsSeen} hand${
                                          handsSeen > 1 ? "s" : ""
                                      } tracked`
                                    : "show your hands"}
                            </div>
                        </div>

                        {/* Terminal */}
                        <div className="absolute left-8 top-28 hidden w-80 rounded-md border border-white/10 bg-black/60 font-mono text-[11px] text-white backdrop-blur lg:block">
                            <div className="max-h-40 overflow-y-auto px-3 pt-2">
                                {lines.map((l, i) => (
                                    <div
                                        key={i}
                                        className={
                                            l.who === "you"
                                                ? "text-wato-grey"
                                                : "text-wato-teal"
                                        }
                                    >
                                        {l.who === "you" ? "> " : ""}
                                        {l.text}
                                    </div>
                                ))}
                                <div ref={termEndRef} />
                            </div>
                            <form
                                onSubmit={onSubmit}
                                className="flex items-center gap-1 border-t border-white/10 px-3 py-2"
                            >
                                <span className="text-wato-teal">
                                    pioneer&gt;
                                </span>
                                <input
                                    value={cmd}
                                    onChange={(e) => setCmd(e.target.value)}
                                    placeholder="try: dance"
                                    aria-label="Command Pioneer"
                                    className="flex-1 bg-transparent text-white outline-none placeholder:text-white/30"
                                    spellCheck={false}
                                    autoComplete="off"
                                />
                            </form>
                        </div>

                        {/* Dock */}
                        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-4 pt-10 md:pb-6">
                            <canvas
                                ref={scopeRef}
                                className="h-8 w-full max-w-3xl"
                                aria-hidden
                            />
                            <div className="flex w-full max-w-3xl justify-between font-mono text-[10px] text-wato-grey">
                                {Object.entries(GROUP_COLORS).map(([g, c]) => (
                                    <span
                                        key={g}
                                        className="flex items-center gap-1"
                                    >
                                        <span
                                            className="inline-block h-2 w-2 rounded-sm"
                                            style={{ background: c }}
                                        />
                                        {g}
                                    </span>
                                ))}
                            </div>
                            <div className="no-scrollbar flex w-full max-w-4xl gap-2 overflow-x-auto md:flex-wrap md:justify-center">
                                {MOVES.map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => {
                                            play(m.id);
                                            say(
                                                `${m.emoji} ${m.label}: ${m.blurb}`
                                            );
                                        }}
                                        className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition ${
                                            activeMove === m.id
                                                ? "border-wato-teal bg-wato-teal text-black"
                                                : "border-white/20 bg-black/50 text-white hover:border-wato-teal hover:text-wato-teal"
                                        }`}
                                    >
                                        <span className="mr-1">{m.emoji}</span>
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex w-full max-w-4xl flex-wrap items-center justify-center gap-2 text-sm text-white">
                                <div className="flex overflow-hidden rounded-full border border-white/20">
                                    {(
                                        [
                                            "studio",
                                            "hologram",
                                            "comic",
                                            "blueprint",
                                        ] as RenderMode[]
                                    ).map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setMode(m)}
                                            className={`px-3 py-1.5 capitalize transition ${
                                                mode === m
                                                    ? "bg-white text-black"
                                                    : "bg-black/50 hover:text-wato-teal"
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                                <label className="flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-3 py-1.5">
                                    <span>Explode</span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={explode}
                                        onChange={(e) =>
                                            setExplode(
                                                parseFloat(e.target.value)
                                            )
                                        }
                                        className="w-24 accent-[#66DDC8]"
                                    />
                                </label>
                                <button
                                    onClick={toggleMirror}
                                    className={`rounded-full border px-3 py-1.5 transition ${
                                        mirror === "on"
                                            ? "border-wato-teal bg-wato-teal text-black"
                                            : "border-white/20 bg-black/50 hover:border-wato-teal hover:text-wato-teal"
                                    }`}
                                    title="Track your hands with the webcam and drive Pioneer's arms and fingers. Video never leaves your device."
                                >
                                    📷{" "}
                                    {mirror === "on"
                                        ? "Mirror on"
                                        : mirror === "loading"
                                        ? "Starting…"
                                        : mirror === "error"
                                        ? "Camera unavailable"
                                        : "Mirror my hands"}
                                </button>
                                <button
                                    onClick={() => setDisco((d) => !d)}
                                    className={`rounded-full border px-3 py-1.5 transition ${
                                        disco
                                            ? "border-wato-teal bg-wato-teal text-black"
                                            : "border-white/20 bg-black/50 hover:border-wato-teal hover:text-wato-teal"
                                    }`}
                                >
                                    🪩 Disco
                                </button>
                                <button
                                    onClick={() => run("reset")}
                                    className="rounded-full border border-white/20 bg-black/50 px-3 py-1.5 transition hover:border-wato-teal hover:text-wato-teal"
                                >
                                    ↺ Reset
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Hero copy (hidden while playing) */}
            <div
                className={`pointer-events-none relative z-10 mx-auto flex h-full w-full max-w-[100rem] flex-col justify-end px-4 pb-6 text-white transition-opacity duration-500 md:px-16 md:pb-16 lg:w-[90vw] lg:px-0 lg:pb-24 ${
                    playing ? "opacity-0" : "opacity-100"
                }`}
            >
                <div className="max-lg:rounded-xl max-lg:bg-gradient-to-t max-lg:from-black/90 max-lg:to-black/40 max-lg:p-5 lg:w-[42%]">
                    <div className="mb-3 whitespace-pre-line text-3xl font-black lg:text-4xl">
                        {title}&nbsp;
                        <span className="text-wato-teal">{"//"}</span>
                    </div>
                    <div className="mb-6 text-sm max-lg:line-clamp-4 lg:text-base">
                        {subtitle}
                    </div>

                    {ready && !playing && (
                        <div className="pointer-events-auto mb-6 flex flex-wrap items-center gap-2">
                            <button
                                onClick={enter}
                                className="group flex items-center gap-2 rounded-full bg-wato-teal px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_30px_rgba(102,221,200,0.45)] transition hover:scale-105"
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black opacity-60" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-black" />
                                </span>
                                Take control of Pioneer
                                <span className="transition group-hover:translate-x-1">
                                    →
                                </span>
                            </button>
                            {HERO_MOVES.map((id) => (
                                <button
                                    key={id}
                                    onClick={() => play(id)}
                                    className={`rounded-full border px-3 py-2 text-sm transition ${
                                        activeMove === id
                                            ? "border-wato-teal bg-wato-teal/20 text-wato-teal"
                                            : "border-white/25 bg-black/40 hover:border-wato-teal hover:text-wato-teal"
                                    }`}
                                >
                                    {MOVE_BY_ID[id].emoji}{" "}
                                    {MOVE_BY_ID[id].label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="pointer-events-auto flex w-full flex-wrap items-center gap-x-8 gap-y-3">
                        <a
                            className="flex cursor-pointer items-center text-base font-medium text-wato-teal"
                            href={link}
                        >
                            <p>{cta}</p>
                            <FaArrowAltCircleDown className="ml-3 text-2xl" />
                        </a>
                        {secondaryCta && secondaryLink && (
                            <a
                                className="flex cursor-pointer items-center text-base font-medium text-white underline decoration-wato-teal decoration-2 underline-offset-4"
                                href={secondaryLink}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <p>{secondaryCta}</p>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Desktop hint pointing at the robot */}
            {ready && !playing && !touched && (
                <div className="pointer-events-none absolute bottom-[6%] right-[12vw] z-10 hidden rounded-full border border-wato-teal/40 bg-black/50 px-3 py-1 font-mono text-xs text-wato-teal backdrop-blur lg:block">
                    hover &amp; drag any of its 69 joints · it&apos;s watching
                    you 👀
                </div>
            )}
        </section>
    );
};

export default PioneerPlayground;
