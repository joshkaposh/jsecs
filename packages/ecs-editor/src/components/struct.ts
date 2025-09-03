import html from 'solid-js/html';
import type { ClassStructure as _Struct, ProcessedFile } from '@repo/ast';
import { buildPaths } from './object-builder';
import { createStore } from 'solid-js/store';
import { StructureKind, type MethodDeclarationStructure, type OptionalKind, type PropertyDeclarationStructure } from 'ts-morph';
import { For } from 'solid-js';
import { Show } from './flow';

export type Struct = _Struct;

type StructProperty = OptionalKind<PropertyDeclarationStructure>;
type StructMethod = OptionalKind<MethodDeclarationStructure>;

function splitProperties(s: Struct['struct']) {
    const properties = s.properties ?? [];
    const static_properties = [];
    const instance_properties = [];
    for (let i = 0; i < properties.length; i++) {
        const prop = properties[i]!;
        const is_static = prop.isStatic;

        if (is_static) {
            static_properties.push(prop);
        } else {
            instance_properties.push(prop);
        }
    }

    return [static_properties, instance_properties];
}

function splitMethods(s: Struct['struct']) {
    const methods = s.methods ?? [];
    const static_methods = [];
    const instance_methods = [];
    for (let i = 0; i < methods.length; i++) {
        const method = methods[i]!;
        if (method.isStatic) {
            static_methods.push(method)
        } else {
            instance_methods.push(method);
        }
    }

    return [static_methods, instance_methods];
}
type ClassMetadata = ReturnType<typeof getClassMetadata>;

function getClassMetadata(type: Struct['struct']) {
    const [sp, ip] = splitProperties(type);
    const [sm, im] = splitMethods(type);

    return {
        name: type.name,
        is: {
            exported: Boolean(type.isExported),
            abstract: Boolean(type.isAbstract),
            default_export: Boolean(type.isDefaultExport),
        },
        decorators: type.decorators,
        staticProperties: sp,
        staticMethods: sm,
        instanceProperties: ip,
        instanceMethods: im,
    } as const;
}

function inferTypeFromInitializer(str: string) {
    if (
        str === 'true'
        || str === 'false'
        || str === 'null'
        || str === 'undefined'

    ) {
        return str;
    }

    const char = str[0]!;
    if (char === '"' || char === "'") {
        return 'string';
    }

    if (char === '{') {
        return 'object';
    }

    if (char === '(' || str.startsWith('function')) {
        return 'function'
    }

    if (parseInt(char)) {
        return 'number';
    } else {
        return 'unknown';
    }
    // const n = Number(str);

    // if (!Number.isNaN(n)) {

    // }
}

function addPrefixes(property: PropertyDeclarationStructure) {
    let str = '';
    if (property.isStatic) {
        str = `static `
    }

    if (property.isReadonly) {
        str = `${str}readonly `;
    }

    return str;

}

function formatProperty(property: PropertyDeclarationStructure) {
    let type;
    if (property.type == null && typeof property.initializer === 'string') {
        type = inferTypeFromInitializer(property.initializer)
    } else {
        type = property.type;
    }

    return `${addPrefixes(property)}${property.name}: ${type} = ${property.initializer}`
}

function formatParams(method: MethodDeclarationStructure) {
    const params = method.parameters ?? [];
    const type_params = method.typeParameters ?? [];
    let str = '';
    for (let i = 0; i < params.length; i++) {
        str += `${params[i]!.name}: ${type_params[i]},`
    }
    return str;
}

function formatMethod(method: MethodDeclarationStructure) {
    let str = '';
    if (method.isAbstract) {
        str = 'abstract ';
    } else if (method.isStatic) {
        str = 'static '
    } else if (method.hasOverrideKeyword) {
        str = 'override ';
    }

    if (method.isAsync) {
        str = `${str} async `;
    }

    str += method.name;
    str += `( ${formatParams(method)} ):`;

    let returnType = 'unknown';
    if (typeof method.returnType === 'string' && method.returnType !== 'undefined') {
        returnType = method.returnType;
    }

    str += returnType;

    return str;
}

function Property(p: {
    property: PropertyDeclarationStructure;
}) {

    return html`
    <div>
        <p>${() => formatProperty(p.property)}</p>
    </div>`;
}


function Method(p: {
    method: MethodDeclarationStructure;
}) {

    console.log(p.method);


    return html`
    <div>
        <p>${() => formatMethod(p.method)}</p>
    </div>`;
}

type ClassPropertiesProps = {
    type: 'static' | 'instance';
    properties: PropertyDeclarationStructure[] | MethodDeclarationStructure[];
};

function ClassProperties(props: ClassPropertiesProps) {
    return html`
        <${For} each=${() => props.properties}>${(type: ClassPropertiesProps['properties'][number]) => {
            if (type.kind === StructureKind.Property) {
                return Property({ property: type });
            } else {
                return Method({ method: type });
            }
        }}<//>`;
}

export function Struct(props: {
    struct: ProcessedFile<Struct>,
    refetch: () => void;
}) {

    const struct = () => props.struct.data.struct;
    const [p, setProperties] = createStore(getClassMetadata(struct()));
    return html`
            <div>
            <p>name: ${() => p.name}</p>
            <p>abstract: ${() => String(p.is.abstract)}</p>
            <p>exported: ${() => String(p.is.exported)}</p>
            <p>default export: ${() => String(p.is.default_export)}</p>
            <hr />
            <${ClassProperties} type='static' properties=${() => p.staticProperties} />
            <${ClassProperties} type='instance' properties=${() => p.instanceProperties} />
            <${ClassProperties} type='static' properties=${() => p.staticMethods} />
            <${ClassProperties} type='instance' properties=${() => p.instanceMethods} />
            </div>
            
            `
}