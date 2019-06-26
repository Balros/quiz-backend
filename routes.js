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
localClient.setOptions(
  "application/json",
  { foaf: "http://www.semanticweb.org/semanticweb#" },
  "http://www.semanticweb.org/semanticweb"
);
const options = {
  context: "http://schema.org",
  endpoint: "http://localhost:8890/sparql",
  debug: true
};

router.post("/api/questionGroups", async (req, res) => {
  const requester = req.body.token; //TODO
  
  //TODO return only questions where i am author and show all to teacher
  const q = {
    proto: [
      {
        id: "?id",
        name: "$foaf:name",
        assignment: {
          id: "$foaf:hasAssignment",
          description: "$foaf:description",
          startTime: "$foaf:startDate",
          endTime: "$foaf:endDate"
        },
        questions: {
          id: "$foaf:questionsAboutMe",
          author: "$foaf:author",
          approvedAsPublicId: "$foaf:approvedAsPublic",
          approvedAsPrivateId: "$foaf:approvedAsPrivate",
          text: "$rdfs:label", //TODO
          title: "$rdfs:label", //TODO
          lastSeenByStudent: "$foaf:lastSeenByStudent",
          lastSeenByTeacher: "$foaf:lastSeenByTeacher",
          lastChange: "$foaf:lastChange"
        }
      }
    ],
    $where: [
      "?id a foaf:Topic",
      !isTeacher(requester) ? "?id foaf:hasAssignment ?assignmentId" : "",
      !isTeacher(requester)
        ? "?assignmentId foaf:assignedTo <" + requester + ">"
        : ""
      // !isTeacher(requester) ? "?id foaf:questionsAboutMe ?questionId" : "",
      // !isTeacher(requester)
      //   ? "OPTIONAL{?questionId foaf:author <" + requester + ">}"
      //   : "",
    ],
    // $filter: !isTeacher(requester) ?
    // "(EXISTS{?id foaf:questionsAboutMe ?v3r} && ?v31 = <" + requester + ">) || NOT EXISTS{?id foaf:questionsAboutMe ?v3r}"
    // : "",
    //?v31 is author
    $prefixes: {
      foaf: "http://www.semanticweb.org/semanticweb#"
    },
    $limit: 100
  };

  try {
    let data = await sparqlTransformer.default(q, options);
    let topics = data;
    topics.forEach(topic => {
      topic.questions = toArray(topic.questions);
    });
    res.status(200).json(topics);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.post("/api/topicsToCreateModifyQuestionAssignment", async (req, res) => {
  const editedQuestionAssignment = decodeURIComponent(
    req.body.editedQuestionAssignment
  );
  const q = {
    proto: [
      {
        id: "?id",
        name: "$foaf:name",
        assignment: "$foaf:hasAssignment"
      }
    ],
    $where: ["?id rdf:type foaf:Topic"],
    $prefixes: {
      foaf: "http://www.semanticweb.org/semanticweb#"
    },
    $limit: 100
  };

  q["$filter"] =
    editedQuestionAssignment !== "undefined"
      ? "NOT EXISTS{?id foaf:hasAssignment ?questionAssignmentId} || EXISTS{?id foaf:hasAssignment <" +
        editedQuestionAssignment +
        ">}"
      : "NOT EXISTS{?id foaf:hasAssignment ?questionAssignmentId}";

  try {
    const out = await sparqlTransformer.default(q, options);

    res.status(200).json(out);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.post("/api/topics", async (req, res) => {
  const author = req.body.token; //TODO previest token na authora
  const q = {
    proto: [
      {
        id: "?id",
        name: "$foaf:name"
      }
    ],
    $where: [
      "?id rdf:type foaf:Topic",
      !isTeacher(author) ? "?id foaf:hasAssignment ?questionAssignmentId" : "",
      !isTeacher(author)
        ? "?questionAssignmentId foaf:assignedTo " + "<" + author + ">"
        : "",
      !isTeacher(author)
        ? "?questionAssignmentId foaf:startDate ?startDate"
        : "",
      !isTeacher(author) ? "?questionAssignmentId foaf:endDate ?endDate" : ""
    ],
    $filter: !isTeacher(author)
      ? [
          '?startDate < "' +
            localClient.getLocalStore().now +
            '"^^xsd:dateTime',
          '?endDate > "' + localClient.getLocalStore().now + '"^^xsd:dateTime'
        ]
      : [],
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

router.post("/api/addComment", async (req, res) => {
  const questionVersionId = req.body.questionVersionId;
  const author = req.body.token;
  //TODO previest token na authora
  const newComment = req.body.newComment;
  //TODO add only when is in time range (startDate - endDate)
  const oldData = req.body.oldData;
  await addComment(questionVersionId, author, newComment, oldData);

  localClient
    .store(true)
    .then(result => {
      res.status(200).json(result);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json(err);
    });
});

router.get("/api/getAgents", async (req, res) => {
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

router.post("/api/approveQuestionVersion", async (req, res) => {
  const author = req.body.token; //TODO previest
  const isPrivate = req.body.isPrivate;
  const questionVersionUri = req.body.questionVersionUri;
  if (isTeacher(author)) {
    const relation = isPrivate
      ? "foaf:approvedAsPrivate"
      : "foaf:approvedAsPublic";
    const q = {
      proto: [
        {
          id: "<" + questionVersionUri + ">",
          question: {
            id: "$foaf:ofQuestion",
            approvedId: "$" + relation,
            lastSeenByTeacher: "$foaf:lastSeenByTeacher",
            lastChange: "$foaf:lastChange"
          }
        }
      ],
      $prefixes: {
        foaf: "http://www.semanticweb.org/semanticweb#"
      }
    };

    try {
      const out = await sparqlTransformer.default(q, options);
      const questionId = out[0].question.id;
      const approvedId = out[0].question.approvedId;
      const lastSeenByTeacher = out[0].question.lastSeenByTeacher;
      const lastChange = out[0].question.lastChange;

      

      let approvedTripleToChange = new Triple(
        new Node(questionId),
        isPrivate ? "foaf:approvedAsPrivate" : "foaf:approvedAsPublic",
        new Node(approvedId)
      );
      approvedTripleToChange.updateObject(new Node(questionVersionUri));

      let lastChangeTriple = new Triple(
        new Node(questionId),
        "foaf:lastChange",
        new Data(lastChange, "xsd:dateTimeStamp")
      );
      lastChangeTriple.updateObject(
        new Data(new Date().toISOString(), "xsd:dateTimeStamp")
      );

      let lastSeenByTeacherTriple = new Triple(
        new Node(questionId),
        "foaf:lastSeenByTeacher",
        new Data(lastSeenByTeacher, "xsd:dateTimeStamp")
      );
      lastSeenByTeacherTriple.updateObject(
        new Data(new Date().toISOString(), "xsd:dateTimeStamp")
      );

      localClient
        .getLocalStore()
        .bulk([
          approvedTripleToChange,
          lastChangeTriple,
          lastSeenByTeacherTriple
        ]);
    } catch (e) {
      console.log(e);
      res.send("Error!");
    }
    localClient
      .store(true)
      .then(result => {
        res.status(200).json(result);
      })
      .catch(err => {
        console.log(err);
        res.status(500).json(err);
      });
  } else {
    res.status(401).json("Unauthorized");
  }
});

router.get("/api/getQuestionAssignment/:uri", async (req, res) => {
  const questionUri = decodeURIComponent(req.params.uri);
  const q = {
    proto: [
      {
        id: "<" + questionUri + ">",
        startDate: "$foaf:startDate",
        endDate: "$foaf:endDate",
        description: "$foaf:description",
        topic: "$foaf:elaborate",
        selectedAgents: {
          id: "$foaf:assignedTo"
        }
      }
    ],
    $where: ["<" + questionUri + ">" + " rdf:type foaf:QuestionAssignment"],
    $prefixes: {
      foaf: "http://www.semanticweb.org/semanticweb#"
    },
    $limit: 100
  };
  try {
    let data = await sparqlTransformer.default(q, options);
    if (data && data.length && data.length > 0) {
      const item = data[0];
      item.selectedAgents = toArray(item.selectedAgents);
      data[0] = item;
    }
    res.status(200).json(data);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.get("/api/questionTypes", async (req, res) => {
  const q = {
    proto: [
      {
        id: "?id",
        name: "$rdfs:label"
      }
    ],
    $where: ["?id rdfs:subClassOf foaf:QuestionVersion"],
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
      res.status(200).json("ok");
    })
    .catch(err => {
      console.log(err);
      res.status(500).json(err);
    });
});

router.get("/api/getQuestionVersions/:uri", async (req, res) => {
  const questionUri = decodeURIComponent(req.params.uri);
  const q = {
    proto: [
      {
        id: "<" + questionUri + ">",
        // id: "$var:?questionUri", //TODO change for variable
        title: "$rdfs:label", //TODO
        approvedAsPublicId: "$foaf:approvedAsPublic",
        approvedAsPrivateId: "$foaf:approvedAsPrivate",
        topic: {
          id: "$foaf:about",
          name: "$foaf:name"
        },
        lastSeenByStudent: "$foaf:lastSeenByStudent",
        lastSeenByTeacher: "$foaf:lastSeenByTeacher",
        lastChange: "$foaf:lastChange",
        questionVersions: {
          id: "$foaf:version",
          text: "$foaf:text",
          created: "$dcterms:created",
          questionType: "$rdf:type",
          answers: {
            id: "$foaf:answer",
            text: "$foaf:text",
            correct: "$foaf:correct",
            position: "$foaf:position"
          },
          comments: {
            id: "$foaf:comment",
            author: {
              id: "$foaf:author",
              name: "$foaf:name"
            },
            date: "$dcterms:created",
            text: "$foaf:text"
          }
        }
      }
    ],
    $where: ["<" + questionUri + ">" + " a foaf:Question"],
    $orderby: ["DESC(?v82)", "?v852", "?v843"], //this is shit but it works
    //sort question versions by created ?v82
    //sort comments by created ?v852
    //sort answers by position ?v843
    // $groupby:"$foaf:answer",
    $prefixes: {
      foaf: "http://www.semanticweb.org/semanticweb#",
      dcterms: "http://purl.org/dc/terms/"
    },
    // $values: {
    //   "questionUri": questionUri
    // },
    $limit: 100
  };
  try {
    let data = await sparqlTransformer.default(q, options);
    if (data && data.length && data.length > 0) {
      const item = data[0];
      let questionVersions = toArray(item.questionVersions);
      questionVersions.forEach(questionVersion => {
        questionVersion.answers = toArray(questionVersion.answers);
        questionVersion.comments = toArray(questionVersion.comments);
      });

      item.questionVersions = questionVersions;
      data[0] = item;
    }
    res.status(200).json(data);
  } catch (e) {
    console.log(e);
    res.send("Error!");
  }
});

router.post("/api/createQuestionAssignment", async (req, res) => {
  let id;
  let dataOld;
  if (req.body.id) {
    id = decodeURIComponent(req.body.id);
    dataOld = req.body.dataOld;
  }
  const startDate = req.body.startDate;
  const endDate = req.body.endDate;
  const description = req.body.description;
  const topic = req.body.topic;
  const selectedAgents = req.body.selectedAgents;
  const token = req.body.token;
  if (isTeacher(token)) {
    const questionAssignmentNode = await createQuestionAssignment(
      startDate,
      endDate,
      description,
      topic,
      id,
      dataOld
    );
    if (id && dataOld) {
      let oldToRemove = dataOld.selectedAgents.filter(
        id => !selectedAgents.includes(id)
      );
      let newToAdd = selectedAgents.filter(
        id => !dataOld.selectedAgents.includes(id)
      );
      await Promise.all(
        oldToRemove.map(async selectedAgent => {
          await modifyAssignmentToPerson(
            questionAssignmentNode,
            selectedAgent,
            false
          );
        })
      );
      await Promise.all(
        newToAdd.map(async selectedAgent => {
          await modifyAssignmentToPerson(
            questionAssignmentNode,
            selectedAgent,
            true
          );
        })
      );
    } else {
      await Promise.all(
        selectedAgents.map(async selectedAgent => {
          await modifyAssignmentToPerson(
            questionAssignmentNode,
            selectedAgent,
            true
          );
        })
      );
    }
    localClient
      .store(true)
      .then(result => {
        res.status(200).json(result);
      })
      .catch(err => {
        console.log(err);
        res.status(500).json(err);
      });
  } else {
    res.status(500).json("not authorized");
  }
});

router.post("/api/createNewQuestion", async (req, res) => {
  const author = req.body.token;
  //TODO previest token na authora
  const questionText = req.body.questionText;
  const topic = req.body.topic;
  const questionType = req.body.questionType;
  const answers = req.body.answers;
  const questionId = decodeURIComponent(req.body.questionId);
  const oldData = req.body.oldData;

  let questionNode;
  if (questionId === "undefined") {
    questionNode = await createQuestion(author, questionText, topic);
  } else {
    questionNode = new Node(questionId);
  }
  const questionVersionNode = await createQuestionVersion(
    author,
    questionText,
    questionType,
    questionNode,
    questionId ? oldData : null
  );
  await Promise.all(
    answers.map(async (answer, index) => {
      await createPredefinedAnswer(questionVersionNode, answer, index);
    })
  );
  localClient
    .store(true)
    .then(result => {
      res.status(200).json(result);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json(err);
    });
});

const createTopic = async topicName => {
  const questionNode = await getNewNode("Topic");
  try {
    const foaf = "http://www.semanticweb.org/semanticweb#";
    localClient
      .getLocalStore()
      .add(new Triple(questionNode, "rdf:type", new Node(foaf + "Topic")));
    localClient
      .getLocalStore()
      .add(new Triple(questionNode, "foaf:name", new Text(topicName)));
  } catch (e) {
    console.log(e);
  }
  return questionNode;
};
const addComment = async (questionVersionId, author, newComment, oldData) => {
  const commentNode = await getNewNode("Comment");
  const foaf = "http://www.semanticweb.org/semanticweb#";
  if (commentNode) {
    try {
      localClient
        .getLocalStore()
        .add(new Triple(commentNode, "rdf:type", new Node(foaf + "Comment")));
      localClient
        .getLocalStore()
        .add(new Triple(commentNode, "foaf:text", new Text(newComment)));
      localClient
        .getLocalStore()
        .add(
          new Triple(new Node(questionVersionId), "foaf:comment", commentNode)
        );
      localClient
        .getLocalStore()
        .add(new Triple(commentNode, "foaf:author", new Node(author)));
      let lastChange = new Triple(
        new Node(decodeURIComponent(oldData.questionId)),
        "foaf:lastChange",
        new Data(oldData.lastChange, "xsd:dateTimeStamp")
      );
      lastChange.updateObject(
        new Data(localClient.getLocalStore().now, "xsd:dateTimeStamp")
      );
      let lastSeenTriple = new Triple(
        new Node(decodeURIComponent(oldData.questionId)),
        isTeacher(author) ? "foaf:lastSeenByTeacher" : "foaf:lastSeenByStudent",
        new Data(
          isTeacher(author)
            ? oldData.lastSeenByTeacher
            : oldData.lastSeenByStudent,
          "xsd:dateTimeStamp"
        )
      );
      lastSeenTriple.updateObject(
        new Data(new Date().toISOString(), "xsd:dateTimeStamp")
      );
      localClient.getLocalStore().bulk([lastChange, lastSeenTriple]);
    } catch (e) {
      console.log(e);
    }
  }
  return;
};
const createQuestionAssignment = async (
  startDate,
  endDate,
  description,
  topic,
  id,
  dataOld
) => {
  let questionAssignmentNode = {};
  try {
    if (id && dataOld) {
      questionAssignmentNode = new Node(id);
      let startDateTriple = new Triple(
        questionAssignmentNode,
        "foaf:startDate",
        new Data(new Date(dataOld.startDate).toISOString(), "xsd:dateTime")
      );
      startDateTriple.updateObject(
        new Data(new Date(startDate).toISOString(), "xsd:dateTime")
      );
      const endDateTriple = new Triple(
        questionAssignmentNode,
        "foaf:endDate",
        new Data(new Date(dataOld.endDate).toISOString(), "xsd:dateTime")
      );
      endDateTriple.updateObject(
        new Data(new Date(endDate).toISOString(), "xsd:dateTime")
      );
      const descriptionTriple = new Triple(
        questionAssignmentNode,
        "foaf:description",
        new Text(dataOld.description)
      );
      descriptionTriple.updateObject(new Text(description));
      localClient
        .getLocalStore()
        .add(
          new Triple(
            new Node(dataOld.topic),
            "foaf:hasAssignment",
            questionAssignmentNode,
            Triple.REMOVE
          )
        );
      localClient
        .getLocalStore()
        .add(
          new Triple(
            new Node(topic),
            "foaf:hasAssignment",
            questionAssignmentNode
          )
        );
      const elaborateTriple = new Triple(
        questionAssignmentNode,
        "foaf:elaborate",
        new Node(dataOld.topic)
      );
      elaborateTriple.updateObject(new Node(topic));
      localClient
        .getLocalStore()
        .bulk([
          startDateTriple,
          endDateTriple,
          descriptionTriple,
          elaborateTriple
        ]);
    } else {
      const foaf = "http://www.semanticweb.org/semanticweb#";
      questionAssignmentNode = await getNewNode("QuestionAssignment");
      localClient
        .getLocalStore()
        .add(
          new Triple(
            questionAssignmentNode,
            "rdf:type",
            new Node(foaf + "QuestionAssignment")
          )
        );
      //authentification->find user and retrun it as Node if possible
      localClient
        .getLocalStore()
        .add(
          new Triple(
            questionAssignmentNode,
            "foaf:startDate",
            new Data(new Date(startDate).toISOString(), "xsd:dateTime")
          )
        );
      localClient
        .getLocalStore()
        .add(
          new Triple(
            questionAssignmentNode,
            "foaf:endDate",
            new Data(new Date(endDate).toISOString(), "xsd:dateTime")
          )
        );
      localClient
        .getLocalStore()
        .add(
          new Triple(
            questionAssignmentNode,
            "foaf:description",
            new Text(description)
          )
        );
      localClient
        .getLocalStore()
        .add(
          new Triple(
            new Node(topic),
            "foaf:hasAssignment",
            questionAssignmentNode
          )
        );
      localClient
        .getLocalStore()
        .add(
          new Triple(questionAssignmentNode, "foaf:elaborate", new Node(topic))
        );
      //find topic and return his Node and use(don't create new Node if possible)
    }
  } catch (e) {
    console.log(e);
  }
  return questionAssignmentNode;
};

const createQuestion = async (author, questionText, topic) => {
  const foaf = "http://www.semanticweb.org/semanticweb#";
  let questionNode = await getNewNode("Question");
  try {
    localClient
      .getLocalStore()
      .add(
        new Triple(questionNode, "rdf:type", new Node(foaf + "Question"))
      );
    //authentification->find user and retrun it as Node if possible
    localClient
      .getLocalStore()
      .add(new Triple(questionNode, "foaf:author", new Node(author)));
    localClient
      .getLocalStore()
      .add(new Triple(questionNode, "rdfs:label", new Text(questionText)));
    localClient
      .getLocalStore()
      .add(new Triple(questionNode, "foaf:about", new Node(topic)));
    localClient
      .getLocalStore()
      .add(
        new Triple(new Node(topic), "foaf:questionsAboutMe", questionNode)
      );
    localClient
      .getLocalStore()
      .add(new Triple(questionNode, "foaf:approvedAsPublic", new Node()));
    localClient
      .getLocalStore()
      .add(new Triple(questionNode, "foaf:approvedAsPrivate", new Node()));
  } catch (e) {
    console.log(e);
  }
    return questionNode;
};

const createQuestionVersion = async (
  author,
  questionText,
  questionType,
  questionNode,
  oldData
) => {
  let questionVersionNode = await getNewNode("QuestionVersion");
  try {
    //TODO if questionType exists
    localClient
      .getLocalStore()
      .add(new Triple(questionVersionNode, "rdf:type", new Node(questionType)));
    localClient
      .getLocalStore()
      .add(new Triple(questionVersionNode, "foaf:text", new Text(questionText, "sk")));
    localClient
      .getLocalStore()
      .add(new Triple(questionVersionNode, "foaf:author", new Node(author)));
    localClient
      .getLocalStore()
      .add(new Triple(questionVersionNode, "foaf:ofQuestion", questionNode));
    localClient
      .getLocalStore()
      .add(new Triple(questionNode, "foaf:version", questionVersionNode));
    if (oldData) {
      let lastChange = new Triple(
        questionNode,
        "foaf:lastChange",
        new Data(oldData.lastChange, "xsd:dateTimeStamp")
      );
      lastChange.updateObject(
        new Data(localClient.getLocalStore().now, "xsd:dateTimeStamp")
      );
      let lastSeenTriple = new Triple(
        questionNode,
        isTeacher(author)
          ? "foaf:lastSeenByTeacher"
          : "foaf:lastSeenByStudent",
        new Data(
          isTeacher(author)
            ? oldData.lastSeenByTeacher
            : oldData.lastSeenByStudent,
          "xsd:dateTimeStamp"
        )
      );
      lastSeenTriple.updateObject(
        new Data(localClient.getLocalStore().now, "xsd:dateTimeStamp")
      );
      localClient.getLocalStore().bulk([lastChange, lastSeenTriple]);
    } else {
      localClient
        .getLocalStore()
        .add(
          new Triple(
            questionNode,
            "foaf:lastChange",
            new Data(localClient.getLocalStore().now, "xsd:dateTimeStamp")
          )
        );
      let time = new Date();
      time.setHours(time.getHours() - 4);
      localClient
        .getLocalStore()
        .add(
          new Triple(
            questionNode,
            "foaf:lastSeenByTeacher",
            new Data(
              isTeacher(author)
                ? localClient.getLocalStore().now
                : time.toISOString(),
              "xsd:dateTimeStamp"
            )
          )
        );
      localClient
        .getLocalStore()
        .add(
          new Triple(
            questionNode,
            "foaf:lastSeenByStudent",
            new Data(
              !isTeacher(author)
                ? localClient.getLocalStore().now
                : time.toISOString(),
              "xsd:dateTimeStamp"
            )
          )
        );
    }
  } catch (e) {
    console.log(e);
  }
    return questionVersionNode;
};

const createPredefinedAnswer = async (
  questionVersionNode,
  answer,
  position
) => {
  const foaf = "http://www.semanticweb.org/semanticweb#";
  let questionVersionAnswerNode = await getNewNode("PredefinedAnswer");
  try {
    localClient
      .getLocalStore()
      .add(
        new Triple(
          questionVersionAnswerNode,
          "rdf:type",
          new Node(foaf + "PredefinedAnswer"),
          Triple.ADD
        )
      );
    localClient
      .getLocalStore()
      .add(
        new Triple(
          questionVersionAnswerNode,
          "foaf:text",
          new Text(answer.text, "sk"),
          Triple.ADD
        )
      );
    localClient
      .getLocalStore()
      .add(
        new Triple(
          questionVersionAnswerNode,
          "foaf:correct",
          new Data(answer.correct, "xsd:boolean"),
          Triple.ADD
        )
      );
    localClient
      .getLocalStore()
      .add(
        new Triple(
          questionVersionAnswerNode,
          "foaf:position",
          new Data(position, "xsd:integer"),
          Triple.ADD
        )
      );
    localClient
      .getLocalStore()
      .add(
        new Triple(questionVersionNode, "foaf:answer", questionVersionAnswerNode, Triple.ADD)
      );
  } catch (e) {
    console.log(e);
  }
  return questionVersionAnswerNode;
};

const modifyAssignmentToPerson = async (
  questionAssignmentNode,
  selectedAgent,
  toAdd
) => {
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

const toArray = input => {
  return input
    ? !Array.isArray(input)
      ? [input] //when only one question came, it is just object, not array of one object
      : input
    : [];
};

const isTeacher = token => {
  //TODO isTeacher should be determined by token of user
  // provisional token
  return token === "http://www.semanticweb.org/semanticweb#Teacher";
};

async function getNewNode(nodePostfix) {
  ID.config({
    endpoint: "http://localhost:8890/sparql",
    graph: "http://www.semanticweb.org/semanticweb",
    prefix: "http://www.semanticweb.org/semanticweb/"+ nodePostfix+ "/"
  });
  let newNode;
  await ID.create()
    .then(commentIdTmp => {
      newNode = new Node(commentIdTmp);
    })
    .catch(console.log);
  return newNode;
}
module.exports = router;