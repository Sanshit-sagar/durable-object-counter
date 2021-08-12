// Worker

export default {
  async fetch(request, env) {
    return await handleRequest(request, env);
  }
}

async function handleRequest(request, env) {
  const url = request.url;
  const { pathname } = new URL(url);

  let id = env.COUNTER.idFromName(`${pathname}`);
  let obj = env.COUNTER.get(id);
  let resp = await obj.fetch(request.url);
  let count = await resp.text();

  return new Response(`Durable Object ${pathname} count: ` + count);
}

// Durable Object

export class Counter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async initialize() {
    let counter = await this.state.storage.get("counter");
    this.counter = counter || 0;
  }

  // Handle HTTP requests from clients.
  async fetch(request) {
    if (!this.initializePromise) {
      this.initializePromise = this.initialize().catch((err) => {
        this.initializePromise = undefined;
        throw err
      });
    }
    await this.initializePromise;

    let { pathname } = new URL(request.url);
    let currentCounter = this.count;

    switch (pathname) {
      case "/increment":
        currentCounter = ++this.value;
        await this.state.storage.put("counter", this.value);
        break;
      case "/decrement":
        currentValue = --this.value;
        await this.state.storage.put("counter", this.value);
        break;
      case "/":
        // Just serve the current value. No storage calls needed!
        break;
      default:
        return new Response("Not found", {status: 404});
    }

    let responseBody = JSON.stringify({ currentValue, currentSessions }); 
    return new Response(responseBody, {status: 200});
  }
}
