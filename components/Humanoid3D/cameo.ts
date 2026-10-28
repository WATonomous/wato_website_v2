// Landing-page cameo: Pioneer, cel-shaded with ink lines so it reads as part of the illustrated alley,
// walks in and stands on the sidewalk, watches the cursor, waves when hovered, and points at whichever
// of the scene's other robots the visitor hovers.
import * as THREE from "three";
import { PioneerRobot } from "./robot";
import { MOVE_BY_ID, Move, Pose, REST, hand } from "./moves";
import {
    buildCreases,
    buildHulls,
    makeComicMaterial,
    makeOutlineMaterial,
    outlineWidth,
} from "./materials";

/** Where Pioneer stands in the 4000x2244 illustration (feet), and how tall it is there. */
const ANCHOR = { x: 3330, y: 1830, height: 660 };
const ART = { w: 4000, h: 2244 };
const IDLE_MOVES = ["wave", "thumbs", "peace", "count"];
const POINT = hand("r", [0.8, 0, 1, 1, 1]);

export interface CameoCallbacks {
    onReady?: () => void;
    onHover?: (hovering: boolean) => void;
    /** Screen position of the head (CSS px), or null when Pioneer is off-screen. */
    onHead?: (p: { x: number; y: number } | null) => void;
    onMove?: (id: string | undefined) => void;
}

export class Cameo {
    private renderer: THREE.WebGLRenderer;
    private scene = new THREE.Scene();
    private camera = new THREE.PerspectiveCamera(20, 1, 0.1, 50);
    private robot?: PioneerRobot;
    private outlineMat = makeOutlineMaterial();
    private creaseMat = new THREE.LineBasicMaterial({
        color: 0x14100c,
        transparent: true,
        opacity: 0.75,
    });
    private comicUniforms = {
        uInk: { value: new THREE.Color(0x1c140e) },
        uDot: { value: 4 },
    };
    private mats: THREE.Material[] = [];
    private glowMat = new THREE.MeshBasicMaterial({ color: 0x66ddc8 });

    private clock = new THREE.Clock();
    private raf = 0;
    private disposed = false;
    private onScreen = false;
    private pxPerM = 1;

    // behaviour
    private phase: "enter" | "turn" | "idle" = "enter";
    private walkX = 2.6;
    private yaw = -Math.PI / 2;
    private move?: Move;
    private moveT = 0;
    private nextIdle = 7;
    private look = new THREE.Vector2();
    private lookTarget = new THREE.Vector2();
    private hovering = false;
    private raycaster = new THREE.Raycaster();
    private ndc = new THREE.Vector2();
    private tmp = new THREE.Vector3();
    private bounds = new THREE.Box3();
    private pointing: { x: number; y: number } | null = null; // illustration coords
    private lantern!: THREE.DirectionalLight;
    private reducedMotion: boolean;

