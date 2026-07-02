import rateLimit from 'express-rate-limit';

// Rate limiting is disabled during automated tests so it doesn't collide
// with business-logic thresholds (e.g. the 5-failed-attempt account lockout)
// or cause later test suites to start failing with 429s from a shared
// in-memory store.
const skipInTest = () => process.env.NODE_ENV === 'test';

export const apiLimiter=rateLimit({

windowMs:15*60*1000,

limit:100,

skip:skipInTest,

message:{
message:"Too many requests"
}

});


export const loginLimiter=rateLimit({

windowMs:15*60*1000,

limit:5,

skip:skipInTest,

message:{
message:"Too many login attempts"
}

});


export const registerLimiter=rateLimit({

windowMs:60*60*1000,

limit:10,

skip:skipInTest,

message:{
message:"Too many registration attempts"
}

});