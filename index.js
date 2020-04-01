const express = require('express')
const cache = require('memory-cache')
const md5 = require('md5');
const app = express()
const port = 3030

const eTagCacheTimeout = 60*1000 // 1 minute
/*
 * Sort query string so that we cache it only once
 * example: ?foo=1&bar=2 is the same as ?bar=2&foo=1
 */
var sortQuery = (query) => {
  const orderedQuery = {};
  Object.keys(query).sort().forEach((key)=> {
      orderedQuery[key] = query[key];
  });
  return orderedQuery;
}

/* 
 * Generate ETag for given response (md5 hash)
 */
var ETagSetter = (content,req,res) => {
  let etag = md5(content) // Generate 
  let queryString = JSON.stringify(sortQuery(req.query))
  cache.put(req.path+queryString+'-ETag',etag,eTagCacheTimeout)
  res.setHeader('ETag',etag)
}
/*
 * This checks if ETag is in cache for given URL
 * And compares it with if-none-match
 * If true then send 304
 * Otherwise proceed with route execution
 */
var ETagChecker = function (req, res, next) {
  let queryString = JSON.stringify(sortQuery(req.query))
  let cachedEtag = cache.get(req.path+queryString+'-ETag')
  let requestEtag = req.header('if-none-match')
  if(cachedEtag && cachedEtag === requestEtag)
  {
    console.log(req.originalUrl+' cached!')
    res.sendStatus(304)
  }
  else
  {
    console.log(req.originalUrl+' not cached!')
    next()
  }
}
  
  app.use(ETagChecker)//This needs to be defined before the route to be executed beforehand

  app.get('/', (request, response) => {// This will always be executed as it does not save etag in cache
    response.send('Hi')
  })

  app.get('/testEtag',(request,response) => {//This will be executed only if ETagChecker executed 'next()'
    let content = 'Sample ETag example '+(Math.random()*1000).toString() //stub content
    ETagSetter(content,request,response)//This could be moved to app.use to run for each and every route
    response.send(content) //send response to the browser
})

app.listen(port, (err) => {
    if (err) {
      return console.log('something bad happened', err)
    }
  
    console.log(`server is listening on ${port}`)
  })