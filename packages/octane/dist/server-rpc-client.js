import * as devalue from "devalue";
async function __serverRpc(hash, args) {
  let response;
  try {
    response = await fetch("/_$_ripple_rpc_$_/" + hash, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: devalue.stringify(args)
    });
  } catch {
    throw new Error("An error occurred while trying to call the Octane server function.");
  }
  if (!response.ok) {
    let message = `Server function call failed with status ${response.status}`;
    const body2 = await response.text().catch(() => "");
    if (body2) {
      try {
        const parsed = JSON.parse(body2);
        message = typeof parsed?.error === "string" && parsed.error ? parsed.error : body2;
      } catch {
        message = body2;
      }
    }
    throw new Error(message);
  }
  const body = await response.text();
  if (body === "") {
    throw new Error(
      "The server function endpoint returned an empty response. Is the Octane server running?"
    );
  }
  return devalue.parse(body).value;
}
export {
  __serverRpc
};
