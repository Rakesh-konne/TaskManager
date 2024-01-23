/* eslint-disable no-undef */
const request = require("supertest");
var cheerio=require("cheerio");
const db = require("../models");
const app = require("../app");
let server, agent;
function extractCsrfToken(res){
  var $=cheerio.load(res.text);
  return $("[name=_csrf]").val();
}
// eslint-disable-next-line no-undef
describe("Todo test suite", () => {
  // eslint-disable-next-line no-undef
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });

  // eslint-disable-next-line no-undef
  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  });

  // eslint-disable-next-line no-undef
  test("responds with json at /todos", async () => {
    const res=await agent.get("/");
    const csrfToken=extractCsrfToken(res);
     const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      "_csrf":csrfToken
    });
    // eslint-disable-next-line no-undef
    expect(response.statusCode).toBe(302);
  });

   //eslint-disable-next-line no-undef
   test("Mark a todo as complete", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res)
    await agent.post("/").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      "_csrf": csrfToken
    });

    const groupedTodoResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodoResponse.text)
    const dueTodayCount = parsedGroupedResponse.length
    const latestTodo = parsedGroupedResponse[dueTodayCount - 1]
  
    res = await agent.get("/")
    csrfToken = extractCsrfToken(res)

    const markCompleteResponse = await agent.put(`/todos/${latestTodo.id}/markAsCompleted`).send({
      _csrf: csrfToken,
    })

    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text)
    expect(parsedUpdateResponse.completed).toBe(true)
  });

  test("Delete a todo by ID", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res)
    await agent.post("/").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      "_csrf": csrfToken
    });

    const groupedTodoResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodoResponse.text)
    const dueTodayCount = parsedGroupedResponse.length
    const latestTodo = parsedGroupedResponse[dueTodayCount - 1]
  
    res = await agent.get("/")
    csrfToken = extractCsrfToken(res)

    const deleted = await agent.delete(`/todos/${latestTodo.id}`).send({
      _csrf: csrfToken,
    })

    const parsedUpdateResponse = JSON.parse(deleted.text)
    expect(parsedUpdateResponse.success).toBe(true)
   });
});
