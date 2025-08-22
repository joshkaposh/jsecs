import { u32, type Option } from "joshkaposh-option";

export type WorldId = number;

let id: Option<number> = -1;

export function WorldId() {
    id = u32.checked_add(id!, 1);
    return id;
}