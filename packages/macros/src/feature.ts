export function feature_flag(flag: string | number) {
    return process.env[flag];
}

export function IS_PROD(is_prod?: {} | null) {
    return Boolean(process.env.PROD ?? is_prod);
}

export function IS_DEV(is_dev?: {} | null) {
    return Boolean(process.env.PROD ?? is_dev ?? process.env.DEV ?? true);
}