import * as devalue from "devalue";
async function executeServerFunction(fn, body) {
  const args = devalue.parse(body);
  const value = await fn.apply(null, args);
  return devalue.stringify({ value });
}
export {
  executeServerFunction
};
