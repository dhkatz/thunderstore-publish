#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --unstable
import * as TOML from "npm:@aduh95/toml@0.4.2";

/**
 * Thunderstore.toml manifest file
 */
interface Manifest {
    package: {
        namespace: string;
        name: string;
        versionNumber: string;
        description: string;
        websiteUrl?: string;
        dependencies?: Record<string, string>;
        containsNsfwContent?: boolean;
    };
    publish: {
        communities: string[];
        categories: string[] | Record<string, string[]>;
        repository: string;
    };
    build: {
        icon: string;
        readme: string;
        outdir: string;
        copy?: { source: string, target: string; }[];
    };
}

//Read in thunderstore.toml
const manifest = TOML.parse(await Deno.readTextFile("./thunderstore.toml")) as Partial<Manifest>;

const namespace = Deno.env.get("TS_NAMESPACE") ?? manifest.package?.namespace ?? Deno.env.get("GITHUB_REPOSITORY_OWNER");
if (!namespace) {
    console.log("::error::Namespace not set");
    Deno.exit(1);
} else {
  console.log(`Namespace: ${namespace}`);
}

const name = Deno.env.get("TS_NAME") ?? manifest.package?.name ?? Deno.env.get("GITHUB_REPOSITORY")?.split("/")?.at(-1);
if (!name) {
    console.log("::error::Name not set");
    Deno.exit(1);
} else {
  console.log(`Name: ${name}`);
}

const versionNumber = Deno.env.get("TS_VERSION")?.replace(/v/g, "") ?? manifest.package?.versionNumber;
if (!versionNumber) {
    console.log("::error::Version not set");
    Deno.exit(1);
} else {
  console.log(`Version: ${versionNumber}`);
}

const description = Deno.env.get("TS_DESC")?.substring(0, 256) ?? manifest.package?.description;
if (!description) {
    console.log("::error::Description not set");
    Deno.exit(1);
} else {
  console.log(`Description: ${description}`);
}

const websiteUrl = Deno.env.get("TS_WEBSITE") ?? manifest.package?.websiteUrl ?? `${Deno.env.get("GITHUB_SERVER_URL")}/${Deno.env.get("GITHUB_REPOSITORY")}`;
console.log(`Website: ${websiteUrl}`);

const categories = Deno.env.get("TS_CATEGORIES")?.toLowerCase()?.replace(/\s/g, ",")?.split(",").filter(c => !!c) ?? manifest.publish?.categories;
if (!categories || categories.length === 0) {
    console.log("::error::Categories not set");
    Deno.exit(1);
} else {
  console.log(`Categories: ${JSON.stringify(categories)}`);
}

const re = /([a-zA-Z_0-9]*-[a-zA-Z_0-9]*)[\-@](\d+\.\d+\.\d+)/;

const dependencies = Deno.env.get("TS_DEPS")?.replace(/\s/g, ",")?.split(",")?.filter(c => !!c).reduce((acc, c) => {
    const parts = c.match(re);
    if (parts) {
        acc[parts[1]] = parts[2];
    } else {
        console.log("::error::Malformed dependency at ", c);
        Deno.exit(1);
    }

    return acc;
  }, {} as Record<string, string>) ?? manifest.package?.dependencies ?? {};
console.log(`Dependencies: ${JSON.stringify(dependencies)}`);

const communities = Deno.env.get("TS_COMMUNITIES")?.toLocaleLowerCase()?.replace(/\s/g, ",")?.split(",")?.filter(c => !!c) ?? manifest.publish?.communities;
if (!communities || communities.length === 0) {
    console.log("::error::Communities not set");
    Deno.exit(1);
} else {
  console.log(`Communities: ${JSON.stringify(communities)}`);
}

const containsNsfwContent = Deno.env.get("TS_NSFW")?.toLocaleLowerCase() === 'true' ?? manifest.package?.containsNsfwContent?.toString() === 'true' ?? false;
console.log(`Contains NSFW Content: ${containsNsfwContent}`);

const dev = Deno.env.get("TS_DEV")?.toLocaleLowerCase() === 'true' ?? false;
console.log(`Dev: ${dev}`);

const repository = Deno.env.get("TS_REPO") ?? manifest.publish?.repository ?? (dev ? "https://thunderstore.dev" : "https://thunderstore.io");
console.log(`Repository: ${repository}`);

const build = manifest.build;
if (!build) {
    console.log("::error::Build section not found");
    Deno.exit(1);
}

//these should be set already but we're rewriting the whole file anyways
const newManifest: Manifest = {
  package: {
    namespace,
    name,
    versionNumber,
    description,
    websiteUrl,
    containsNsfwContent,
    dependencies,
  },
  publish: {
    repository,
    categories,
    communities,
  },
  build,
};

//write config file back to disk
Deno.writeTextFile("./thunderstore.toml", TOML.stringify(newManifest));
