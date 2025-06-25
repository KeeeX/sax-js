import eslintConfig from "@keeex/eslint-config";

export default await eslintConfig({
  environments: "library",
  mocha: true,
  react: false,
  typescript: true,
});
