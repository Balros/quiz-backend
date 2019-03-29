const express = require("express");
const ID = require("virtuoso-uid");
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

ID.config({
  endpoint: "http://localhost:8890/sparql",
  graph: "http://www.semanticweb.org/semanticweb",
  prefix: "http://www.semanticweb.org/semanticweb#"
});

router.get("/", (req, res) => {
  res.render("index");
});

router.get("/banany", (req, res) => {
  res.status(200).json({ hello: "world" });
});

router.get("/questionGroups", async (req, res) => {
  const query =
    "SELECT ?subject ?label WHERE {?subject foaf:author foaf:Adam; rdfs:label ?label; rdf:type foaf:Question .  }";
  localClient.setQueryFormat(format);
  localClient.setQueryGraph(graphName);
  try {
    const results = await localClient.query(query);
    let questions = [];
    for (const question of results.results.bindings) {
      questions.push({
        id: question.subject.value,
        label: question.label.value
      });
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
      topics.push({ id: topic.subject.value, name: topic.name.value });
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
    let questionTypes = [];
    for (const questionType of results.results.bindings) {
      questionTypes.push({
        id: questionType.subClass.value,
        name: questionType.classLabel.value
      });
    }
    res.status(200).json(questionTypes);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.post("/createNewQuestion", async (req, res) => {
  const author = req.body.author;
  const questionText = req.body.question;
  const topic = req.body.topic;
  const questionType = req.body.questionType;
  const answers = req.body.answers;

  const foaf = "http://www.semanticweb.org/semanticweb#";
  const questionNode = await createQuestion(author, questionText, topic);
  const questionVersionNode = await createQuestionVersion(
    author,
    questionText,
    questionType,
    foaf,
    questionNode
  );
  await Promise.all(answers.map(async (answer, index) => {
    await createPredefinedAnswer(questionVersionNode, answer, index);
  }));
  localClient
    .store(true)
    .then(result => {
      console.log("ok");
      res.status(200).json(result);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json(err);
    });
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
const createQuestion = async (author, questionText, topic) => {
  ID.config({
    endpoint: "http://localhost:8890/sparql",
    graph: "http://www.semanticweb.org/semanticweb",
    prefix: "http://www.semanticweb.org/semanticweb/Question/"
  });
  const foaf = "http://www.semanticweb.org/semanticweb#";
  let questionNode = {};
  await ID.create()
    .then(questionId => {
      try {
        id = questionId;
        const node = new Node(questionId);
        questionNode = node;
        localClient.setOptions(
          "application/json",
          { foaf: "http://www.semanticweb.org/semanticweb#" },
          "http://www.semanticweb.org/semanticweb"
        );
        localClient
          .getLocalStore()
          .add(new Triple(node, "rdf:type", new Node(foaf + "Question")));
        //authentification->find user and retrun it as Node if possible
        localClient
          .getLocalStore()
          .add(new Triple(node, "foaf:author", new Node(foaf + author)));
        localClient
          .getLocalStore()
          .add(new Triple(node, "rdfs:label", new Node(questionText)));
        //find topic and return his Node and use(don't create new Node if possible)
        localClient
          .getLocalStore()
          .add(new Triple(node, "foaf:about", new Node(topic)));
      } catch (e) {
        console.log(e);
      }
    })
    .catch(console.log);
    return questionNode;
};
const createQuestionVersion = async (
  author,
  questionText,
  questionType,
  foaf,
  questionNode
) => {
  ID.config({
    endpoint: "http://localhost:8890/sparql",
    graph: "http://www.semanticweb.org/semanticweb",
    prefix: "http://www.semanticweb.org/semanticweb/QuestionVersion/"
  });
  let questionVersionNode = {};
  await ID.create()
    .then(questionVersionId => {
      try {
        const node = new Node(questionVersionId);
        questionVersionNode = node;
        localClient.setOptions(
          "application/json",
          { foaf: "http://www.semanticweb.org/semanticweb#" },
          "http://www.semanticweb.org/semanticweb"
        );
        //TODO if questionType exists
        localClient
          .getLocalStore()
          .add(new Triple(node, "rdf:type", new Node(questionType)));
        localClient
          .getLocalStore()
          .add(new Triple(node, "foaf:text", new Text(questionText, "sk")));
        //authentification->find user and retrun it as Node if possible
        localClient
          .getLocalStore()
          .add(new Triple(node, "foaf:author", new Node(foaf + author)));
        localClient
          .getLocalStore()
          .add(new Triple(node, "foaf:ofQuestion", questionNode));
      } catch (e) {
        console.log(e);
      }
    })
    .catch(console.log);
    return questionVersionNode;
};

const createPredefinedAnswer = async (
  questionVersionNode,
  answer,
  position
) => {
  ID.config({
    endpoint: "http://localhost:8890/sparql",
    graph: "http://www.semanticweb.org/semanticweb",
    prefix: "http://www.semanticweb.org/semanticweb/PredefinedAnswer/"
  });
  const foaf = "http://www.semanticweb.org/semanticweb#";
  let questionVersionAnswerNode = {};
  await ID.create()
    .then(nodeId => {
      try {
        const node = new Node(nodeId);
        questionVersionAnswerNode = node;
        localClient.setOptions(
          "application/json",
          { foaf: "http://www.semanticweb.org/semanticweb#" },
          "http://www.semanticweb.org/semanticweb"
        );
        //TODO if questionType exists
        localClient
          .getLocalStore()
          .add(new Triple(node, "rdf:type", new Node(foaf + "PredefinedAnswer")));
        localClient
          .getLocalStore()
          .add(new Triple(node, "foaf:text", new Text(answer.text, "sk")));
        //TODO boolean if possible
        localClient
          .getLocalStore()
          .add(new Triple(node, "foaf:correct", new Text(answer.correct, "sk")));
        //TODO integer if possible
        localClient
          .getLocalStore()
          .add(new Triple(node, "foaf:position", new Text(position, "sk")));
        localClient
          .getLocalStore()
          .add(new Triple(node, "foaf:answer", questionVersionNode));
      } catch (e) {
        console.log(e);
      }
    })
    .catch(console.log);
    return questionVersionAnswerNode;
};

module.exports = router;
