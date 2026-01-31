import NodeCache from "node-cache";

// stdTTL is the default time-to-live in seconds (e.g., 1 hour)
const myCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

export default myCache;