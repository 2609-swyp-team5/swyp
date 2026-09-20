#!/usr/bin/env node

import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(frontendDirectory, "src");
const uiDirectory = path.join(sourceDirectory, "common/components/ui");
const utilsPath = path.join(sourceDirectory, "common/lib/utils.ts");
const componentsConfigPath = path.join(frontendDirectory, "components.json");

function pascalCase(value) {
    return value
        .split(/[-_]/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...(await walk(entryPath)));
        } else {
            files.push(entryPath);
        }
    }

    return files;
}

function run(command, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: frontendDirectory,
            stdio: "inherit",
            shell: process.platform === "win32",
        });

        child.on("error", reject);
        child.on("exit", (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
        });
    });
}

async function assertShadcnAliases() {
    const config = JSON.parse(await readFile(componentsConfigPath, "utf8"));
    const aliases = config.aliases ?? {};

    if (
        aliases.components !== "@/common/components" ||
        aliases.ui !== "@/common/components/ui" ||
        aliases.utils !== "@/common/lib/utils"
    ) {
        throw new Error(
            "components.json aliases must point to @/common/components, @/common/components/ui, and @/common/lib/utils.",
        );
    }
}

async function normalizeUiFiles() {
    const uiFiles = (await readdir(uiDirectory)).filter((file) => file.endsWith(".tsx"));
    const renames = uiFiles
        .map((file) => {
            const stem = file.slice(0, -4);
            const normalizedName = `${pascalCase(stem)}.tsx`;

            return {
                from: file,
                fromStem: stem,
                to: normalizedName,
                toStem: normalizedName.slice(0, -4),
            };
        })
        .filter(({ from, to }) => from !== to);

    const targetNames = new Set(uiFiles.map((file) => pascalCase(file.slice(0, -4)).toLowerCase()));
    if (targetNames.size !== uiFiles.length) {
        throw new Error("Multiple UI files would normalize to the same PascalCase filename.");
    }

    const temporaryRenames = renames.map(({ from, to }, index) => ({
        from,
        to,
        temporary: `.ui-normalize-${Date.now()}-${index}.tsx`,
    }));

    for (const { from, temporary } of temporaryRenames) {
        await rename(path.join(uiDirectory, from), path.join(uiDirectory, temporary));
    }

    for (const { temporary, to } of temporaryRenames) {
        await rename(path.join(uiDirectory, temporary), path.join(uiDirectory, to));
    }

    const importRenames = new Map(renames.map(({ fromStem, toStem }) => [fromStem, toStem]));
    const sourceFiles = (await walk(sourceDirectory)).filter((file) => /\.(ts|tsx)$/.test(file));
    const changedFiles = [];

    for (const file of sourceFiles) {
        const original = await readFile(file, "utf8");
        let updated = original;

        for (const [fromStem, toStem] of importRenames) {
            const importPattern = new RegExp(
                `(@/common/components/ui/)${escapeRegExp(fromStem)}(?=["'])`,
                "g",
            );
            updated = updated.replace(importPattern, `$1${toStem}`);
        }

        if (file !== utilsPath) {
            updated = updated
                .replaceAll('from "cn"', 'from "@/common/lib/utils"')
                .replaceAll("from 'cn'", 'from "@/common/lib/utils"');
        }

        if (updated !== original) {
            await writeFile(file, updated);
            changedFiles.push(file);
        }
    }

    const normalizedFiles = (await readdir(uiDirectory))
        .filter((file) => file.endsWith(".tsx"))
        .map((file) => path.join("src/common/components/ui", file));

    if (normalizedFiles.length > 0 || changedFiles.length > 0) {
        await run("npx", ["prettier", "--write", ...normalizedFiles, ...changedFiles]);
    }

    console.log(`Normalized ${normalizedFiles.length} UI component files.`);
}

async function assertComponentsAreNew(components) {
    const uiFiles = (await readdir(uiDirectory)).filter((file) => file.endsWith(".tsx"));
    const existingNames = new Set(
        uiFiles.map((file) => pascalCase(file.slice(0, -4)).toLowerCase()),
    );
    const existingComponents = components.filter(
        (component) =>
            /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i.test(component) &&
            existingNames.has(pascalCase(component).toLowerCase()),
    );

    if (existingComponents.length > 0) {
        throw new Error(
            `These UI components already exist: ${existingComponents.join(", ")}. Do not re-add customized components with the CLI.`,
        );
    }
}

async function main() {
    await assertShadcnAliases();

    const arguments_ = process.argv.slice(2);
    const normalizeOnly = arguments_.includes("--normalize-only");
    const components = arguments_.filter((argument) => argument !== "--normalize-only");

    if (!normalizeOnly && components.length === 0) {
        throw new Error("Usage: npm run ui:add -- <component> [...components]");
    }

    if (!normalizeOnly) {
        await assertComponentsAreNew(components);
        const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
        await run(npxCommand, ["shadcn@latest", "add", ...components, "--yes"]);
    }

    await normalizeUiFiles();
}

main().catch((error) => {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
});
