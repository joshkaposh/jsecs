export function clamp(value: number, min: number, max: number) {
    value = Math.max(value, min);
    value = Math.min(value, max);
    return value;
}

export function lerp(src: number, dst: number, delta: number) {
    return src + (dst - src) * delta;
}