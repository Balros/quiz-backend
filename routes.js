const express = require("express");
const router = express.Router();
const { Client, Node, Text, Data, Triple } = require("virtuoso-sparql-client");

const graphName = "http://www.semanticweb.org/semanticweb";
const format = "application/json";
const localClient = new Client("http://localhost:8890/sparql");
const prefixes = {
  foaf: "http://www.semanticweb.org/semanticweb#"
};
localClient.setQueryFormat(format);
localClient.addPrefixes(prefixes);
localClient.setQueryGraph(graphName);

router.get("/", (req, res) => {
  res.render("index");
});

router.get("/banany", (req, res) => {
  res.status(200).json({ hello: "world" });
});

router.get("/questionGroups", async (req, res) => {
  const query =
    "SELECT ?subject ?name WHERE {?subject foaf:author foaf:Adam; foaf:name ?name; rdf:type foaf:Question .  }";
  localClient.setQueryFormat(format);
  localClient.setQueryGraph(graphName);
  try {
    const results = await localClient.query(query);
    let questions = [];
    for (const question of results.results.bindings) {
      questions.push({ id: question.subject.value, name: question.name.value});
      questions.push({ id: question.subject.value+"i", name: question.name.value+"i"});
    }
    res.status(200).json(questions);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.get("/topics", async (req, res) => {
  const query =
    "SELECT ?subject ?name WHERE {?subject rdf:type foaf:Topic . ?subject foaf:name ?name}";
  localClient.setQueryFormat(format);
  localClient.setQueryGraph(graphName);
  try {
    const results = await localClient.query(query);
    let topics = [];
    for (const topic of results.results.bindings) {
      topics.push({ id: topic.subject.value, name: topic.name.value});
    }
    res.status(200).json(topics);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.get("/questionTypes", async (req, res) => {
  const query =
    "SELECT ?subClass ?classLabel WHERE { ?subClass rdfs:subClassOf foaf:QuestionVersion . ?subClass rdfs:label ?classLabel. }";
  localClient.setQueryFormat(format);
  localClient.setQueryGraph(graphName);
  try {
    const results = await localClient.query(query);
    console.log(results);
    console.log(results.results.bindings);
    let questionTypes = [];
    for (const questionType of results.results.bindings) {
      questionTypes.push({id: questionType.subClass.value, name: questionType.classLabel.value});
    }
    res.status(200).json(questionTypes);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.post("/banany", (req, res) => {
  res.send("Opice a banany!");
});
router.post("/local", (req, res) => {
  // const query = req.body.query;
  const query =
    "PREFIX foaf:  <http://www.semanticweb.org/semanticweb#>  SELECT * WHERE {foaf:Verzia_otazky ?predicate ?object}";
  const format = req.body.format;
  console.log(format);
  const localClient = new Client("http://localhost:8890/sparql");
  localClient.setQueryFormat(format);
  localClient.setQueryGraph(graphName);

  localClient
    .query(query)
    .then(results => {
      res.render("results", {
        results: results,
        format: format
      });
    })
    .catch(err => {
      console.log(err);
      res.send("Error!");
    });
});

module.exports = router;
