// Worker

export default {
  async fetch(request, env) {
    return await handleRequest(request, env);
  }
}

async function handleRequest(request, env) {
  const url = request.url;

  let id = env.COUNTER.idFromName(`${url}`);
  let obj = env.COUNTER.get(id);
  let resp = await obj.fetch(request.url);
  let count = await resp.text();

  return new Response(`Durable Object ${url} count: ` + count);
}

// Durable Object

export class Counter {
  constructor(state, env) {
    this.state = state;
  }

  async initialize() {
    let stored = await this.state.storage.get("value");
    this.value = stored || 0;
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

    let url = new URL(request.url);
    let currentValue = this.value;
    switch (url.pathname) {
    case "/increment":
      currentValue = ++this.value;
      await this.state.storage.put("value", this.value);
      break;
    case "/decrement":
      currentValue = --this.value;
      await this.state.storage.put("value", this.value);
      break;
    case "/wildcard":
      currentValue = this.value * 3;
      await this.state.storage.put("value", this.value);
      break;
    case "/":
      // Just serve the current value. No storage calls needed!
      break;
    default:
      return new Response("Not found", {status: 404});
    }

    // Return `currentValue`. Note that `this.value` may have been
    // incremented or decremented by a concurrent request when we
    // yielded the event loop to `await` the `storage.put` above!
    // That's why we stored the counter value created by this
    // request in `currentValue` before we used `await`.
    return new Response(currentValue);
  }
}
