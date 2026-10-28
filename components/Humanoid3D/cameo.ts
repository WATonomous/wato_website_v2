// Landing-page cameo: Pioneer, cel-shaded with ink lines so it reads as part of the illustrated alley,
// walks in and stands on the sidewalk, watches the cursor, waves when hovered, and points at whichever
// of the scene's other robots the visitor hovers. A second Pioneer replaces the drawn robot peeking out
// from behind the car, in its pose and hidden behind the car's outline (the background video swaps to a
// copy with the drawing painted out while this one is on screen).
import * as THREE from "three";
import { PioneerRobot } from "./robot";
import carOutline from "./car_outline.json";
import { MOVE_BY_ID, Move, Pose, REST, hand } from "./moves";
import {
    buildCreases,
    buildHulls,
    makeComicMaterial,
    makeOutlineMaterial,
    outlineWidth,
} from "./materials";

/**
 * Where Pioneer stands in the 4000x2244 illustration (feet), and the scene's scale there: the bakery
 * door beside it (~2.1 m) is ~820 px, so ~390 px a metre. Pioneer is drawn at its true CAD height.
 */
const ANCHOR = { x: 3330, y: 1830, pxPerMetre: 390 };
const ART = { w: 4000, h: 2244 };
/** The peeking Pioneer: feet (hidden behind the car) and scene scale there, matched to the drawing. */
const PEEK = { x: 2080, y: 1549, pxPerMetre: 400 };
const PEEK_X = 50; // its spot in the 3D scene, well away from the sidewalk Pioneer

