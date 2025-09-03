export function normalizePath(path: string) {
    const platform = process.platform;
    // MacOS or Linux
    if (platform === 'darwin' || platform === 'linux') {
        return path.replaceAll('\\', '/');
        // Windows
    } else if (process.platform === 'win32') {
        return path.replaceAll('/', '\\');
    } else {
        return path;
    }
}

export function popPath(path: string) {
    const platform = process.platform;
    // MacOS or Linux
    if (platform === 'darwin' || platform === 'linux') {
        // return path.replaceAll('\\', '/');

        for (let i = path.length - 1; i >= 0; i--) {
            if (path[i] === '/') {
                return path.slice(0, i);
            }
        }
        return path;

        // Windows
    } else if (process.platform === 'win32') {
        for (let i = path.length - 1; i >= 0; i--) {
            if (path[i] === '\\') {
                return path.slice(0, i);
            }
        }
        return path;
        // return path.replaceAll('/', '\\');
    } else {
        return path;
        // return path;
    }
}

export function cwd() {
    const args = process.argv.slice(2);

    // if (args.length === 0) {
    //     console.error('build cli must provide at least one argument (project directory)')
    // }

    const dir = process.cwd();
    if (args.length > 0) {
        return normalizePath(`${dir}/${args[0]!}`);
    }
    return dir;

    // const dirName = args[0]!;

}

export function getFileName(path: string) {
    for (let i = path.length - 1; i >= 0; i--) {
        const s = path[i];
        if (s === '\\' || s === '/') {
            return path.slice(i + 1);
        }
    }
    return path;
}

export function fileExists(path: string | URL) {
    return Bun.file(path).exists();
}