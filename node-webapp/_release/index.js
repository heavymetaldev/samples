const appInsights = require("applicationinsights");
const http = require("http");

appInsights
  .setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY || "empty")
  .setSendLiveMetrics(true)
  .start();

const server = http.createServer((request, response) => {
  console.log("processing request..");

  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("Hello World!");

  console.log("request done.");
});

const port = process.env.PORT || 1337;
server.listen(port);

console.log("Server running at http://localhost:%d", port);
