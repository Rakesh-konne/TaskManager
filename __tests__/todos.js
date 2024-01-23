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
// const login=async(agent,username,password)=>{
//   let res=await agent.get("/login");
//   let csrfToken=extractCsrfToken(res);
//   res=await agent.post("/session").send({
//     email: username,
//     password:password,
//     _csrf:csrfToken,
//   });
// };

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


  test("Sign up",async()=>{
    let res=await agent.get("/signup");
    const csrfToken=extractCsrfToken(res);
    res=await agent.post("/users").send({
      firstName:"Test",
      lastName:"User A",
      email:"user,a@test.com",
      password:"1234567",
      _csrf:csrfToken
    })
    expect(res.statusCode).toBe(302);
  });

 
  // eslint-disable-next-line no-undef
  test("create new todo", async () => {
    // const agent=request.agent(server);
    // await login(agent,"user.@latest.com","123456789");
    const res=await agent.get("/todos");
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
    // const agent=request.agent(server);
    // await login(agent,"user.@latest.com","123456789");
    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);
  
    await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      "_csrf": csrfToken,
    });
  
    const groupedTodoResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodoResponse.text);
    const dueTodayCount = parsedGroupedResponse.allTodos.length;
    const latestTodo = parsedGroupedResponse.allTodos[dueTodayCount - 1];
  
    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);
  
    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: csrfToken,
      });
  
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
  });
  
  test("Delete a todo by ID", async () => {
    // const agent=request.agent(server);
    // await login(agent,"user.@latest.com","123456789");
    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res)
    await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      "_csrf": csrfToken
    });

    const groupedTodoResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodoResponse.text)
    const dueTodayCount = parsedGroupedResponse.allTodos.length
    const latestTodo = parsedGroupedResponse.allTodos[dueTodayCount - 1]
  
    res = await agent.get("/todos")
    csrfToken = extractCsrfToken(res)

    const deleted = await agent.delete(`/todos/${latestTodo.id}`).send({
      _csrf: csrfToken,
    })

    const parsedUpdateResponse = JSON.parse(deleted.text)
    expect(parsedUpdateResponse.success).toBe(true)
   });

   test("Sign out",async()=>{
    let res=await agent.get("/todos");
    expect(res.statusCode).toBe(200);
    res=await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res=await agent.get("/todos");
    expect(res.statusCode).toBe(302);
  })

});
