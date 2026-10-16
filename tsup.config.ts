import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  outDir: "dist",
  format: ["esm", "cjs"],
  // tsup 8 injecte `baseUrl` dans le programme DTS ; TypeScript 6 le déprécie (TS5101).
  // Sans impact sur la sortie : l'option n'est utilisée que pour la résolution interne.
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: "es2022",
  platform: "neutral",
});
