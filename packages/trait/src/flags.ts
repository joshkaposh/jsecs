import { bit } from 'joshkaposh-option'

export type Flags = number;
export const INSTANCE = 0 as number;
export const STATIC = 1 as number;
export const REQUIRED = 2 as number;
export const PROVIDED = 3 as number;


// |  static     provided   | 
//    false *2)+1+ false + 1  = 0 | inst req
//    true  *2+1+ true   = 2 | stat pro
//    true  *2+1+ false  = 1 | stat req 
//    false *2+1+ true   = 1 | inst prov


const CHARS: Record<string, number> = {
    '0': 0,
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
} as const;

export const Flags = {
    instance: INSTANCE,
    static: STATIC,
    provided: PROVIDED,
    required: REQUIRED,
    mask(isStatic: number | boolean, isProvided: number | boolean) {
        // @ts-expect-error
        return 1 + isStatic | 1 << isProvided * 2 + 1;
    },
    deserialize(str: `${Flags}${string}`) {
        let flags = 0;
        let index = 0;
        while (true) {
            const char = str[index]!;
            if (char in CHARS) {
                index++;
                flags |= CHARS[char]!;
            } else {
                return [flags, str.slice(index)] as [number, string];
            }
        }
    },
    format(flags: Flags) {
        let result = '';

        if (bit.check(flags, INSTANCE)) {
            result += 'instance';
        } else {
            result += 'static';
        }

        if (bit.check(flags, PROVIDED)) {
            result += ", provided";
        } else {
            result += ', required';
        }

        return result;
    }
} as const;
