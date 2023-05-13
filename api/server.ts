// @deno-types="@types/express"
import express from "express";

import cors from "cors";
import proxy from "express-http-proxy";

const app = express();

app.use(cors());
app.use("/", proxy("http://mirakc:40772"));

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
