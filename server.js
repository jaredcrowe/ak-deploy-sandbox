const express = require('express');
const app = express();

const deploySandbox = require('./deploySandbox');

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// Enable CORS
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get("/deploy/:pkg/:example", async function (req, res) {
  const { pkg, example } = req.params;
  try {
    const url = await deploySandbox(pkg, example);
    res.status(200);
    res.send(url);
  } catch (err) {
    res.status(500);
    res.send(err);
  }
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
