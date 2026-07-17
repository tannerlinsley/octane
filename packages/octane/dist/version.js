import pkg from "../package.json" with { type: "json" };
const version = pkg.version;
export {
  version
};
