const express = require("express");
const ID = require("virtuoso-uid");
const router = express.Router();
const sparqlTransformer = require("sparql-transformer");

const { Client, Node, Text, Data, Triple } = require("virtuoso-sparql-client");

const semanticWeb = "http://www.semanticweb.org/semanticweb";
const semanticWebW = semanticWeb + "#";
const clientAdress = "http://localhost:8890/sparql";
const graphName = semanticWeb;
const format = "application/json";
const localClient = new Client(clientAdress);
const prefixes = {
  foaf: semanticWebW
};
localClient.setQueryFormat(format);
localClient.addPrefixes(prefixes);
localClient.setQueryGraph(graphName);
localClient.setOptions("application/json", { foaf: semanticWebW }, semanticWeb);
const options = {
  context: "http://schema.org",
  endpoint: clientAdress,
  debug: true
};

router.post("/api/questionGroups", async (req, res) => {
  const requester = req.body.token; //TODO

  //TODO return only questions where i am author and show all to teacher
  const q = {
    proto: {
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
    },
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
      foaf: semanticWebW
    }
  };

  try {
    let data = await sparqlTransformer.default(q, options);
    data.forEach(topic => {
      topic.questions = toArray(topic.questions);
    });
    res.status(200).json(data);
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
  }
});

router.post("/api/quizAssignments", async (req, res) => {
  const requester = req.body.token; //TODO

  //TODO return only questions where i am author and show all to teacher
  const q = {
    proto: {
      id: "?id",
      title: "$rdfs:label",
      description: "$foaf:description",
      startTime: "$foaf:startDate",
      endTime: "$foaf:endDate",
      quiz: {
        id: "$foaf:quiz",
        questions: {
          id: "$foaf:selectedQuestionInfo",
          selectedQuestion: {
            id: "$foaf:selectedQuestion",
            title: "$rdfs:label"
          }
        }
      },
    },
    $where: [
      "?id a foaf:QuizAssignment",
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
      foaf: semanticWebW
    }
  };

  try {
    let data = await sparqlTransformer.default(q, options);
    data = toArray(data);
    data.forEach(assignment => {
      assignment.questions = toArray(assignment.questions);
    });
    res.status(200).json(data);
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
  }
});

router.post("/api/topicsToCreateModifyQuestionAssignment", async (req, res) => {
  const editedQuestionAssignment = decodeURIComponent(
    req.body.editedQuestionAssignment
  );
  const q = {
    proto: {
      id: "?id",
      name: "$foaf:name",
      assignment: "$foaf:hasAssignment"
    },
    $where: ["?id rdf:type foaf:Topic"],
    $prefixes: {
      foaf: semanticWebW
    }
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
    res.status(500).json(e);
  }
});

router.post("/api/topics", async (req, res) => {
  const author = req.body.token; //TODO previest token na authora
  const q = {
    proto: {
      id: "?id",
      name: "$foaf:name"
    },
    $where: [
      "?id rdf:type foaf:Topic",
      "?id foaf:hasAssignment ?questionAssignmentId",
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
      foaf: semanticWebW
    }
  };

  try {
    const out = await sparqlTransformer.default(q, options);

    res.status(200).json(out);
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
  }
});

