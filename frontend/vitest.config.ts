import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths(), react()],
    test: {
        environment: "jsdom",
        setupFiles: ["./tests/setup.ts"],
        include: ["**/*.{test,spec}.{ts,tsx}"],
        exclude: ["**/node_modules/**", ".npm/**", ".next/**", "e2e/**"],
        clearMocks: true,
        restoreMocks: true,
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov"],
            exclude: [
                "**/*.config.{js,mjs,ts}",
                "**/*.d.ts",
                "**/node_modules/**",
                "**/.next/**",
                "**/.husky/**",
                "**/e2e/**",
                "**/tests/**",
            ],
        },
    },
});
