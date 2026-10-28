// Human-friendly names shown in tooltips / readouts.
const FINGER: Record<string, string> = {
    "": "middle",
    i: "index",
    r: "ring",
    l: "little",
};
const PHALANX: Record<string, string> = {
    abd: "spread",
    mcp: "knuckle",
    pip: "middle joint",
    dip: "tip joint",
};
export function prettyJoint(name: string): string {
    const side = (s: string) => (s === "l" || s === "L" ? "Left" : "Right");
    let m = name.match(/^(l|r)_(?:(i|r|l)_)?(abd|mcp|pip|dip)$/);
    if (m) return `${side(m[1])} ${FINGER[m[2] ?? ""]} finger ${PHALANX[m[3]]}`;
    m = name.match(/^(l|r)_th_(c|f|mcp|ip)$/);
    if (m)
        return `${side(m[1])} thumb ${
            { c: "rotation", f: "flex", mcp: "knuckle", ip: "tip joint" }[m[2]]
        }`;
    m = name.match(/^(l|r)_(.+)$/);
    if (m) return `${side(m[1])} ${m[2].replace(/_/g, " ")}`;
    m = name.match(/^(Hip_F|Hip_A|Hip_R|Knee|Ankle_P|Ankle_R)_(L|R)$/);
    if (m) {
        const part = {
            Hip_F: "hip flexion",
            Hip_A: "hip abduction",
            Hip_R: "hip rotation",
            Knee: "knee",
            Ankle_P: "ankle pitch",
            Ankle_R: "ankle roll",
        }[m[1]];
        return `${side(m[2])} ${part}`;
    }
    return name.replace(/_/g, " ");
}

export function jointGroup(
    name: string
): "Head & Torso" | "Arms" | "Hands" | "Legs" {
    if (/^(waist|neck)/.test(name)) return "Head & Torso";
    if (/^(Hip|Knee|Ankle)/.test(name)) return "Legs";
    if (/shoulder|upper_arm|elbow|forearm|wrist/.test(name)) return "Arms";
    return "Hands";
}