router.post("/api/addComment", async (req, res) => {
  const questionVersionId = req.body.questionVersionId;
  const questionId = decodeURIComponent(req.body.questionId);
  const author = req.body.token;
  //TODO previest token na authora
  const newComment = req.body.newComment;
  const dataOld = await getLastSeen(questionId);
  await addComment(questionVersionId, author, newComment, questionId, dataOld);

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
    proto: {
      id: "?id",
      name: "$foaf:name"
    },
    $where: ["?id rdf:type foaf:CourseStudent"],
    $prefixes: {
      foaf: semanticWebW
    }
  };
  try {
    const out = await sparqlTransformer.default(q, options);
    res.status(200).json(out);
  } catch (e) {
    console.log(e);
    res.send(e);
  }
});
router.get("/api/getQuestions", async (req, res) => {
  const q = {
    proto: {
      id: "?id",
      title: "$rdfs:label",
      topic: "$foaf:about"
    },
    $where: [
      "?id rdf:type foaf:Question",
      "?id foaf:approvedAsPublic ?approvedAsPublicId",
      "?id foaf:approvedAsPrivate ?approvedAsPrivateId"
    ],
    $filter: [
      "?approvedAsPublicId != <undefined> || ?approvedAsPrivateId != <undefined>"
    ],
    $prefixes: {
      foaf: semanticWebW
    }
  };
  try {
    const out = await sparqlTransformer.default(q, options);
    res.status(200).json(out);
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
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
      proto: {
        id: "<" + questionVersionUri + ">",
        question: {
          id: "$foaf:ofQuestion",
          approvedId: "$" + relation,
          lastSeenByTeacher: "$foaf:lastSeenByTeacher",
          lastChange: "$foaf:lastChange"
        }
      },
      $prefixes: {
        foaf: semanticWebW
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
      res.status(500).send(e);
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
  const questionAssignmentUri = decodeURIComponent(req.params.uri);
  const data = await getQuestionAssignment(questionAssignmentUri);
  if (data !== "undefined") {
    res.status(200).json(data);
  } else {
    res.status(500).json();
  }
});

router.get("/api/getQuizAssignment/:uri", async (req, res) => {
  const quizAssignmentUri = decodeURIComponent(req.params.uri);
  const data = await getQuizAssignment(quizAssignmentUri);
  if (data !== "undefined") {
    res.status(200).json(data);
  } else {
    res.status(500).json("data undefined");
  }
});

router.get("/api/questionTypes", async (req, res) => {
  const q = {
    proto: {
      id: "?id",
      name: "$rdfs:label"
    },
    $where: ["?id rdfs:subClassOf foaf:QuestionVersion"],
    $prefixes: {
      foaf: semanticWebW
    }
  };
  try {
    const out = await sparqlTransformer.default(q, options);
    res.status(200).json(out);
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
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
    proto: {
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
    },
    $where: ["<" + questionUri + ">" + " a foaf:Question"],
    $orderby: ["DESC(?v82)", "?v852", "?v843"], //this is shit but it works
    //sort question versions by created ?v82
    //sort comments by created ?v852
    //sort answers by position ?v843
    // $groupby:"$foaf:answer",
    $prefixes: {
      foaf: semanticWebW,
      dcterms: "http://purl.org/dc/terms/"
    }
    // $values: {
    //   "questionUri": questionUri
    // },
  };
  try {
    let data = await sparqlTransformer.default(q, options);
    if (data && data.length && data.length > 0) {
      let questionVersions = toArray(data[0].questionVersions);
      questionVersions.forEach(questionVersion => {
        questionVersion.answers = toArray(questionVersion.answers);
        questionVersion.comments = toArray(questionVersion.comments);
      });

      data[0].questionVersions = questionVersions;
    }
    res.status(200).json(data[0]);
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
  }
});
router.post("/api/createQuestionAssignment", async (req, res) => {
  let questionAssignmentId;
  if (req.body.id) {
    questionAssignmentId = decodeURIComponent(req.body.id);
  }
  const startDate = req.body.startDate;
  const endDate = req.body.endDate;
  const description = req.body.description;
  const topic = req.body.topic;
  const selectedAgents = req.body.selectedAgents;
  const token = req.body.token;
  if (isTeacher(token)) {
    let oldData;
    if (questionAssignmentId) {
      oldData = await getQuestionAssignment(questionAssignmentId);
    }
    const questionAssignmentNode = await createQuestionAssignment(
      startDate,
      endDate,
      description,
      topic,
      questionAssignmentId,
      oldData
    );
    if (questionAssignmentId && oldData) {
      const oldToRemove = oldData.selectedAgents.filter(
        id => !selectedAgents.includes(id)
      );
      const newToAdd = selectedAgents.filter(
        id => !oldData.selectedAgents.includes(id)
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
    res.status(401).json("not authorized");
  }
});

router.post("/api/createQuizAssignment", async (req, res) => {
  let quizAssignmentId;
  if (req.body.id) {
    quizAssignmentId = decodeURIComponent(req.body.id);
  }
  const title = req.body.title;
  const startDate = req.body.startDate;
  const endDate = req.body.endDate;
  const description = req.body.description;
  const selectedAgents = req.body.selectedAgents;
  const token = req.body.token;
  const questions = req.body.questions;

  if (isTeacher(token)) {
    let oldData;
    if (quizAssignmentId) {
      // oldData = await getQuizAssignment(quizAssignmentId);
    }
    const quizAssignmentNode = await createQuizAssignment(
      title,
      startDate,
      endDate,
      description,
      questions,
      quizAssignmentId,
      oldData
    );
    if (quizAssignmentId && oldData) {
      const oldToRemove = oldData.selectedAgents.filter(
        id => !selectedAgents.includes(id)
      );
      const newToAdd = selectedAgents.filter(
        id => !oldData.selectedAgents.includes(id)
      );
      await Promise.all(
        oldToRemove.map(async selectedAgent => {
          await modifyAssignmentToPerson(
            quizAssignmentNode,
            selectedAgent,
            false
          );
        })
      );
      await Promise.all(
        newToAdd.map(async selectedAgent => {
          await modifyAssignmentToPerson(
            quizAssignmentNode,
            selectedAgent,
            true
          );
        })
      );
    } else {
      await Promise.all(
        selectedAgents.map(async selectedAgent => {
          await modifyAssignmentToPerson(
            quizAssignmentNode,
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
    res.status(401).json("not authorized");
  }
});

router.post("/api/createNewQuestion", async (req, res) => {
  const author = req.body.token;
  //TODO previest token na authora
  const title = req.body.title;
  const questionText = req.body.questionText;
  const topic = req.body.topic;
  const questionType = req.body.questionType;
  const answers = req.body.answers;
  const questionId = req.body.questionId;

  let questionNode;
  let oldData;
  const authorizationData = await getAuthorizationData(
    topic,
    author,
    questionId
  );
  if (isAuthorizedForAddingQuestion(authorizationData, author)) {
    if (questionId === undefined) {
      questionNode = await createQuestion(author, topic, title);
    } else {
      questionNode = new Node(questionId);
      oldData = await getLastSeen(questionId);
      let labelTriple = new Triple(
        questionNode,
        "rdfs:label",
        new Text(oldData[0].title)
      );
      labelTriple.updateObject(
        new Text(title)
      );
      localClient.getLocalStore().bulk([labelTriple]);
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
  } else {
    console.log("unauthorized");
    res.status(401).json("Unauthorized");
  }
});

const createTopic = async topicName => {
  let questionNode = {};
  questionNode = await getNewNode("Topic");
  localStoreAdd(
    new Triple(questionNode, "rdf:type", new Node(semanticWebW + "Topic"))
  );
  localStoreAdd(new Triple(questionNode, "foaf:name", new Text(topicName)));
  return questionNode;
};
const addComment = async (
  questionVersionId,
  author,
  newComment,
  questionId,
  oldData
) => {
  const commentNode = await getNewNode("Comment");
  if (commentNode) {
    try {
      localStoreAdd(
        new Triple(commentNode, "rdf:type", new Node(semanticWebW + "Comment"))
      );
      localStoreAdd(new Triple(commentNode, "foaf:text", new Text(newComment)));
      localStoreAdd(
        new Triple(new Node(questionVersionId), "foaf:comment", commentNode)
      );
      localStoreAdd(new Triple(commentNode, "foaf:author", new Node(author)));
      let lastChange = new Triple(
        new Node(questionId),
        "foaf:lastChange",
        new Data(oldData[0].lastChange, "xsd:dateTimeStamp")
      );
      lastChange.updateObject(
        new Data(localClient.getLocalStore().now, "xsd:dateTimeStamp")
      );
      let lastSeenTriple = new Triple(
        new Node(questionId),
        isTeacher(author) ? "foaf:lastSeenByTeacher" : "foaf:lastSeenByStudent",
        new Data(
          isTeacher(author)
            ? oldData[0].lastSeenByTeacher
            : oldData[0].lastSeenByStudent,
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

const createQuizAssignment = async (
  title,
  startDate,
  endDate,
  description,
  questions,
  quizAssignmentId,
  dataOld
) => {
  let quizAssignmentNode = {};
  try {
    if (quizAssignmentId && dataOld) {
      // quizAssignmentNode = new Node(id);
      //tiez title
      // let startDateTriple = new Triple(
      //   quizAssignmentNode,
      //   "foaf:startDate",
      //   new Data(new Date(dataOld.startDate).toISOString(), "xsd:dateTime")
      // );
      // startDateTriple.updateObject(
      //   new Data(new Date(startDate).toISOString(), "xsd:dateTime")
      // );
      // const endDateTriple = new Triple(
      //   quizAssignmentNode,
      //   "foaf:endDate",
      //   new Data(new Date(dataOld.endDate).toISOString(), "xsd:dateTime")
      // );
      // endDateTriple.updateObject(
      //   new Data(new Date(endDate).toISOString(), "xsd:dateTime")
      // );
      // const descriptionTriple = new Triple(
      //   quizAssignmentNode,
      //   "foaf:description",
      //   new Text(dataOld.description)
      // );
      // descriptionTriple.updateObject(new Text(description));
      // //TODO pomenit quiz (pomenit selected question)
      // localClient
      //   .getLocalStore()
      //   .bulk([
      //     startDateTriple,
      //     endDateTriple,
      //     descriptionTriple
      //   ]);
    } else {
      quizAssignmentNode = await getNewNode("QuizAssignment");
      localStoreAdd(
        new Triple(
          quizAssignmentNode,
          "rdf:type",
          new Node(semanticWebW + "QuizAssignment")
        )
      );
      localStoreAdd(
        new Triple(
          quizAssignmentNode,
          "rdfs:label",
          new Text(title)
        )
      );
      localStoreAdd(
        new Triple(
          quizAssignmentNode,
          "foaf:startDate",
          new Data(new Date(startDate).toISOString(), "xsd:dateTime")
        )
      );
      localStoreAdd(
        new Triple(
          quizAssignmentNode,
          "foaf:endDate",
          new Data(new Date(endDate).toISOString(), "xsd:dateTime")
        )
      );
      localStoreAdd(
        new Triple(
          quizAssignmentNode,
          "foaf:description",
          new Text(description)
        )
      );
      const quizNode = await createQuiz(questions, quizAssignmentId, dataOld);
      localStoreAdd(
        new Triple(
          quizAssignmentNode,
          "foaf:quiz",
          quizNode
        )
      );
    }
  } catch (e) {
    console.log(e);
  }
  return quizAssignmentNode;
};

const createQuiz = async (questions, quizAssignmentId, dataOld) => {
  let quizNode = {};
  if (quizAssignmentId && dataOld) {
    //TODO edit quiz
    console.log("TODO editQuiz!!!");
  } else {
    quizNode = await getNewNode("Quiz");
    await Promise.all(
      questions.map(async (selectedQuestion, index) => {
        await addSelectedQuestion(quizNode, selectedQuestion, index);
      })
    )
  }
  return quizNode;
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
      localStoreAdd(
        new Triple(
          new Node(dataOld.topic),
          "foaf:hasAssignment",
          questionAssignmentNode,
          Triple.REMOVE
        )
      );
      localStoreAdd(
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
      questionAssignmentNode = await getNewNode("QuestionAssignment");
      localStoreAdd(
        new Triple(
          questionAssignmentNode,
          "rdf:type",
          new Node(semanticWebW + "QuestionAssignment")
        )
      );
      localStoreAdd(
        new Triple(
          questionAssignmentNode,
          "foaf:startDate",
          new Data(new Date(startDate).toISOString(), "xsd:dateTime")
        )
      );
      localStoreAdd(
        new Triple(
          questionAssignmentNode,
          "foaf:endDate",
          new Data(new Date(endDate).toISOString(), "xsd:dateTime")
        )
      );
      localStoreAdd(
        new Triple(
          questionAssignmentNode,
          "foaf:description",
          new Text(description)
        )
      );
      localStoreAdd(
        new Triple(
          new Node(topic),
          "foaf:hasAssignment",
          questionAssignmentNode
        )
      );
      localStoreAdd(
        new Triple(questionAssignmentNode, "foaf:elaborate", new Node(topic))
      );
    }
  } catch (e) {
    console.log(e);
  }
  return questionAssignmentNode;
};

const createQuestion = async (author, topic, title) => {
  let questionNode = await getNewNode("Question");
  try {
    localStoreAdd(
      new Triple(questionNode, "rdf:type", new Node(semanticWebW + "Question"))
    );
    localStoreAdd(new Triple(questionNode, "foaf:author", new Node(author)));
    localStoreAdd(
      new Triple(questionNode, "rdfs:label", new Text(title))
    );
    localStoreAdd(new Triple(questionNode, "foaf:about", new Node(topic)));
    localStoreAdd(
      new Triple(new Node(topic), "foaf:questionsAboutMe", questionNode)
    );
    localStoreAdd(
      new Triple(questionNode, "foaf:approvedAsPublic", new Node())
    );
    localStoreAdd(
      new Triple(questionNode, "foaf:approvedAsPrivate", new Node())
    );
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
    localStoreAdd(
      new Triple(questionVersionNode, "rdf:type", new Node(questionType))
    );
    localStoreAdd(
      new Triple(questionVersionNode, "foaf:text", new Text(questionText, "sk"))
    );
    localStoreAdd(
      new Triple(questionVersionNode, "foaf:author", new Node(author))
    );
    localStoreAdd(
      new Triple(questionVersionNode, "foaf:ofQuestion", questionNode)
    );
    localStoreAdd(
      new Triple(questionNode, "foaf:version", questionVersionNode)
    );
    if (oldData) {
      
      let lastChange = new Triple(
        questionNode,
        "foaf:lastChange",
        new Data(oldData[0].lastChange, "xsd:dateTimeStamp")
      );
      lastChange.updateObject(
        new Data(localClient.getLocalStore().now, "xsd:dateTimeStamp")
      );
      let lastSeenTriple = new Triple(
        questionNode,
        isTeacher(author) ? "foaf:lastSeenByTeacher" : "foaf:lastSeenByStudent",
        new Data(
          isTeacher(author)
            ? oldData[0].lastSeenByTeacher
            : oldData[0].lastSeenByStudent,
          "xsd:dateTimeStamp"
        )
      );
      lastSeenTriple.updateObject(
        new Data(localClient.getLocalStore().now, "xsd:dateTimeStamp")
      );
      localClient.getLocalStore().bulk([lastChange, lastSeenTriple]);
    } else {
      localStoreAdd(
        new Triple(
          questionNode,
          "foaf:lastChange",
          new Data(localClient.getLocalStore().now, "xsd:dateTimeStamp")
        )
      );
      let time = new Date();
      time.setHours(time.getHours() - 4);
      localStoreAdd(
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
      localStoreAdd(
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
  let questionVersionAnswerNode = await getNewNode("PredefinedAnswer");
  try {
    localStoreAdd(
      new Triple(
        questionVersionAnswerNode,
        "rdf:type",
        new Node(semanticWebW + "PredefinedAnswer")
      )
    );
    localStoreAdd(
      new Triple(
        questionVersionAnswerNode,
        "foaf:text",
        new Text(answer.text, "sk")
      )
    );
    localStoreAdd(
      new Triple(
        questionVersionAnswerNode,
        "foaf:correct",
        new Data(answer.correct, "xsd:boolean")
      )
    );
    localStoreAdd(
      new Triple(
        questionVersionAnswerNode,
        "foaf:position",
        new Data(position, "xsd:integer")
      )
    );
    localStoreAdd(
      new Triple(questionVersionNode, "foaf:answer", questionVersionAnswerNode)
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
  localStoreAdd(
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
  return token === semanticWebW + "Teacher";
};

async function addSelectedQuestion(quizNode, selectedQuestion, index) {
  let selectedQuestionNode = {};
  selectedQuestionNode = await getNewNode("SelectedQuestion");
  localStoreAdd(new Triple(quizNode, "foaf:selectedQuestionInfo", selectedQuestionNode));
  localStoreAdd(new Triple(selectedQuestionNode, "foaf:selectedQuestion", new Node(selectedQuestion)));
  localStoreAdd(new Triple(selectedQuestionNode, "foaf:position", new Data(index, "xsd:integer")));
}

async function getQuestionAssignment(questionAssignmentUri) {
  const q = {
    proto: {
      id: "<" + questionAssignmentUri + ">",
      startDate: "$foaf:startDate",
      endDate: "$foaf:endDate",
      description: "$foaf:description",
      topic: "$foaf:elaborate",
      selectedAgents: {
        id: "$foaf:assignedTo"
      }
    },
    $where: [
      "<" + questionAssignmentUri + ">" + " rdf:type foaf:QuestionAssignment"
    ],
    $prefixes: {
      foaf: semanticWebW
    }
  };
  try {
    let data = await sparqlTransformer.default(q, options);
    const item = data[0];
    item.selectedAgents = toArray(item.selectedAgents);
    const selectedAgentsTmp = item.selectedAgents.map(selectedAgent => {
      return selectedAgent.id;
    });
    item.selectedAgents = Array.from(selectedAgentsTmp);
    data = item;
    return data;
  } catch (e) {
    console.log(e);
    return "undefined";
  }
}

async function getQuizAssignment(quizAssignmentUri) {
  const q = {
    proto: {
      id: "<" + quizAssignmentUri + ">",
      title: "$rdfs:label",
      startDate: "$foaf:startDate",
      endDate: "$foaf:endDate",
      description: "$foaf:description",
      selectedAgents: {
        id: "$foaf:assignedTo"
      },
      quiz: {
        id: "$foaf:quiz",
        questions: {
          id: "$foaf:selectedQuestionInfo",
          selectedQuestion: {
            id: "$foaf:selectedQuestion",
          }
        }
      },
    },
    $where: [
      "<" + quizAssignmentUri + ">" + " rdf:type foaf:QuizAssignment"
    ],
    // $orderby: ["DESC(?v82)", "?v852", "?v843"]
    //ORDERBY position
    $prefixes: {
      foaf: semanticWebW
    }
  };
  try {
    let data = await sparqlTransformer.default(q, options);
    const item = data[0];
    item.selectedAgents = toArray(item.selectedAgents);
    const selectedAgentsTmp = item.selectedAgents.map(selectedAgent => {
      return selectedAgent.id;
    });
    item.selectedAgents = Array.from(selectedAgentsTmp);
    //TODO quiz->questions->selectedQuestions to item.question on front-end
    data = item;
    return data;
  } catch (e) {
    console.log(e);
    return "undefined";
  }
}

async function getLastSeen(questionId) {
  const q = {
    proto: {
      id: "<" + questionId + ">",
      lastSeenByStudent: "$foaf:lastSeenByStudent",
      lastSeenByTeacher: "$foaf:lastSeenByTeacher",
      lastChange: "$foaf:lastChange",
      title: "$rdfs:label"
    },
    $where: ["<" + questionId + ">" + " a foaf:Question"],
    $prefixes: {
      foaf: semanticWebW
    }
  };
  try {
    let data = await sparqlTransformer.default(q, options);
    return data;
  } catch (e) {
    console.log(e);
    return "undefined";
  }
}

const getAuthorizationData = async (topicId, author, questionId) => {
  const q = {
    proto: {
      id: "<" + topicId + ">",
      questionAssignment: {
        id: "$foaf:hasAssignment",
        startDate: "$foaf:startDate",
        endDate: "$foaf:endDate"
      },
      question: {
        id: "$foaf:questionsAboutMe"
      }
    },
    $where: [
      "<" + topicId + ">" + " a foaf:Topic",
      "<" + topicId + ">" + " foaf:hasAssignment ?assignmentId",
      !isTeacher(author)
        ? "?assignmentId foaf:assignedTo " + "<" + author + ">"
        : "",
      "?assignmentId foaf:startDate ?startDate",
      "?assignmentId foaf:endDate ?endDate",
      questionId
        ? "<" +
          topicId +
          ">" +
          " foaf:questionsAboutMe " +
          "<" +
          questionId +
          ">"
        : "",
      !isTeacher(author)
        ? questionId
          ? "<" + questionId + ">" + " foaf:author " + "<" + author + ">"
          : ""
        : ""
    ],
    $prefixes: {
      foaf: semanticWebW
    }
  };
  !isTeacher(author)
    ? (q["$filter"] = ["?startDate <= NOW()", "?endDate >= NOW()"])
    : null;
  try {
    let data = await sparqlTransformer.default(q, options);
    return data[0];
  } catch (e) {
    console.log(e);
    return undefined;
  }
};
const isAuthorizedForAddingQuestion = (authorizationData, author) => {
  if (authorizationData && authorizationData.questionAssignment) {
    if (
      (new Date(authorizationData.questionAssignment.startDate) < new Date() &&
        new Date(authorizationData.questionAssignment.endDate) > new Date()) ||
      isTeacher(author)
    ) {
      console.log(true);
      return true;
    } else {
      return false;
    }
  } else {
    console.log(false);
    return false;
  }
};

function localStoreAdd(triple) {
  localClient.getLocalStore().add(triple);
}

async function getNewNode(nodePostfix) {
  ID.config({
    endpoint: clientAdress,
    graph: semanticWeb,
    prefix: semanticWeb + "/" + nodePostfix + "/"
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
