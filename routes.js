const express = require("express");
const ID = require("virtuoso-uid");
const router = express.Router();
const sparqlTransformer = require('sparql-transformer');

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

router.post("/api/questionGroups", async (req, res) => {
  // const query = null;
  // const options = null;
  // sparqlTransformer(query, options)
  // .then(res => console.log(res))
  // .catch(err => console.error(err));

  // const query =
  //   "SELECT ?subject ?label WHERE {?subject foaf:author foaf:Adam; rdfs:label ?label; a foaf:Question .  }";
  // localClient.setQueryFormat(format);
  // localClient.setQueryGraph(graphName);
  // try {
  //   const results = await localClient.query(query);
  //   let questions = [];
  //   for (const question of results.results.bindings) {
  //     questions.push({
  //       id: question.subject.value,
  //       label: question.label.value
  //     });
  //   }
  //   res.status(200).json(questions);
  // } catch (e) {
  //   console.log(e);
  //   res.send("Error!");
  // }
  console.log(req.body);
  const isTeacher = req.body.token === "teacher";
  //TODO isTeacher should be determined by token of user
  // provisional token
  // try {

  //   const resultsTeacher = [
  //     {
  //       id: "topicUri1",
  //       topicLabel: "Topic name - with assignment",
  //       assignment: {
  //         id: 'questionAssignmentUri',
  //         description: "desription text",
  //         startTime: '2019-03-14',
  //         endTime: '2020-12-15',
  //         questions: {
  //           approved: [
  //             { id: "questionUri1", label: "this question label 1", approval: true, lastSeenTeacher: '2019-03-14', lastSeenStudent: '2019-03-15', lastChange: '2019-03-15' },
  //             { id: "questionUri2", label: "this question label 2", approval: true, lastSeenTeacher: '2019-03-14', lastSeenStudent: '2019-03-15', lastChange: '2019-03-15' }
  //           ],
  //           notApproved: [
  //             { id: "questionUri3", label: "this question label 3", approval: false, lastSeenTeacher: '2019-03-15', lastSeenStudent: '2019-03-14', lastChange: '2019-03-15' }
  //           ]
  //         }
  //       },
  //     },
  //     {
  //       id: "topicUri2",
  //       topicLabel: "Topic name - without assignment"
  //     }
  //   ];
  //   //get only assignments assigned to student
  //   const resultsStudent = [
  //     {
  //       id: "topicUri1",
  //       topicLabel: "Topic name - with assignment",
  //       assignment: {
  //         id: 'questionAssignmentUri',
  //         description: "desription text",
  //         startTime: '2019-03-14',
  //         endTime: '2020-12-15',
  //         questions: {
  //           approved: [
  //             { id: "questionUri1", label: "this question label 1", approval: true, lastSeenTeacher: '2019-03-14', lastSeenStudent: '2019-03-15', lastChange: '2019-03-15' },
  //             { id: "questionUri2", label: "this question label 2", approval: true, lastSeenTeacher: '2019-03-14', lastSeenStudent: '2019-03-15', lastChange: '2019-03-15' }
  //           ],
  //           notApproved: [
  //             { id: "questionUri3", label: "this question label 3", approval: false, lastSeenTeacher: '2019-03-15', lastSeenStudent: '2019-03-14', lastChange: '2019-03-15' }
  //           ]
  //         }
  //       },
  //     },
  //   ];
    
  //   console.log(isTeacher ? resultsTeacher : resultsStudent);
  //   res.status(200).json(isTeacher ? resultsTeacher : resultsStudent);
  // } catch (e) {
  //   console.log(e);
  //   res.send("Error!");
  // }
  const options = {
    context: "http://schema.org",
    endpoint: "http://localhost:8890/sparql",
    debug: true
  };
  const q = {
    "proto": [{
      "id" : "?id",
      "name": "?name",
    }],
    "$where": [
      "?id rdf:type foaf:Topic",
      "?id foaf:name ?name"
    ],
    "$prefixes": {
      "foaf": "http://www.semanticweb.org/semanticweb#"
    },
    "$limit": 100
  };
  try {
    const out = await sparqlTransformer.default(q, options);
    res.status(200).json(out);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.get("/api/topics", async (req, res) => {
  const options = {
    context: "http://schema.org",
    endpoint: "http://localhost:8890/sparql",
    debug: true
  };
  const q = {
    "proto": [{
      "id" : "?id",
      "name": "?name",
    }],
    "$where": [
      "?id rdf:type foaf:Topic",
      "?id foaf:name ?name"
    ],
    "$prefixes": {
      "foaf": "http://www.semanticweb.org/semanticweb#"
    },
    "$limit": 100
  };
  try {
    const out = await sparqlTransformer.default(q, options);
    res.status(200).json(out);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.post("/api/addComment/:uri", async (req, res) => {
  res.status(200).json("ok");
});

router.get("/api/getAgents", async (req, res) => {
  const options = {
    // context: "http://schema.org",
    endpoint: "http://localhost:8890/sparql",
    debug: true
  };
  const q = {
    "proto": [{
      "id" : "?id",
      "name": "?name",
    }],
    "$where": [
      "?id rdf:type foaf:CourseStudent",
      "?id foaf:name ?name"
    ],
    "$prefixes": {
      "foaf": "http://www.semanticweb.org/semanticweb#"
    },
    "$limit": 100
  };
  try {
    const out = await sparqlTransformer.default(q, options);
    res.status(200).json(out);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.get("/api/getQuestionInfo/:uri", async (req, res) => {
  try {
    const results = false;
    console.log(results);
    res.status(200).json(results);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.post("/api/approveQuestionVersion", async (req, res) => {
  try {
    const results = true;
    console.log(results);
    res.status(200).json(results);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.get("/api/getQuestionAssignment/:uri", async (req, res) => {
  try {
    const results = [
      {
        startDate: new Date(),
        endDate: new Date(),
        description: "this is description",
        topic: "http://www.semanticweb.org/semanticweb#topic_1",
        selectedAgents: ["thisIsUriOfJohnDoe"]
      },
    ];
    res.status(200).json(results);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.get("/api/questionTypes", async (req, res) => {
  const options = {
    context: "http://schema.org",
    endpoint: "http://localhost:8890/sparql",
    debug: true
  };
  const q = {
    "proto": [{
      "id" : "?id",
      "name": "?name",
    }],
    "$where": [
      "?id rdfs:subClassOf foaf:QuestionVersion",
      "?id rdfs:label ?name"
    ],
    "$prefixes": {
      "foaf": "http://www.semanticweb.org/semanticweb#"
    },
    "$limit": 100
  };
  try {
    const out = await sparqlTransformer.default(q, options);
    res.status(200).json(out);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.get("/api/getQuestionVersions/:uri", async (req, res) => {
  // const almostFoaf = "<http://www.semanticweb.org/semanticweb/Question/";
  // const questionUri = req.params.uri;
  // console.log(almostFoaf+questionUri);
  // const query =
  //   "DESCRIBE * WHERE {?s foaf:ofQuestion  "+ almostFoaf+questionUri+"> }";
  // localClient.setQueryFormat(format);
  // localClient.setQueryGraph(graphName);
  // try {
  //   const results = await localClient.query(query);
  //   console.log(results);
  //   res.status(200).json(questionTypes);
  // } catch (e) {
  //   console.log(e);
  //   res.send("Error!");
  // }
  try {
    const results = [
      {
        id: "questionVersionUri1",
        title: "questionTitle1",
        text: "question text1",
        topic: "topicName",
        questionType: "http://www.semanticweb.org/semanticweb#QuestionWithPreddefinedAnswer",
        answers: [{
          id: 'answerUri1',
          text: "text of correct answer",
          correct: true
        },
        {
          id: 'answerUri2',
          text: "text of false answer",
          correct: false
        }],
        comments: [
          {id: "commentUri1", author: "Teacher", date: "16.5.2019", text: "Comment from Teacher."},
          {id: "commentUri2", author: "Student", date: "17.5.2019", text: "Comment from Student."}
        ]
      },
      {
        id: "questionVersionUri2",
        title: "questionTitle2",
        text: "question text2",
        topic: "topicName",
        questionType: "http://www.semanticweb.org/semanticweb#QuestionWithPreddefinedAnswer",
        answers: [{
          id: 'answerUri3',
          text: "text of false answer2",
          correct: false
        },
        {
          id: 'answerUri4',
          text: "text of correct answer2",
          correct: true
        }],
        comments: [
          {id: "commentUri1", author: "Teacher", date: "16.5.2019", text: "Comment from Teacher."},
          {id: "commentUri2", author: "Student", date: "17.5.2019", text: "Comment from Student."}
        ]
      }
    ];
    res.status(200).json(results);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.post("/api/createTopic", async (req, res) => {
  const topicName = req.body.topicName;

  await createTopic(topicName);

  localClient
    .store(true)
    .then(result => {
      console.log(result);
      res.status(200).json("ok");
    })
    .catch(err => {
      console.log(err);
      res.status(500).json(err);
    });
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
  await Promise.all(
    answers.map(async (answer, index) => {
      await createPredefinedAnswer(questionVersionNode, answer, index);
    })
  );
  localClient
    .store(true)
    .then(result => {
      console.log(result);
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
const createTopic = async (topicName) => {
  ID.config({
    endpoint: "http://localhost:8890/sparql",
    graph: "http://www.semanticweb.org/semanticweb",
    prefix: "http://www.semanticweb.org/semanticweb/Topic/"
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
          .add(new Triple(node, "rdf:type", new Node(foaf + "Topic")));
        localClient
          .getLocalStore()
          .add(new Triple(node, "foaf:name", new Text(topicName)));
      } catch (e) {
        console.log(e);
      }
    })
    .catch(console.log);
  return questionNode;
};
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
          .add(new Triple(node, "rdfs:label", new Text(questionText)));
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
          .add(
            new Triple(
              node,
              "rdf:type",
              new Node(foaf + "PredefinedAnswer"),
              Triple.ADD
            )
          );
        localClient
          .getLocalStore()
          .add(
            new Triple(
              node,
              "foaf:text",
              new Text(answer.text, "sk"),
              Triple.ADD
            )
          );
        //TODO boolean if possible
        localClient
          .getLocalStore()
          .add(
            new Triple(
              node,
              "foaf:correct",
              new Text(answer.correct, "sk"),
              Triple.ADD
            )
          );
        //TODO integer if possible
        localClient
          .getLocalStore()
          .add(
            new Triple(
              node,
              "foaf:position",
              new Text(position, "sk"),
              Triple.ADD
            )
          );
        localClient
          .getLocalStore()
          .add(
            new Triple(node, "foaf:answer", questionVersionNode, Triple.ADD)
          );
      } catch (e) {
        console.log(e);
      }
    })
    .catch(console.log);
  return questionVersionAnswerNode;
};

module.exports = router;
