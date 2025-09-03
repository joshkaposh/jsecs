// import { Project, StructureKind, type ProjectOptions } from 'ts-morph';
import { cwd, normalizePath, getClasses, fileExists } from './project';
import { Project, SourceFile } from 'ts-morph';

const tsConfigFilePath = normalizePath(`${cwd()}/tsconfig.json`);
if (await fileExists(tsConfigFilePath)) {

    const project = new Project({
        tsConfigFilePath
    });


    // processValidFiles(valid_files, f => {
    // console.log(f.name);
    // f.file.getClasses().forEach((c) => {
    //     console.log(c.getName());

    //     c.getDecorators().forEach(d => console.log(`Decorator: ${d.getName()}`));
    // });

    // });
}

// export function manipulate() {}

// function getValidFiles(projectDir: string, project: Project) {

//     const glob = new Glob('src/**/*.ts');
//     const files = Array.from(glob.scanSync(projectDir));

//     const valid_files = [];

//     for (const _filePath of files) {
//         const filePath = normalizePath(`${projectDir}/${_filePath}`);
//         const srcFile = project.getSourceFileOrThrow(filePath);

//         const classes = srcFile.getClasses();
//         for (const declaration of classes) {
//             if (declaration.getDecorators().length > 0) {
//                 valid_files.push({
//                     fileName: getFileName(filePath),
//                     filePath: filePath,
//                 });
//             }
//         }

//     }

//     return valid_files

// }

// const valid_files = getValidFiles(projectDir, project);

// async function processValidFiles(files: ReturnType<typeof getValidFiles>, process: (state: {
//     name: string;
//     file: SourceFile;
// }) => void | Promise<void>) {
//     for (let i = 0; i < files.length; i++) {
//         const { filePath, fileName } = files[i]!;
//         const file = project.getSourceFileOrThrow(filePath);

//         await process({ file, name: fileName });
//     }
// }


// const customFile = project.createSourceFile('src/my-generated-file.ts', "export class MyGeneratedClass {}");

// const myClass = customFile.getClassOrThrow('MyGeneratedClass')

// const myInterface = customFile.addInterface({
//     name: 'MyGeneratedInterface',
//     isExported: true,
//     properties: [{
//         name: "myProp",
//         type: "number",
//     }],
// });

// myClass.addImplements(myInterface.getName());
// myClass.addProperty({
//     name: 'myProp',
//     initializer: '5'
// });

// myClass.addDecorator()

// const result = customFile.emitSync();
// result.
// }