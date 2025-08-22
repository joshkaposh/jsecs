import { isClassConstructor, isClassDecoratorContext, type AnyRecord, type ConcreteClass, type NoArgsClass, type NoReadonly, type TypeId } from "@repo/util";
import { defineProperties, descriptorMap } from '@repo/util/descriptor'
import { StorageType } from "./storage-type";
import { ComponentCloneBehavior } from "./clone";

type EntityMapper = unknown;

export type ComponentId = number;
export type ResourceId = number;

export interface ComponentMutability<M extends boolean = true> {
    readonly MUTABLE: M;
};

export type ImmutableComponent = ComponentMutability<false>;
export type MutableComponent = ComponentMutability<true>;

interface Base<M extends boolean = true> extends ComponentMutability<M>, TypeId { }

export type Resource<T extends ConcreteClass = ConcreteClass, Mutable extends boolean = boolean> = ResourceBase<T, Mutable> & T;

interface ResourceBase<T extends ConcreteClass, M extends boolean> extends Base<M> {
    fromWorld(): InstanceType<T>;
}

type ComponentHook = number;

type RequiredComponentsRegistrator = any;

/**
 * Any javascript class. These should be small with no behavior.
 */
export interface Component<T extends ConcreteClass = ConcreteClass, M extends boolean = boolean> extends Base<M> {
    new(...params: ConstructorParameters<T>): InstanceType<T>;
    readonly storage_type: StorageType;


    registerRequiredComponents(component_id: ComponentId, required_components: RequiredComponentsRegistrator): void;

    /**
     * Gets the `onAdd` [`ComponentHook`] for this [`Component`] if one is defined
     */
    onAdd(): ComponentHook | undefined | void;
    /**
     * Gets the `onInsert` [`ComponentHook`] for this [`Component`] if one is defined
     */
    onInsert(): ComponentHook | undefined | void;
    /**
     * Gets the `onReplace` [`ComponentHook`] for this [`Component`] if one is defined
     */
    onReplace(): ComponentHook | undefined | void;
    /**
     * Gets the `onRemove` [`ComponentHook`] for this [`Component`] if one is defined
     */
    onRemove(): ComponentHook | undefined | void;
    /**
     * Gets the `onDespawn` [`ComponentHook`] for this [`Component`] if one is defined
     */
    onDespawn(): ComponentHook | undefined | void;
    /**
     * Called when registering this component, allowing to override clone function (or disable cloning) for this component.
     */
    cloneBehavior(): ComponentCloneBehavior;

    /**
     * Maps the entities on this component using the given [`EntityMapper`]. This is used to remap entities in contexts like scenes and entity cloning.
     * When deriving [`Component`], this is populated by annotating fields containing entities with `@entities`.
     * 
     * Fields with `@entities` must implement [`MapEntities`].
     */
    mapEntities(this: InstanceType<Component<T, M>>, _mapper: EntityMapper): void;
}

type ComponentConfig = NoReadonly<Omit<Component, 'type_id'>>;

const COMPONENT_KEYS = [
    'storage_type',
    'MUTABLE',
    'onAdd',
    'onInsert',
    'onReplace',
    'onRemove',
    'onDespawn',
    'cloneBehavior',
] as const;

function defaultConfig(config: Partial<ComponentConfig>): ComponentConfig {
    const empty_hook = () => {
        return undefined as unknown as number;
    };
    config.storage_type ??= StorageType.Table;
    config.MUTABLE ??= true;
    config.onAdd ??= empty_hook;
    config.onInsert ??= empty_hook;
    config.onReplace ??= empty_hook;
    config.onRemove ??= empty_hook;
    config.onDespawn ??= empty_hook;
    config.cloneBehavior ??= () => ComponentCloneBehavior.Default;
    config.registerRequiredComponents ??= () => { }
    return config as ComponentConfig;
}

function component_attrs(config: Partial<ComponentConfig>, writable: boolean) {
    return <T extends AnyRecord>(target: T) => {
        defineProperties(target,
            descriptorMap(
                defaultConfig(config),
                COMPONENT_KEYS,
                writable
            )
        );
        return target;
    }
}

type ClassDec = <T extends ConcreteClass>(target: T, context: ClassDecoratorContext<T>) => void;

function initializeProperties<T extends object>(this: T, properties?: object) {
    const self = this;
    component_attrs(properties ?? Object.create(null), false)(self);
}

/**
 * Decorator function for a `Component` of type `C`.
 * 
 * This decorator can be added to [`Class`]s from external libraries.
 * ```
 * import { SomeClass as TSomeClass } from 'some-lib';
 * const config = {storage_type: 1, MUTABLE: false}
 * const SomeClass = Component(TSomeClass, config);
 * SomeClass.storage_type // 1
 * SomeClass.MUTABLE // false
 * ```
 * 
 * It has a few different call signatures:
 * ```
 * \@Component
 *  class Simple { }
 * 
 * \@Component({
 *   storage_type: 1,
 *   mutable: false
 * })
 * class Configured { }
 * 
 * \@Component()
 * class NoArguments { }
 * 
 * const StronglyTyped = Component(class OopsNoTypesHere {});
 * // no typescript error
 * StronglyTyped.storage_type
 * ```
 * **Considerations:**
 * 
 * If you want to add ([`Relationship`], [`RelationshipTarget`], required components, etc)
 *  to the [`Component`], then use the respective decorators.
 */

// , 
export function Component(config: Partial<ComponentConfig>): ClassDec;
export function Component<C extends ConcreteClass>(type: C): Component<C>;
export function Component<C extends ConcreteClass>(type: C, config?: Partial<ComponentConfig>): Component<C>;
export function Component<C extends ConcreteClass>(value?: C | Partial<ComponentConfig>, context?: Partial<ComponentConfig> | ClassDecoratorContext<C>): void | ClassDec | Component<C> {
    // this function is currently being used as a Decorator,
    // so use the context `addInitializer` to add properties
    // after the class definition is fully initialized.
    if (isClassDecoratorContext(context)) {
        context.addInitializer(initializeProperties);
        return;
        // check if config is a class or config object
    } else if (isClassConstructor(value)) {
        initializeProperties.call(value, context);
        return value as unknown as Component<C>
    } else {
        // this was called with a config object, return a decorator
        return <C extends ConcreteClass>(_target: C, ctx: ClassDecoratorContext<C>) => {
            console.log('derive#Component context: ', ctx.name, ctx.metadata);
            ctx.addInitializer(function (this) {
                const self = this;
                component_attrs(value ?? Object.create(null), false)(self);
            });
        }
    }
}

export function require<const R extends (Component<NoArgsClass> | (() => Component))[]>(...required_components: R) {
    return <C extends ConcreteClass>(_target: C, context: ClassDecoratorContext<C>) => {
        const metadata = context.metadata;
        if (!Array.isArray(metadata.require)) {
            metadata.require = [];
        }
        // @ts-expect-error
        metadata.require.push(...required_components);
    }
}

export function entities<E>(value: E, ctx: ClassFieldDecoratorContext) {
    const metadata = ctx.metadata;
    console.log('derive#entities', value, ctx);

}