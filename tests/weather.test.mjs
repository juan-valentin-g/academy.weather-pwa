import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { GET } from "../app/api/weather/route.js";
import { getWeatherByCity, getWeatherByCoords } from "../app/lib/weather.js";

const originalFetch = globalThis.fetch;
const originalKey = process.env.WEATHER_API_KEY;
const fakeKey = "test-private-key";
const weather = { name: "Oaxaca", main: { temp: 20 } };
const request = (query) => new Request(`http://localhost/api/weather?${query}`);

beforeEach(() => {
  process.env.WEATHER_API_KEY = fakeKey;
  globalThis.fetch = async () => { throw new Error("Unexpected fetch"); };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.WEATHER_API_KEY;
  else process.env.WEATHER_API_KEY = originalKey;
});

test("city parameters are encoded and the private key is only sent upstream", async () => {
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://api.openweathermap.org");
    assert.equal(parsed.searchParams.get("q"), "Ciudad de México&appid=other");
    assert.equal(parsed.searchParams.get("appid"), fakeKey);
    assert.equal(parsed.searchParams.get("units"), "metric");
    assert.equal(parsed.searchParams.get("lang"), "es");
    assert.equal(options.cache, "no-store");
    return Response.json(weather);
  };
  const response = await GET(request(new URLSearchParams({ city: "Ciudad de México&appid=other" })));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), weather);
});

test("zero coordinates are valid", async () => {
  globalThis.fetch = async (url) => {
    const params = new URL(url).searchParams;
    assert.equal(params.get("lat"), "0");
    assert.equal(params.get("lon"), "0");
    return Response.json(weather);
  };
  assert.equal((await GET(request("lat=0&lon=0"))).status, 200);
});

test("invalid coordinates fail without calling OpenWeather", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json(weather); };
  for (const query of ["", "city=", "lat=&lon=0", "lat=0", "lat=no&lon=0", "lat=91&lon=0", "lat=0&lon=-181"]) {
    assert.equal((await GET(request(query))).status, 400, query);
  }
  assert.equal(calls, 0);
});

test("a missing key gives an actionable configuration error", async () => {
  delete process.env.WEATHER_API_KEY;
  const response = await GET(request("city=Oaxaca"));
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /WEATHER_API_KEY/);
});

test("provider errors never expose its response body or private key", async () => {
  for (const [upstream, expected] of [[401, 502], [403, 502], [404, 404], [429, 429], [500, 502]]) {
    globalThis.fetch = async () => new Response(fakeKey, { status: upstream });
    const response = await GET(request("city=Oaxaca"));
    assert.equal(response.status, expected);
    assert.equal((await response.text()).includes(fakeKey), false);
  }
});

test("network failures and invalid provider JSON produce a safe error", async () => {
  for (const fetcher of [
    async () => { throw new Error(`URL contains ${fakeKey}`); },
    async () => new Response("not JSON"),
  ]) {
    globalThis.fetch = fetcher;
    const response = await GET(request("city=Oaxaca"));
    assert.equal(response.status, 502);
    assert.equal((await response.text()).includes(fakeKey), false);
  }
});

test("browser helpers call the same-origin route without a key", async () => {
  const urls = [];
  globalThis.fetch = async (url) => { urls.push(url); return Response.json(weather); };
  assert.deepEqual(await getWeatherByCity(" Ciudad de México "), weather);
  assert.deepEqual(await getWeatherByCoords(17, -96), weather);
  assert.equal(urls[0], "/api/weather?city=Ciudad+de+M%C3%A9xico");
  assert.equal(urls[1], "/api/weather?lat=17&lon=-96");
});

test("browser helpers propagate the server error to the screen", async () => {
  globalThis.fetch = async () => Response.json({ error: "Ciudad inexistente" }, { status: 404 });
  await assert.rejects(getWeatherByCity("invalid"), /Ciudad inexistente/);
});