    constructor(
        private canvas: HTMLCanvasElement,
        private cb: CameoCallbacks = {}
    ) {
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.reducedMotion =
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
            false;
        if (this.reducedMotion) {
            this.phase = "idle";
            this.walkX = 0;
            this.yaw = -0.35;
        }

        // Light it like the scene: warm bakery glow from the right, teal lanterns from above-left.
        const key = new THREE.DirectionalLight(0xffc48a, 2.6);
        key.position.set(3, 2.5, 2);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        Object.assign(key.shadow.camera, {
            left: -1.5,
            right: 1.5,
            top: 2.2,
            bottom: -0.3,
            near: 0.5,
            far: 10,
        });
        this.scene.add(key);
        const lantern = new THREE.DirectionalLight(0x66ddc8, 1.4);
        this.lantern = lantern;
        lantern.position.set(-2, 4, 1.5);
        this.scene.add(lantern);
        this.scene.add(new THREE.HemisphereLight(0xbfd8e0, 0x2a2018, 1.1));

        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 6),
            new THREE.ShadowMaterial({ opacity: 0.38 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        window.addEventListener("resize", this.resize);
        window.addEventListener("pointermove", this.onPointer, {
            passive: true,
        });
        this.resize();
    }

    async load(url: string) {
        const robot = await PioneerRobot.load(url);
        if (this.disposed) return;
        this.robot = robot;
        for (const m of robot.meshes) {
            const mat = makeComicMaterial(this.comicUniforms);
            m.material = mat;
            this.mats.push(mat);
        }
        for (const m of robot.glowMeshes) m.material = this.glowMat;
        buildHulls(robot.meshes, this.outlineMat);
        buildCreases(robot.meshes, this.creaseMat, 50);
        for (const [k, v] of Object.entries(REST)) robot.set(k, v);
        robot.ground();
        this.scene.add(robot.hips);
        this.cb.onReady?.();
        this.clock.getDelta();
        this.loop();
    }

    get isHovering() {
        return this.hovering;
    }

    /** Play a move now (e.g. a wave when the visitor hovers). */
    play(id: string) {
        if (this.phase !== "idle") return;
        this.move = MOVE_BY_ID[id];
        this.moveT = 0;
        this.cb.onMove?.(id);
    }

    dispose() {
        this.disposed = true;
        cancelAnimationFrame(this.raf);
        window.removeEventListener("resize", this.resize);
        window.removeEventListener("pointermove", this.onPointer);
        this.scene.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.geometry) m.geometry.dispose();
        });
        this.mats.forEach((m) => m.dispose());
        this.outlineMat.dispose();
        this.creaseMat.dispose();
        this.glowMat.dispose();
        this.renderer.dispose();
    }

    // ---------------------------------------------------------------- layout

    /** Turn and point at a spot in the illustration (null to stop). */
    pointAt(p: { x: number; y: number } | null) {
        this.pointing = p;
        if (p && this.move) {
            this.move = undefined;
            this.cb.onMove?.(undefined);
        }
    }

    /** Illustration coordinates to viewport CSS px. */
    private artToScreen(x: number, y: number) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const s = Math.max(W / ART.w, H / ART.h);
        return { x: (W - ART.w * s) / 2 + x * s, y: H - ART.h * s + y * s };
    }

    /** Map the illustration (object-cover, bottom-anchored, like the video) to the viewport. */
    private anchorOnScreen() {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const s = Math.max(W / ART.w, H / ART.h);
        const offX = (W - ART.w * s) / 2;
        const offY = H - ART.h * s;
        return {
            x: offX + ANCHOR.x * s,
            y: offY + ANCHOR.y * s,
            height: ANCHOR.height * s,
            W,
            H,
        };
    }

    private resize = () => {
        const a = this.anchorOnScreen();
        this.renderer.setSize(a.W, a.H, false);
        this.camera.aspect = a.W / a.H;
        // Distance at which a 1.64 m robot is `a.height` px tall, then shift the frustum so its feet
        // land on the anchor point.
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
        const robotH = this.robot?.height || 1.64;
        this.pxPerM = a.height / robotH;
        const d = a.H / (2 * tanHalf * this.pxPerM);
        const eye = 1.05;
        this.camera.position.set(0, eye, d);
        this.camera.lookAt(0, eye, 0);
        this.camera.setViewOffset(
            a.W,
            a.H,
            a.W / 2 - a.x,
            a.H / 2 + eye * this.pxPerM - a.y,
            a.W,
            a.H
        );
        this.camera.updateProjectionMatrix();
        this.onScreen = a.x > -a.height * 0.3 && a.x < a.W + a.height * 0.3;
    };

    // ---------------------------------------------------------------- input

    private onPointer = (e: PointerEvent) => {
        this.ndc.set(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1
        );
        const head = this.headScreen();
        if (head) {
            const nx = (e.clientX - head.x) / (window.innerWidth * 0.5);
            const ny = (e.clientY - head.y) / (window.innerHeight * 0.5);
            this.lookTarget.set(
                THREE.MathUtils.clamp(nx, -1.2, 1.2),
                THREE.MathUtils.clamp(-ny, -1, 1)
            );
        }
        const hit = this.pick();
        if (hit !== this.hovering) {
            this.hovering = hit;
            this.cb.onHover?.(hit);
            // Ink turns WATO teal under the cursor.
            this.outlineMat.uniforms.uColor.value.set(
                hit ? 0x66ddc8 : 0x0b0d10
            );
            if (hit && !this.move) this.play("wave");
        }
    };

    private pick() {
        if (!this.robot || !this.onScreen || this.phase === "enter")
            return false;
        this.raycaster.setFromCamera(this.ndc, this.camera);
        // The legs are thin trusses: count anything inside the body's (loose) bounds as a hit.
        this.bounds.setFromObject(this.robot.hips).expandByScalar(0.03);
        return this.raycaster.ray.intersectsBox(this.bounds);
    }

    /**
     * Right arm straight out towards the target as seen on screen (the scene's robots are all to
     * Pioneer's right), angle measured in the body's frontal plane like the webcam retargeting.
     */
    private pointPose(): Pose | null {
        const robot = this.robot!;
        const p = this.pointing!;
        const target = this.artToScreen(p.x, p.y);
        robot.links
            .get("r_arm_link1")!
            .getWorldPosition(this.tmp)
            .project(this.camera);
        const sx = (this.tmp.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-this.tmp.y * 0.5 + 0.5) * window.innerHeight;
        const outward = Math.max(0, sx - target.x);
        const up = sy - target.y;
        const phi = Math.atan2(outward + 1, -up); // 0 = arm down, PI/2 = straight out
        const over = THREE.MathUtils.clamp((phi - 1.35) / 0.5, 0, 1);
        const head = this.headScreen();
        const hx = head
            ? (target.x - head.x) / (window.innerWidth * 0.5)
            : -0.5;
        const hy = head ? (target.y - head.y) / (window.innerHeight * 0.5) : 0;
        return {
            r_shoulder_pitch: -0.25 - Math.PI * over * over * (3 - 2 * over),
            r_shoulder_roll: THREE.MathUtils.clamp(
                phi <= Math.PI / 2 ? phi : Math.PI - phi,
                0,
                1.57
            ),
            r_elbow: -0.05,
            r_forearm_roll: 0,
            ...POINT,
            neck_yaw: THREE.MathUtils.clamp(hx * 0.9 + 0.3, -1.2, 1.2),
            neck_pitch: THREE.MathUtils.clamp(hy * 0.35, -0.3, 0.5),
            waist_yaw: THREE.MathUtils.clamp(hx * 0.25, -0.4, 0.4),
        };
    }

    private headScreen() {
        const head = this.robot?.links.get("head");
        if (!head || !this.onScreen) return null;
        head.getWorldPosition(this.tmp).project(this.camera);
        return {
            x: (this.tmp.x * 0.5 + 0.5) * window.innerWidth,
            y: (-this.tmp.y * 0.5 + 0.5) * window.innerHeight,
        };
    }

    // ---------------------------------------------------------------- frame

    private loop = () => {
        if (this.disposed) return;
        this.raf = requestAnimationFrame(this.loop);
        if (document.hidden) return;
        const dt = Math.min(this.clock.getDelta(), 0.1);
        const t = this.clock.elapsedTime;
        const robot = this.robot!;

        // Walk in from the right, turn to face the street, then idle.
        const target: Pose = { ...REST };
        if (this.phase === "enter") {
            this.walkX = Math.max(0, this.walkX - dt * 0.55);
            Object.assign(target, MOVE_BY_ID.march.pose(t));
            if (this.walkX === 0) this.phase = "turn";
        } else if (this.phase === "turn") {
            this.yaw += (-0.35 - this.yaw) * Math.min(1, dt * 3);
            if (Math.abs(this.yaw + 0.35) < 0.02) this.phase = "idle";
        } else {
            if (this.move) {
                this.moveT += dt;
                Object.assign(target, this.move.pose(this.moveT));
                if (
                    this.move.duration !== undefined &&
                    this.moveT > this.move.duration
                ) {
                    this.move = undefined;
                    this.cb.onMove?.(undefined);
                    this.nextIdle = t + 8 + Math.random() * 6;
                }
            } else if (!this.reducedMotion && t > this.nextIdle) {
                this.play(
                    IDLE_MOVES[Math.floor(Math.random() * IDLE_MOVES.length)]
                );
            }
            this.look.lerp(this.lookTarget, Math.min(1, dt * 4));
            const point =
                this.pointing && !this.hovering ? this.pointPose() : null;
            if (point) {
                Object.assign(target, point);
            } else if (!this.move?.ownsHead) {
                // Head yaw is in the robot's frame; it is turned -0.35 rad towards the street.
                target.neck_yaw =
                    (target.neck_yaw ?? 0) + this.look.x * 0.9 + 0.3;
                target.neck_pitch =
                    (target.neck_pitch ?? 0) - this.look.y * 0.3 + 0.08;
                target.waist_yaw = (target.waist_yaw ?? 0) + this.look.x * 0.15;
            }
            target.waist_yaw =
                (target.waist_yaw ?? 0) + 0.02 * Math.sin(t * 0.8);
        }

        // Lanterns sway a little in the wind.
        this.lantern.intensity =
            1.4 + 0.15 * Math.sin(t * 2.1) * Math.sin(t * 0.7 + 1);

        const k =
            1 - Math.exp(-dt * (this.move || this.phase === "enter" ? 16 : 7));
        robot.joints.forEach((j, name) => {
            const goal = target[name] ?? 0;
            if (Math.abs(goal - j.value) > 1e-5)
                robot.set(name, j.value + (goal - j.value) * k);
        });
        robot.hips.position.x = this.walkX;
        robot.hips.rotation.y = this.yaw;
        robot.ground();

        this.outlineMat.uniforms.uWidth.value = outlineWidth(
            this.camera,
            window.innerHeight,
            1.6
        );
        this.renderer.render(this.scene, this.camera);
        this.cb.onHead?.(this.phase === "idle" ? this.headScreen() : null);
    };
}
