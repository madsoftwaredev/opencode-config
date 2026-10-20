import { expect, test } from "bun:test";

test("TS helpers do not require UI packages absent from the user's config directory", async () => {
  const transpiler = new Bun.Transpiler({ loader: "ts" });
  const source = await Bun.file(new URL("./sidebar.ts", import.meta.url)).text();
  const compiled = transpiler.transformSync(source);
  const imports = transpiler.scanImports(compiled);
  expect(imports.filter((entry) => entry.path.startsWith("@opentui/"))).toEqual([]);
});
