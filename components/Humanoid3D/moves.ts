// Poses and animated moves for Pioneer, as joint-angle maps (radians, URDF joint names).
// Sign conventions (checked with forward kinematics): shoulder_pitch < 0 raises the arm forward,
// shoulder_roll > 0 lifts it out to the side, elbow < 0 bends it, finger joints > 0 curl,
// Hip_F > 0 swings the leg forward, Knee < 0 bends it, neck_yaw > 0 turns to the robot's left.

export type Pose = Record<string, number>;
export type Side = "l" | "r";

const FINGERS = ["", "i_", "r_", "l_"] as const; // middle, index, ring, little

/** curls: [thumb, index, middle, ring, little] in 0..1 */
export function hand(side: Side, curls: number[], spread = 0): Pose {
    const [th, ix, md, rg, lt] = curls;
    const p: Pose = {};
    const amount: Record<string, number> = { "": md, i_: ix, r_: rg, l_: lt };
    const spreadSign: Record<string, number> = {
        "": 0,
        i_: -1,
        r_: 0.6,
        l_: 1,
    };
    for (const f of FINGERS) {
        const c = amount[f];
        p[`${side}_${f}mcp`] = c * 1.45;
        p[`${side}_${f}pip`] = c * 1.5;
        p[`${side}_${f}dip`] = c * 1.1;
        p[`${side}_${f}abd`] = spread * spreadSign[f] * 0.22 * (1 - c);
    }
    p[`${side}_th_c`] = 0.25 + th * 0.6;
    p[`${side}_th_f`] = th * 0.9;
    p[`${side}_th_mcp`] = th * 0.8;
    p[`${side}_th_ip`] = th * 0.9;
    return p;
}

export const OPEN = [0, 0, 0, 0, 0];
export const RELAXED = [0.15, 0.2, 0.25, 0.3, 0.35];
export const FIST = [0.9, 1, 1, 1, 1];
export const PEACE = [0.9, 0, 0, 1, 1];
export const THUMBS_UP = [0, 1, 1, 1, 1];
export const ROCK = [0.8, 0, 1, 1, 0];
export const POINT = [0.8, 0, 1, 1, 1];
const COUNT: number[][] = [
    FIST,
    POINT,
    PEACE,
    [0.9, 0, 0, 0, 1],
    [0.9, 0, 0, 0, 0],
    OPEN,
];

function legs(hip: number, side?: Side): Pose {
    // Hip, knee and ankle pitch that keep the foot flat: ankle = hip + knee.
    const knee = -2 * hip;
    const out: Pose = {};
    for (const s of side ? [side] : (["l", "r"] as Side[])) {
        const S = s.toUpperCase();
        out[`Hip_F_${S}`] = hip;
        out[`Knee_${S}`] = knee;
        out[`Ankle_P_${S}`] = hip + knee;
    }
    return out;
}

function step(lift: number, s: Side): Pose {
    const S = s.toUpperCase();
    return {
        [`Hip_F_${S}`]: lift * 0.9,
        [`Knee_${S}`]: -lift * 1.6,
        [`Ankle_P_${S}`]: -lift * 0.7,
    };
}

export const REST: Pose = {
    ...legs(0.06),
    l_shoulder_roll: 0.1,
    r_shoulder_roll: 0.1,
    l_elbow: -0.3,
    r_elbow: -0.3,
    l_shoulder_pitch: -0.08,
    r_shoulder_pitch: -0.08,
    ...hand("l", RELAXED),
    ...hand("r", RELAXED),
};

export interface Move {
    id: string;
    label: string;
    emoji: string;
    /** seconds; undefined = loops until another move is picked */
    duration?: number;
    /** does this move drive the head itself (otherwise the head keeps following the cursor)? */
    ownsHead?: boolean;
    /** link the camera should move in on while this plays (playground only) */
    focus?: string[];
    pose: (t: number) => Pose;
    blurb: string;
}

