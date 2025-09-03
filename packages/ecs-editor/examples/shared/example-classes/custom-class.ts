import { MyCustomDecorator } from "../example-decorators/custom-decorator";

@MyCustomDecorator
export class MyCustomClass {
    static property = 10;
    static method(requiredStaticParam: number, optionalStaticParam?: string) {
        return 'hello world!' as const;
    }

    property = 'Hi mom!';
    method(requiredInstanceParam: object, optionalInstanceParam?: Record<string, () => 'Hi mom!'>) {
        return 'Hello, father.' as const;
    }
}