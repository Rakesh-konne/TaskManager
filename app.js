/* eslint-disable no-undef */
// eslint-disable-next-line no-unused-vars
const { request, response } = require("express");
const express = require("express");
const app = express();
const { Todo } = require("./models");
const path = require("path");
const bodyParser = require("body-parser");
const csurf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
app.use(bodyParser.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser("shh! some secret string"));
app.use(csurf("this_should_be_32_character_long",["POST","PUT","DELETE"]));
// eslint-disable-next-line no-unused-vars

app.set("view engine", "ejs");
app.get("/", async (request, response) => {
  const formattedDate = (d) => {
    return d.toISOString().split("T")[0];
  };
  const allTodos = await Todo.getTodos();
  var dateToday = new Date();
  const today = formattedDate(dateToday);
  const overdue = allTodos.filter(todo => {
    const todoDueDate = formattedDate(new Date(todo.dueDate));
    return todoDueDate < today;
  });
  const dueToday = allTodos.filter(todo => {
    const todoDueDate = formattedDate(new Date(todo.dueDate));
    return todoDueDate === today;
  });
  const dueLater = allTodos.filter(todo => {
    const todoDueDate = formattedDate(new Date(todo.dueDate));
    return todoDueDate > today;
  });
  if (request.accepts("html")) {
    response.render("index", {
      allTodos,overdue,dueToday,dueLater,
      csrfToken:request.csrfToken(),
    });
  } else {
    response.json({ allTodos,overdue,dueToday,dueLater });
  }
});
app.use(express.static(path.join(__dirname, "public")));

app.get("/todos", async (request, response) => {
  try {
    const todos = await Todo.findAll();
    return response.json(todos);
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/todos", async (request, response) => {
  console.log("Creating a todo", request.body);
  try {
    const todo = await Todo.build({
      title: request.body.title,
      dueDate: request.body.dueDate,
      completed: false,
    }).save();
    return response.redirect("/");
  } catch (error) {
    console.log(error);
    console.log("Validation error:", error);
    return response.status(427).json(error);
  }
});

// PUT http://mytodoapp.com/todos/123/markAsCompleted
app.put("/todos/:id/markAsCompleted", async (request, response) => {
  console.log("We have to update a todo with ID:", request.params.id);
  const todo = await Todo.findByPk(request.params.id);
  try {
    const updatedTodo = await todo.markAsComplete();
    return response.json(updatedTodo);
  } catch (error) {
    console.log(error);
    return response.status(427).json(error);
  }
});

// eslint-disable-next-line no-unused-vars
app.delete("/todos/:id", async (request, response) => {
  console.log("Delete a todo by ID: ", request.params.id);
  try {
    await Todo.remove(request.params.id);
    return response.json({success :true});
  } catch (error) {
    return response.status(422).json({ error: "Internal Server Error" });
  }
});
module.exports = app;