const sin = Math.sin;
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export const MOVES: Move[] = [
    {
        id: "wave",
        label: "Wave",
        emoji: "👋",
        duration: 3.6,
        blurb: "Shoulder, elbow and 16 finger joints, all at once.",
        pose: (t) => ({
            r_shoulder_pitch: -2.75,
            r_shoulder_roll: 0.45 + 0.28 * sin(t * 9),
            r_elbow: -0.55 + 0.35 * sin(t * 9 + 0.6),
            r_forearm_roll: 0.3,
            ...hand("r", OPEN, 1),
            l_shoulder_roll: 0.12,
        }),
    },
    {
        id: "flex",
        label: "Flex",
        emoji: "💪",
        duration: 3.4,
        blurb: "Double biceps. Those are 53 Nm shoulders.",
        pose: (t) => {
            const k = 0.15 * sin(t * 6);
            return {
                l_shoulder_roll: 1.45,
                r_shoulder_roll: 1.45,
                l_upper_arm_yaw: -1.57,
                r_upper_arm_yaw: -1.57,
                l_elbow: -1.75 - k,
                r_elbow: -1.75 + k,
                ...hand("l", FIST),
                ...hand("r", FIST),
                ...legs(0.12),
                Hip_A_L: 0.12,
                Hip_A_R: 0.12,
                waist_yaw: 0.12 * sin(t * 3),
            };
        },
    },
    {
        id: "dance",
        label: "Dance",
        emoji: "🕺",
        blurb: "Every motor, on beat. 128 BPM.",
        ownsHead: true,
        pose: (t) => {
            const b = t * ((128 / 60) * Math.PI); // one beat = half a cycle
            const bounce = Math.abs(sin(b));
            const sway = sin(b / 2);
            return {
                ...legs(0.12 + 0.22 * bounce),
                waist_yaw: 0.45 * sway,
                neck_yaw: -0.3 * sway,
                neck_pitch: 0.2 * bounce - 0.05,
                r_shoulder_pitch: -1.3 + 0.9 * sin(b),
                l_shoulder_pitch: -1.3 - 0.9 * sin(b),
                r_shoulder_roll: 0.35 + 0.25 * sway,
                l_shoulder_roll: 0.35 - 0.25 * sway,
                r_elbow: -1.6 + 0.4 * sin(b * 2),
                l_elbow: -1.6 - 0.4 * sin(b * 2),
                r_forearm_roll: 0.6 * sway,
                l_forearm_roll: -0.6 * sway,
                ...hand("l", sway > 0 ? POINT : FIST),
                ...hand("r", sway < 0 ? POINT : FIST),
            };
        },
    },
    {
        id: "count",
        focus: ["r_hand_H"],
        label: "Count",
        emoji: "🖐️",
        duration: 6.5,
        blurb: "22 DOF hand counting 0 to 5.",
        pose: (t) => {
            const i = Math.min(COUNT.length - 1, Math.floor(t / 1));
            return {
                r_shoulder_pitch: -1.35,
                r_shoulder_roll: 0.25,
                r_upper_arm_yaw: 0.35,
                r_elbow: -1.85,
                r_forearm_roll: 1.45,
                r_wrist_flex: 0.1,
                ...hand("r", COUNT[i], i >= 4 ? 1 : 0.4),
                neck_yaw: -0.35,
                neck_pitch: 0.15,
            };
        },
        ownsHead: true,
    },
    {
        id: "peace",
        focus: ["head", "r_hand_H"],
        label: "Peace",
        emoji: "✌️",
        duration: 3.2,
        blurb: "Selfie mode.",
        pose: (t) => ({
            r_shoulder_pitch: -1.15,
            r_shoulder_roll: 0.35,
            r_upper_arm_yaw: 0.25,
            r_elbow: -2.0,
            r_forearm_roll: 1.45,
            ...hand("r", PEACE, 1),
            neck_pitch: -0.12 + 0.03 * sin(t * 4),
            neck_yaw: -0.18,
            waist_yaw: -0.15,
        }),
        ownsHead: true,
    },
    {
        id: "thumbs",
        focus: ["head", "r_hand_H"],
        label: "Thumbs up",
        emoji: "👍",
        duration: 3,
        blurb: "Nice.",
        pose: (t) => ({
            r_shoulder_pitch: -0.6,
            r_shoulder_roll: 0.2,
            r_elbow: -1.0,
            r_forearm_roll: -0.15,
            ...hand("r", THUMBS_UP),
            neck_pitch: 0.12 * Math.max(0, sin(t * 5)),
        }),
    },
    {
        id: "rock",
        label: "Rock",
        emoji: "🤘",
        duration: 4,
        blurb: "Head-banging, within neck limits.",
        ownsHead: true,
        pose: (t) => ({
            r_shoulder_pitch: -2.9,
            r_shoulder_roll: 0.35,
            l_shoulder_pitch: -2.9,
            l_shoulder_roll: 0.35,
            r_elbow: -0.4,
            l_elbow: -0.4,
            ...hand("r", ROCK),
            ...hand("l", ROCK),
            neck_pitch: 0.1 + 0.38 * Math.abs(sin(t * 7)),
            ...legs(0.1 + 0.1 * Math.abs(sin(t * 7))),
        }),
    },
    {
        id: "march",
        label: "March",
        emoji: "🦿",
        blurb: "12 leg joints stepping in place.",
        pose: (t) => {
            const p = t * 4.2;
            const l = Math.max(0, sin(p));
            const r = Math.max(0, -sin(p));
            return {
                ...legs(0.08),
                ...step(0.75 * l, "l"),
                ...step(0.75 * r, "r"),
                r_shoulder_pitch: -0.5 * sin(p),
                l_shoulder_pitch: 0.5 * sin(p),
                r_elbow: -0.9,
                l_elbow: -0.9,
                waist_yaw: 0.12 * sin(p),
                ...hand("l", [0.6, 0.6, 0.6, 0.6, 0.6]),
                ...hand("r", [0.6, 0.6, 0.6, 0.6, 0.6]),
            };
        },
    },
    {
        id: "squat",
        label: "Squat",
        emoji: "🏋️",
        duration: 4.4,
        blurb: "222 Nm knees doing leg day.",
        pose: (t) => {
            const d = ease(Math.min(1, t / 0.9)) * (1 - ease((t - 3.3) / 0.9));
            const rep =
                0.5 -
                0.5 *
                    Math.cos(
                        Math.min(1, Math.max(0, (t - 0.4) / 2.8)) * Math.PI * 2
                    );
            const depth = d * (0.35 + 0.55 * rep);
            return {
                ...legs(depth),
                r_shoulder_pitch: -1.45 * d,
                l_shoulder_pitch: -1.45 * d,
                r_elbow: -0.2,
                l_elbow: -0.2,
                ...hand("l", OPEN),
                ...hand("r", OPEN),
            };
        },
    },
    {
        id: "tpose",
        label: "T-Pose",
        emoji: "✝️",
        duration: 3,
        blurb: "Every rigger's favourite pose.",
        pose: () => ({
            l_shoulder_roll: 1.57,
            r_shoulder_roll: 1.57,
            l_elbow: 0,
            r_elbow: 0,
            ...hand("l", OPEN, 1),
            ...hand("r", OPEN, 1),
            ...legs(0),
        }),
    },
    {
        id: "wiggle",
        focus: ["l_hand_H", "r_hand_H"],
        label: "Wiggle",
        emoji: "🎹",
        duration: 4,
        blurb: "A finger wave across both hands.",
        pose: (t) => {
            const p: Pose = {
                r_shoulder_pitch: -1.1,
                l_shoulder_pitch: -1.1,
                r_elbow: -0.9,
                l_elbow: -0.9,
                r_forearm_roll: 0.2,
                l_forearm_roll: 0.2,
                r_wrist_flex: 0.2,
                l_wrist_flex: 0.2,
                neck_pitch: 0.35,
            };
            const order: [Side, string][] = [
                ["l", "l_"],
                ["l", "r_"],
                ["l", ""],
                ["l", "i_"],
                ["r", "i_"],
                ["r", ""],
                ["r", "r_"],
                ["r", "l_"],
            ];
            order.forEach(([s, f], i) => {
                const c = 0.5 + 0.5 * sin(t * 9 - i * 0.7);
                p[`${s}_${f}mcp`] = c * 1.3;
                p[`${s}_${f}pip`] = c * 1.2;
                p[`${s}_${f}dip`] = c * 0.8;
            });
            return p;
        },
        ownsHead: true,
    },
];

export const MOVE_BY_ID: Record<string, Move> = Object.fromEntries(
    MOVES.map((m) => [m.id, m])
);
