const express = require("express");
const ID = require("virtuoso-uid");
const router = express.Router();
const sparqlTransformer = require("sparql-transformer");

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
  const isTeacher = req.body.token === "teacher";
  //TODO isTeacher should be determined by token of user
  // provisional token
  
  const options = {
    context: "http://schema.org",
    endpoint: "http://localhost:8890/sparql",
    debug: true
  };
  const q = {
    proto: [
      {
        id: "?id",
        name: "$foaf:name",
        assignment: {
          id: "$foaf:hasAssignment",
          description: "$foaf:description",
          startTime: "$foaf:startDate",
          endTime: "$foaf:endDate",
        },
        questions: {
          id: "$foaf:questionsAboutMe",
          approved: "$foaf:approved",
          text: "$rdfs:label"
        }
      }
    ],
    $where: [
      "?id a foaf:Topic",
    ],
    $prefixes: {
      foaf: "http://www.semanticweb.org/semanticweb#"
    },
    $limit: 100
  };
  
  try {
    const out = await sparqlTransformer.default(q, options);
    console.log(out);
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
    proto: [
      {
        id: "?id",
        name: "?name"
      }
    ],
    $where: ["?id rdf:type foaf:Topic", "?id foaf:name ?name"],
    $prefixes: {
      foaf: "http://www.semanticweb.org/semanticweb#"
    },
    $limit: 100
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
    proto: [
      {
        id: "?id",
        name: "$foaf:name"
      }
    ],
    $where: ["?id rdf:type foaf:CourseStudent"],
    $prefixes: {
      foaf: "http://www.semanticweb.org/semanticweb#"
    },
    $limit: 100
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
    // console.log(results);
    res.status(200).json(results);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.post("/api/approveQuestionVersion", async (req, res) => {
  const isPrivate = req.body.isPrivate;
  const questionVersionUri = req.body.questionVersionUri;
  console.log(req.body);
  try {
    const results = true;
    // console.log(results);
    res.status(200).json(results);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.get("/api/getQuestionAssignment/:uri", async (req, res) => {
  const questionUri = decodeURIComponent(req.params.uri);
  console.log(questionUri);
  const options = {
    context: "http://schema.org",
    endpoint: "http://localhost:8890/sparql",
    debug: true
  };
  const q = {
    proto: [
      {
        id: "<"+questionUri+">",
        startDate: "$foaf:startDate",
        endDate: "$foaf:endDate",
        description: "$foaf:description",
        topic: "$foaf:elaborate",
        selectedAgents: {
          id: "$foaf:assignedTo"
        }
      }
    ],
    $where: [
      "<"+questionUri+">" + " rdf:type foaf:QuestionAssignment",
    ],
    $prefixes: {
      foaf: "http://www.semanticweb.org/semanticweb#"
    },
    $limit: 100
  };
  try {
    const out = await sparqlTransformer.default(q, options);
    console.log(out);
    res.status(200).json(out);
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
    proto: [
      {
        id: "?id",
        name: "?name"
      }
    ],
    $where: [
      "?id rdfs:subClassOf foaf:QuestionVersion",
      "?id rdfs:label ?name"
    ],
    $prefixes: {
      foaf: "http://www.semanticweb.org/semanticweb#"
    },
    $limit: 100
  };
  try {
    const out = await sparqlTransformer.default(q, options);
    res.status(200).json(out);
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

router.get("/api/getQuestionVersions/:uri", async (req, res) => {
    const results = [
      {
        id: "questionVersionUri1",
        title: "questionTitle1",
        text: "question text1",
        topic: "topicName",
        questionType:
          "http://www.semanticweb.org/semanticweb#QuestionWithPreddefinedAnswer",
        answers: [
          {
            id: "answerUri1",
            text: "text of correct answer",
            correct: true
          },
          {
            id: "answerUri2",
            text: "text of false answer",
            correct: false
          }
        ],
        comments: [
          {
            id: "commentUri1",
            author: "Teacher",
            date: "16.5.2019",
            text: "Comment from Teacher."
          },
          {
            id: "commentUri2",
            author: "Student",
            date: "17.5.2019",
            text: "Comment from Student."
          }
        ]
      },
    ];
    const options = {
      context: "http://schema.org",
      endpoint: "http://localhost:8890/sparql",
      debug: true
    };
    const q = {
      proto: [
        {
          id: "?id",
          // title: "dummy question title",
          text: "foaf:text",
        }
      ],
      $where: [
        "?id a foaf:QuestionVersion",
      ],
      $prefixes: {
        foaf: "http://www.semanticweb.org/semanticweb#"
      },
      $limit: 100
    };
    try {
      const out = await sparqlTransformer.default(q, options);
      console.log(out);
      res.status(200).json(out);
    } catch (e) {
      console.log(e);
      res.send("Error!");
    }
});

router.post("/api/createQuestionAssignment", async (req, res) => {
  const startDate = req.body.startDate;
  const endDate = req.body.endDate;
  const description = req.body.description;
  const topic = req.body.topic;
  const selectedAgents = req.body.selectedAgents;
  console.log(req.body);
  console.log("createQuestionAssignment");

  const questionAssignmentNode = await createQuestionAssignment(
    startDate,
    endDate,
    description,
    topic,
    selectedAgents
  );
  console.log(questionAssignmentNode);
  await Promise.all(
    selectedAgents.map(async (selectedAgent) => {
      await modifyAssignmentToPerson(questionAssignmentNode, selectedAgent, true);
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

router.post("/api/editQuestionAssignment", async (req, res) => {
  const id = decodeURIComponent(req.body.id);
  const startDate = req.body.startDate;
  const endDate = req.body.endDate;
  const description = req.body.description;
  const topic = req.body.topic;
  const selectedAgents = req.body.selectedAgents;
  const dataOld = req.body.dataOld;

  console.log(req.body);
  console.log("/api/editQuestionAssignment");

  const questionAssignmentNode = await editQuestionAssignment(
    id,
    startDate,
    endDate,
    description,
    topic,
    dataOld
  );
  console.log(questionAssignmentNode);
  //TODO delete all previous agents
  //add new agents
  let oldToRemove = dataOld.selectedAgents.filter(id => !selectedAgents.includes(id));
  let newToAdd = selectedAgents.filter(id => !dataOld.selectedAgents.includes(id));
  console.log("oldToRemove: "+dataOld.selectedAgents);
  console.log(selectedAgents);
  await Promise.all(
    oldToRemove.map(async (selectedAgent) => {
      await modifyAssignmentToPerson(questionAssignmentNode, selectedAgent, false);
    })
  );
  await Promise.all(
    newToAdd.map(async (selectedAgent) => {
      await modifyAssignmentToPerson(questionAssignmentNode, selectedAgent, true);
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

router.post("/api/createNewQuestion", async (req, res) => {
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

const createTopic = async topicName => {
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
const createQuestionAssignment = async (
  startDate,
  endDate,
  description,
  topic,
) => {
  ID.config({
    endpoint: "http://localhost:8890/sparql",
    graph: "http://www.semanticweb.org/semanticweb",
    prefix: "http://www.semanticweb.org/semanticweb/QuestionAssignment/"
  });
  const foaf = "http://www.semanticweb.org/semanticweb#";
  let questionAssignmentNode = {};
  await ID.create()
    .then(questionAssignmentId => {
      console.log("createQuestionAssignment");
      console.log(questionAssignmentId);
      try {
        id = questionAssignmentId;
        const node = new Node(questionAssignmentId);
        questionAssignmentNode = node;
        localClient.setOptions(
          "application/json",
          { foaf: "http://www.semanticweb.org/semanticweb#" },
          "http://www.semanticweb.org/semanticweb"
        );
        localClient
          .getLocalStore()
          .add(new Triple(node, "rdf:type", new Node(foaf + "QuestionAssignment")));
        //authentification->find user and retrun it as Node if possible
        localClient
          .getLocalStore()
          .add(new Triple(node, "foaf:startDate", new Data(new Date(startDate).toISOString(), 'xsd:dateTime')));
        localClient
          .getLocalStore()
          .add(new Triple(node, "foaf:endDate", new Data(new Date(endDate).toISOString(), 'xsd:dateTime')));
        localClient
          .getLocalStore()
          .add(new Triple(node, "foaf:description", new Text(description)));
        localClient
          .getLocalStore()
          .add(new Triple(new Node(topic), "foaf:hasAssignment", node));
        localClient
          .getLocalStore()
          .add(new Triple(node, "foaf:elaborate", new Node(topic)));
        //find topic and return his Node and use(don't create new Node if possible)
      } catch (e) {
        console.log(e);
      }
    })
    .catch(console.log);
  return questionAssignmentNode;
};
const editQuestionAssignment = async (
  id,
  startDate,
  endDate,
  description,
  topic,
  dataOld
) => {
  const questionAssignmentNode = new Node(id);
    try {
      localClient.setOptions(
        "application/json",
        { foaf: "http://www.semanticweb.org/semanticweb#" },
        "http://www.semanticweb.org/semanticweb"
      );
      
      let startDateTriple = new Triple(
        questionAssignmentNode,
        "foaf:startDate",
        new Data(new Date(dataOld.startDate).toISOString(), 'xsd:dateTime'),
      );
      startDateTriple.updateObject(new Data(new Date(startDate).toISOString(), 'xsd:dateTime'));
      const endDateTriple = new Triple(
        questionAssignmentNode,
        "foaf:endDate",
        new Data(new Date(dataOld.endDate).toISOString(), 'xsd:dateTime'),
      );
      endDateTriple.updateObject(
          new Data(new Date(endDate).toISOString(), 'xsd:dateTime'),
    );
      const descriptionTriple = new Triple(
        questionAssignmentNode,
        "foaf:description",
        new Text(dataOld.description)
      );
      descriptionTriple.updateObject(
        new Text(description),
      );
      localClient
        .getLocalStore()
        .add(new Triple(
          new Node(dataOld.topic),
          "foaf:hasAssignment",
          questionAssignmentNode,
          Triple.REMOVE
        ));
      localClient
        .getLocalStore()
        .add(new Triple(
          new Node(topic),
          "foaf:hasAssignment",
          questionAssignmentNode,
        ));
      const elaborateTriple = new Triple(
        questionAssignmentNode,
        "foaf:elaborate",
        new Text(dataOld.topic)
      );
      elaborateTriple.updateObject(
        new Text(topic),
      );
      localClient
        .getLocalStore()
        .bulk([startDateTriple, endDateTriple, descriptionTriple, elaborateTriple]);
    } catch (e) {
      console.log(e);
    }
  return questionAssignmentNode;
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
        localClient
          .getLocalStore()
          .add(new Triple(new Node(topic), "foaf:questionsAboutMe", node));
        localClient
          .getLocalStore()
          .add(new Triple(node, "foaf:approved", new Data(false, 'xsd:boolean')));
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

const modifyAssignmentToPerson = async (
  questionAssignmentNode, selectedAgent, toAdd
) => {
  const foaf = "http://www.semanticweb.org/semanticweb#";
  
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
        questionAssignmentNode,
        "foaf:assignedTo",
        new Node(selectedAgent),
        toAdd ? Triple.ADD : Triple.REMOVE
      )
    );
      
  return;
};

module.exports = router;
