/* eslint-disable no-undef */
const request = require("supertest");
const db = require("../models");
const app = require("../app");
let server, agent;
// eslint-disable-next-line no-undef
describe("Todo test suite", () => {
  // eslint-disable-next-line no-undef
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(3000, () => {});
    agent = request.agent(server);
  });

  // eslint-disable-next-line no-undef
  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  });

  // eslint-disable-next-line no-undef
  test("responds with json at /todos", async () => {
    const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
    });
    console.log("Full response:", response);
    // eslint-disable-next-line no-undef
    expect(response.statusCode).toBe(200);
    // eslint-disable-next-line no-undef
    expect(response.header["content-type"]).toBe(
      "application/json; charset=utf-8",
    );
    const parsedResponse = JSON.parse(response.text);
    // eslint-disable-next-line no-undef
    expect(parsedResponse.id).toBeDefined();
  });

  // eslint-disable-next-line no-undef
  test("Mark a todo as complete", async () => {
    const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
    });

    const parsedResponse = JSON.parse(response.text);
    const todoID = parsedResponse.id;

    // eslint-disable-next-line no-undef
    expect(parsedResponse.completed).toBe(false);

    const markCompleteResponse = await agent
      .put(`/todos/${todoID}/markAsCompleted`)
      .send();

    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    // eslint-disable-next-line no-undef
    expect(parsedUpdateResponse.completed).toBe(true);
  }, 10000);

  test("Delete a todo by ID", async () => {
    // Create a todo to be deleted
    const createResponse = await agent.post("/todos").send({
      title: "Test Todo",
      dueDate: new Date().toISOString(),
      completed: false,
    });

    const createdTodo = JSON.parse(createResponse.text);

    // Perform the delete request
    const deleteResponse = await agent
      .delete(`/todos/${createdTodo.id}`)
      .send();

    // Check the response
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.header["content-type"]).toBe(
      "application/json; charset=utf-8",
    );

    const parsedDeleteResponse = JSON.parse(deleteResponse.text);

    // Check if the deletion was successful
    expect(parsedDeleteResponse).toBe(true);
  });
});
