import { isClassConstructor, isClassDecoratorContext, applyProperties, TypeId, type AbstractClass, type Class, type ConcreteClass, type NoArgsClass, type NoReadonly } from "@repo/util";
import { StorageType } from "./storage-type";
import { ComponentCloneBehavior } from "./clone";
import type { Entity } from "../entity";

type EntityMapper = unknown;
type ComponentHook = number;

export type ComponentId = number;
export type ResourceId = number;

export interface ComponentMutability<M extends boolean = true> {
    readonly MUTABLE: M;
};

export type ImmutableComponent = ComponentMutability<false>;
export type MutableComponent = ComponentMutability<true>;

interface Base<M extends boolean = true> extends ComponentMutability<M>, TypeId { }
interface ResourceBase<T extends Class, M extends boolean> extends Base<M> {
    fromWorld(): InstanceType<T>;
}

export type Resource<T extends Class = ConcreteClass, Mutable extends boolean = boolean> = ResourceBase<T, Mutable> & T;


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

type RequiredComponentsRegistrator = any;

type ComponentConfig = NoReadonly<Omit<Component, 'type_id'>>;



type ClassDec = <T extends ConcreteClass>(target: T, context: ClassDecoratorContext<T>) => void;


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

// function component_attrs<Config extends Partial<AnyRecord>>(config: Config,default_config: (config: Config) => Required<Config>, writable: boolean) {
//     return <T extends AnyRecord>(target: T) => {
//         defineProperties(target,
//             descriptorMap(
//                 default_config(config),
//                 COMPONENT_KEYS,
//                 writable
//             )
//         );
//         return target;
//     }
// }
function initializeProperties<T extends object>(this: T, properties?: object) {
    const self = this;
    // apply `TypeId` if not already present
    TypeId(self);
    applyProperties(properties ?? Object.create(null), {
        default: defaultConfig,
        keys: COMPONENT_KEYS,
        writable: false
    })(self);
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
    console.log('COMPONENT ', value, context)
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
                applyProperties(value ?? Object.create(null), {
                    default: defaultConfig,
                    writable: false
                })(self);
            });
        }
    }
}

type RequiredComponentDerive = Component<NoArgsClass> | (() => InstanceType<Component>);

/**
 * Use this to add required component(s) to `Component`.
 * 
 * @example
 * 
 * const CompA = Component(class CompA {});
 * const CompB = Component(
 * \@require(CompA)
 * class CompB {}
 * );
 * 
 * const world = World.new();
 * world.spawn(new CompB());
 * // spawns an entity with components CompA, CompB
 * // `CompA` is implicitly added
 * 
 * const CompC = Component(
 * \@require(
 *      CompA,
 *      // you can pass closures that return Component instances
 *      () => new CompB()
 *  )
 *  class CompC {}
 * );
 * 
 * world.spawn(new CompC());
 * // spawns an entity with components CompA, CompB, CompC
 * // `CompA` and `CompB` is implicitly added
 * 
 */
export function require<const R extends RequiredComponentDerive[]>(...required_components: R) {
    return <C extends ConcreteClass>(_target: C, context: ClassDecoratorContext<C>) => {
        const metadata = context.metadata as { require: any[] };
        if (!Array.isArray(metadata.require)) {
            metadata.require = [];
        }
        metadata.require.push(...required_components);
    }
}

/**
 * Allows a class field to be used as an EntityMapper
 * 
 * this is used in cases such as entity cloning.
 */
export function entities<E extends Entity | Entity[] | Set<Entity>>(_value: E, _ctx: ClassFieldDecoratorContext) {
    // const metadata = ctx.metadata;
    // console.log('derive#entities', value, ctx);

}

