// Worker

export default {
  async fetch(request, env) {
    return await handleRequest(request, env);
  }
}

async function handleRequest(request, env) {

  let id = env.COUNTER.idFromName(`test-drive`);
  let obj = env.COUNTER.get(id);

  let resp = await obj.fetch(request.url);
  let count = await resp.text();

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
        ++this.counter;
        await this.state.storage.put("counter", this.counter);
        break;
      case "/decrement":
        --this.counter;
        await this.state.storage.put("counter", this.counter);
        break;
      case "/":
        // Just serve the current counter. No storage calls needed!
        break;
      default:
        return new Response("Not found", {status: 404});
    }
 
    return new Response(this.counter, {status: 200});
  }
}
