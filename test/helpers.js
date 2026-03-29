import { createServer } from "node:http";

/** Start a throwaway HTTP server on a random port. */
export async function testServer(handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

export function monitor(url, extra = {}) {
  return { id: "test", name: "test", url, method: "GET", interval: 60, timeout: 2, ...extra };
}
