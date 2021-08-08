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
    this.env = env;
  }

  async initialize() {
    let storedValue = await this.state.storage.get("value");
    let storedSessions = await this.state.storage.get("sessions");
    this.value = storedValue || 0;
    this.sessions = storedSessions || []; 
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
    let currentSessions = this.sessions;

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
      currentValue = this.value===0 ? 3 : this.value*3;
      await this.state.storage.put("value", this.value);
      break;
    case "/tester":
      currentSessions.push("1234"); 
      await this.state.storage.put("sessions", this.sessions);
      break; 
    case "/":
      // Just serve the current value. No storage calls needed!
      break;
    default:
      return new Response("Not found", {status: 404});
    }


    return new Response(JSON.stringify({ currentValue, currentSessions }), {status: 200});
  }
}
