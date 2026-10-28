// "Mirror mode": track the visitor's hands with MediaPipe through the webcam and retarget them onto
// Pioneer's arms and 22-DOF hands, in the spirit of the team's VR teleop pipeline.
// MediaPipe is loaded from a CDN only when the visitor turns this on.
import { Pose, Side } from "./moves";

const MP_VERSION = "0.10.14";
const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;
const MODEL =
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

type P3 = { x: number; y: number; z: number };

const sub = (a: P3, b: P3) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = (a: P3) => Math.hypot(a.x, a.y, a.z);
function angle(a: P3, b: P3) {
    const d = (a.x * b.x + a.y * b.y + a.z * b.z) / (len(a) * len(b) || 1);
    return Math.acos(Math.max(-1, Math.min(1, d)));
}
const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));

// MediaPipe hand landmarks: 0 wrist, thumb 1-4, index 5-8, middle 9-12, ring 13-16, little 17-20.
const CHAINS: [string, number[]][] = [
    ["i_", [0, 5, 6, 7, 8]],
    ["", [0, 9, 10, 11, 12]],
    ["r_", [0, 13, 14, 15, 16]],
    ["l_", [0, 17, 18, 19, 20]],
];

function retargetHand(side: Side, w: P3[], out: Pose) {
    for (const [f, [a, b, c, d, e]] of CHAINS) {
        const s1 = sub(w[b], w[a]);
        const s2 = sub(w[c], w[b]);
        const s3 = sub(w[d], w[c]);
        const s4 = sub(w[e], w[d]);
        out[`${side}_${f}mcp`] = clamp(angle(s1, s2) * 1.25 - 0.1, 0, 1.57);
        out[`${side}_${f}pip`] = clamp(angle(s2, s3) * 1.1, 0, 1.57);
        out[`${side}_${f}dip`] = clamp(angle(s3, s4) * 1.1, 0, 1.57);
    }
    const palm = len(sub(w[9], w[0])) || 1;
    const t1 = sub(w[2], w[1]);
    const t2 = sub(w[3], w[2]);
    const t3 = sub(w[4], w[3]);
    // Thumb opposition: how close the thumb tip is to the little-finger base.
    const opp = clamp(1.4 - len(sub(w[4], w[17])) / palm, 0, 1);
    out[`${side}_th_c`] = 0.2 + opp * 0.65;
    out[`${side}_th_f`] = opp * 1.0;
    out[`${side}_th_mcp`] = clamp(angle(t1, t2) * 1.4, 0, 1.4);
    out[`${side}_th_ip`] = clamp(angle(t2, t3) * 1.4, 0, 1.4);
    // Finger spread.
    const spread = clamp(
        (angle(sub(w[8], w[5]), sub(w[20], w[17])) - 0.2) * 0.6,
        0,
        0.26
    );
    out[`${side}_i_abd`] = -spread;
    out[`${side}_l_abd`] = spread;
    out[`${side}_r_abd`] = spread * 0.5;
}

/**
 * Arm: point the arm towards where the hand is on screen, relative to a virtual shoulder.
 * u, v are mirrored image coordinates in [0,1] (u = 1 is the visitor's right of the screen).
 */
function retargetArm(
    side: Side,
    u: number,
    v: number,
    roll: number,
    out: Pose
) {
    const sx = side === "l" ? 0.62 : 0.38; // robot's left arm appears on the screen's right
    const outward = side === "l" ? u - sx : sx - u;
    const up = 0.55 - v;
    const phi = Math.atan2(Math.max(0, outward) * 1.3 + 0.05, -up); // 0 = arm down, PI = overhead
    const over = clamp((phi - 1.35) / 0.5, 0, 1);
    out[`${side}_shoulder_pitch`] = -Math.PI * over * over * (3 - 2 * over);
    out[`${side}_shoulder_roll`] = clamp(
        phi <= Math.PI / 2 ? phi : Math.PI - phi,
        0,
        1.57
    );
    out[`${side}_elbow`] = -0.35;
    out[`${side}_forearm_roll`] = clamp(roll, -1.5, 1.5);
}

export class HandMirror {
    private video: HTMLVideoElement;
    private stream?: MediaStream;
    private landmarker: any;
    private raf = 0;
    private lastVideoTime = -1;
    private stopped = false;
    pose: Pose = {};
    hands = 0;

    constructor(private onPose: (p: Pose, hands: number) => void) {
        this.video = document.createElement("video");
        this.video.playsInline = true;
        this.video.muted = true;
    }

    get element() {
        return this.video;
    }

    async start() {
        this.stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" },
            audio: false,
        });
        this.video.srcObject = this.stream;
        await this.video.play();
        const vision: any = await import(
            /* webpackIgnore: true */ `${MP_BASE}/vision_bundle.mjs`
        );
        const fileset = await vision.FilesetResolver.forVisionTasks(
            `${MP_BASE}/wasm`
        );
        this.landmarker = await vision.HandLandmarker.createFromOptions(
            fileset,
            {
                baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
                runningMode: "VIDEO",
                numHands: 2,
            }
        );
        if (this.stopped) return this.stop();
        this.loop();
    }

    private loop = () => {
        if (this.stopped) return;
        this.raf = requestAnimationFrame(this.loop);
        if (this.video.currentTime === this.lastVideoTime) return;
        this.lastVideoTime = this.video.currentTime;
        const res = this.landmarker.detectForVideo(
            this.video,
            performance.now()
        );
        const pose: Pose = {};
        const n = res.landmarks?.length ?? 0;
        for (let i = 0; i < n; i++) {
            const img: P3[] = res.landmarks[i];
            const world: P3[] = res.worldLandmarks?.[i] ?? img;
            const u = 1 - img[0].x; // mirror, like a selfie
            const side: Side = u > 0.5 ? "l" : "r";
            if (`${side}_mcp` in pose) continue;
            retargetHand(side, world, pose);
            // Forearm roll from the knuckle line's tilt.
            const k = sub(img[17], img[5]);
            const tilt = Math.atan2(k.y, k.x * (side === "l" ? -1 : 1));
            retargetArm(side, u, (img[0].y + img[9].y) / 2, tilt * 0.6, pose);
        }
        this.pose = pose;
        this.hands = n;
        this.onPose(pose, n);
    };

    stop() {
        this.stopped = true;
        cancelAnimationFrame(this.raf);
        this.stream?.getTracks().forEach((t) => t.stop());
        this.landmarker?.close?.();
    }
}
