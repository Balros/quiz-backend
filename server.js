const path = require('path');
const express = require('express');
const layout = require('express-layout');
const bodyParser = require('body-parser');

const routes = require('./routes.js');
const app = express();
const port = 3001;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const middlewares = [
  layout(),
  express.static(path.join(__dirname, 'public')),
  bodyParser.urlencoded({extended:true})
];
app.use(middlewares);
app.use(bodyParser.json());

app.use('/', routes);

app.listen(port, () => console.log(`Server running on port ${port}`));
