# Getting Started

First, install the engine:

```bash
bun add jsecs
```

## Available Commands

- `bun build`: Runs the build command for each package
- `bun test`: Runs tests in each package using Bun
- `bun test:watch`: Runs tests in watch mode

### Creating your first App

The simplest way to create a new App is the following:

```typescript
import {App} from "jsecs";
App.new().run();
```

this largely does nothing. (Jsecs is designed to be modular.) To include a game loop, renderer, and other useful things, add the [`DefaultPlugins`] `Plugin`.

```typescript
import {App, DefaultPlugins} from "jsecs";
App
    .new()
    .addPlugins(DefaultPlugins)
    .run();
```

> [!Tip]
> `DefaultPlugins` reads the process.env, so you can customize which plugins are included by default


## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.com/docs/reference/configuration)
- [CLI Usage](https://turborepo.com/docs/reference/command-line-reference)
