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
  let count = await resp.json();

  return new Response(`Durable Object ${pathname} has a count of: ${JSON.stringify(count)}`);
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
    let currentCounter = this.counter;

    switch (pathname) {
      case "/increment":
        currentCounter = ++this.counter;
        await this.state.storage.put("counter", this.counter);
        break;
      case "/decrement":
        currentCounter = --this.counter;
        await this.state.storage.put("counter", this.counter);
        break;
      case "/":
        // Just serve the current counter. No storage calls needed!
        break;
      default:
        return new Response("Not found", {status: 404});
    }

    let responseBody = { currentCounter }; 
    return new Response(responseBody, {status: 200});
  }
}