/** The drawing's pose: left arm bent up with the index finger raised, right hand on the car roof. */
const PEEK_POSE: Pose = {
    ...REST,
    l_shoulder_roll: 0.95,
    l_upper_arm_yaw: -1.57,
    l_elbow: -1.4,
    l_forearm_roll: 0.2,
    ...hand("l", [0.8, 0, 1, 1, 1]),
    r_shoulder_pitch: -0.9,
    r_shoulder_roll: 0.3,
    r_elbow: -1.0,
    ...hand("r", [0.5, 0.55, 0.6, 0.65, 0.7]),
    Hip_F_L: 0,
    Hip_F_R: 0,
    Knee_L: 0,
    Knee_R: 0,
    Ankle_P_L: 0,
    Ankle_P_R: 0,
};

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

    // the peeking Pioneer
    private peek?: PioneerRobot;
    private peekCam = new THREE.PerspectiveCamera(20, 1, 0.1, 50);
    private peekLook = new THREE.Vector2();
    private peekHover = false;
    private peekOutline = makeOutlineMaterial();
    private peekCrease = new THREE.LineBasicMaterial({
        color: 0x14100c,
        transparent: true,
        opacity: 0.75,
    });
    private maskScene = new THREE.Scene();
    private maskCam = new THREE.OrthographicCamera(0, 1, 0, 1, -1, 1);
    private mask = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshBasicMaterial({
            colorWrite: false,
            depthWrite: false,
            depthTest: false,
            stencilWrite: true,
            stencilRef: 1,
            stencilFunc: THREE.AlwaysStencilFunc,
            stencilZPass: THREE.ReplaceStencilOp,
            side: THREE.DoubleSide,
        })
    );
    private ground!: THREE.Mesh;
    private sideLights: THREE.Light[] = [];
    private peekLights: [THREE.Light, number][] = [];
    private reducedMotion: boolean;

    constructor(
        private canvas: HTMLCanvasElement,
        private cb: CameoCallbacks = {}
    ) {
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            stencil: true,
        });
        this.renderer.autoClear = false;
        this.maskScene.add(this.mask);
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
        this.sideLights.push(key);
        const lantern = new THREE.DirectionalLight(0x66ddc8, 1.4);
        this.lantern = lantern;
        lantern.position.set(-2, 4, 1.5);
        this.scene.add(lantern);
        const sky = new THREE.HemisphereLight(0xbfd8e0, 0x2a2018, 1.1);
        this.scene.add(sky);
        this.sideLights.push(lantern, sky);

        // The peeking Pioneer's own light, matched to the drawing: the teal lantern hanging just
        // above-left of it is the key, the warm shop window behind-right gives a rim, and the shade
        // under the overhang keeps the fill low. Only switched on for its render pass.
        const peekTarget = new THREE.Object3D();
        peekTarget.position.set(PEEK_X, 1.2, 0);
        this.scene.add(peekTarget);
        const peekKey = new THREE.DirectionalLight(0xaacfd2, 0);
        peekKey.position.set(PEEK_X - 1.6, 2.6, 1.2);
        const peekRim = new THREE.DirectionalLight(0xffb36b, 0);
        peekRim.position.set(PEEK_X + 2, 1.8, -1.5);
        const peekFill = new THREE.HemisphereLight(0x6f8f99, 0x1a1a1c, 0);
        for (const l of [peekKey, peekRim]) l.target = peekTarget;
        this.scene.add(peekKey, peekRim, peekFill);
        this.peekLights.push([peekKey, 2.6], [peekRim, 1.6], [peekFill, 0.7]);

        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 6),
            new THREE.ShadowMaterial({ opacity: 0.38 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.ground = ground;

        window.addEventListener("resize", this.resize);
        window.addEventListener("pointermove", this.onPointer, {
            passive: true,
        });
        this.resize();
    }

    async load(url: string) {
        const model = await PioneerRobot.loadScene(url);
        if (this.disposed) return;
        const peekModel = model.clone(); // shares the meshes' geometry
        const robot = PioneerRobot.fromScene(model);
        this.robot = robot;
        this.buildPeek(PioneerRobot.fromScene(peekModel));
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

    private buildPeek(peek: PioneerRobot) {
        this.peek = peek;
        // Drawn only where the car's outline (stencil 1) is not.
        const behindCar = (m: THREE.Material) => {
            m.stencilWrite = true;
            m.stencilRef = 1;
            m.stencilFunc = THREE.NotEqualStencilFunc;
            return m;
        };
        for (const m of peek.meshes) {
            const mat = behindCar(makeComicMaterial(this.comicUniforms));
            // Painted a touch cooler, like the drawing's grey (its own lights do the rest).
            (mat as THREE.MeshToonMaterial).color.setRGB(0.52, 0.6, 0.64);
            m.material = mat;
            m.castShadow = false;
            this.mats.push(mat);
        }
        for (const m of peek.glowMeshes)
            m.material = behindCar(this.glowMat.clone());
        buildHulls(
            peek.meshes,
            behindCar(this.peekOutline) as THREE.ShaderMaterial
        );
        buildCreases(
            peek.meshes,
            behindCar(this.peekCrease) as THREE.LineBasicMaterial,
            50
        );
        for (const [k, v] of Object.entries(PEEK_POSE)) peek.set(k, v);
        peek.hips.position.x = PEEK_X;
        peek.hips.rotation.y = -0.15;
        peek.ground();
        this.scene.add(peek.hips);
        this.resize();
    }

    get isHovering() {
        return this.hovering || this.peekHover;
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
        this.peekOutline.dispose();
        this.peekCrease.dispose();
        this.mask.geometry.dispose();
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
            pxPerM: ANCHOR.pxPerMetre * s,
            W,
            H,
        };
    }

    /** Frame `cam` so a figure standing at `x` in the 3D scene has its feet on `anchor` in the art. */
    private frame(
        cam: THREE.PerspectiveCamera,
        x: number,
        anchor: { x: number; y: number; pxPerMetre: number }
    ) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const p = this.artToScreen(anchor.x, anchor.y);
        const s = Math.max(W / ART.w, H / ART.h);
        const pxPerM = anchor.pxPerMetre * s;
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
        const d = H / (2 * tanHalf * pxPerM);
        const eye = 1.05;
        cam.aspect = W / H;
        cam.position.set(x, eye, d);
        cam.lookAt(x, eye, 0);
        cam.setViewOffset(W, H, W / 2 - p.x, H / 2 + eye * pxPerM - p.y, W, H);
        cam.updateProjectionMatrix();
    }

    private resize = () => {
        if (this.peek) {
            this.frame(this.peekCam, PEEK_X, PEEK);
            // Car outline in screen pixels for the stencil pass.
            const W = window.innerWidth;
            const H = window.innerHeight;
            const shape = new THREE.Shape(
                (carOutline as number[][]).map(([x, y]) => {
                    const p = this.artToScreen(x, y);
                    return new THREE.Vector2(p.x, p.y);
                })
            );
            this.mask.geometry.dispose();
            this.mask.geometry = new THREE.ShapeGeometry(shape);
            Object.assign(this.maskCam, {
                left: 0,
                right: W,
                top: 0,
                bottom: H,
            });
            this.maskCam.updateProjectionMatrix();
        }
        const a = this.anchorOnScreen();
        this.renderer.setSize(a.W, a.H, false);
        this.camera.aspect = a.W / a.H;
        // Distance at which a metre is `pxPerM` px, then shift the frustum so Pioneer's feet
        // land on the anchor point.
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
        this.pxPerM = a.pxPerM;
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
        this.onScreen =
            a.x > -this.pxPerM * 0.5 && a.x < a.W + this.pxPerM * 0.5;
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
        const peekHit = this.pickPeek();
        if (peekHit !== this.peekHover) {
            this.peekHover = peekHit;
            this.peekOutline.uniforms.uColor.value.set(
                peekHit ? 0x66ddc8 : 0x0b0d10
            );
            document.body.style.cursor =
                peekHit || this.hovering ? "pointer" : "";
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

    private pickPeek() {
        if (!this.peek) return false;
        this.raycaster.setFromCamera(this.ndc, this.peekCam);
        this.bounds.setFromObject(this.peek.hips).expandByScalar(0.02);
        // Only the part above the car counts: clicks on the car stay the car's.
        const hit = this.raycaster.ray.intersectBox(this.bounds, this.tmp);
        if (!hit) return false;
        const p = this.tmp.clone().project(this.peekCam);
        const sx = (p.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-p.y * 0.5 + 0.5) * window.innerHeight;
        const ctx = (carOutline as number[][]).map(([x, y]) =>
            this.artToScreen(x, y)
        );
        let inside = false;
        for (let i = 0, j = ctx.length - 1; i < ctx.length; j = i++) {
            const a = ctx[i];
            const b = ctx[j];
            if (
                a.y > sy !== b.y > sy &&
                sx < ((b.x - a.x) * (sy - a.y)) / (b.y - a.y) + a.x
            )
                inside = !inside;
        }
        return !inside;
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
        this.peekOutline.uniforms.uWidth.value = outlineWidth(
            this.peekCam,
            window.innerHeight,
            1.4
        );
        const peek = this.peek;
        if (peek) {
            // Peeking Pioneer: holds the drawing's pose, eyes on the cursor, and wags its raised
            // finger when hovered.
            const pt: Pose = { ...PEEK_POSE };
            const head = peek.links
                .get("head")!
                .getWorldPosition(this.tmp)
                .project(this.peekCam);
            const hx = (this.ndc.x - head.x) * 0.9;
            const hy = this.ndc.y - head.y;
            this.peekLook.lerp(new THREE.Vector2(hx, hy), Math.min(1, dt * 4));
            pt.neck_yaw = THREE.MathUtils.clamp(this.peekLook.x + 0.15, -1, 1);
            pt.neck_pitch = THREE.MathUtils.clamp(
                -this.peekLook.y * 0.3 + 0.1,
                -0.3,
                0.45
            );
            if (this.peekHover && !this.reducedMotion) {
                pt.l_forearm_roll = 0.2 + 0.5 * Math.sin(t * 10);
                pt.l_wrist_flex = 0.3 * Math.sin(t * 10);
            }
            peek.joints.forEach((j, name) => {
                const goal = pt[name] ?? 0;
                if (Math.abs(goal - j.value) > 1e-5)
                    peek.set(name, j.value + (goal - j.value) * k);
            });
            peek.ground();
        }

        // Sidewalk Pioneer, then the peeking one through the car-shaped stencil.
        this.renderer.clear();
        if (peek) peek.hips.visible = false;
        this.renderer.render(this.scene, this.camera);
        if (peek) {
            peek.hips.visible = true;
            robot.hips.visible = false;
            this.ground.visible = false;
            this.renderer.clear(false, true, true);
            this.renderer.render(this.maskScene, this.maskCam);
            const saved = this.sideLights.map((l) => l.intensity);
            this.sideLights.forEach((l) => (l.intensity = 0));
            this.peekLights.forEach(([l, i]) => (l.intensity = i));
            this.renderer.render(this.scene, this.peekCam);
            this.sideLights.forEach((l, i) => (l.intensity = saved[i]));
            this.peekLights.forEach(([l]) => (l.intensity = 0));
            robot.hips.visible = true;
            this.ground.visible = true;
        }
        this.cb.onHead?.(this.phase === "idle" ? this.headScreen() : null);
    };
}
