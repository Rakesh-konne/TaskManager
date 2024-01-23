/* eslint-disable no-undef */
// eslint-disable-next-line no-unused-vars
const { request, response } = require("express");
const express = require("express");
const app = express();
const { Todo ,User} = require("./models");
const path = require("path");
const bodyParser = require("body-parser");
const csurf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const { error } = require("console");

const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");

const bcrypt=require('bcrypt');
const saltRounds=10;

app.use(bodyParser.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser("shh! some secret string"));
app.use(csurf("this_should_be_32_character_long",["POST","PUT","DELETE"]));
app.use(express.static(path.join(__dirname, "public")));
// eslint-disable-next-line no-unused-vars
app.use(session({
  secret:"my-super-secret-key-2151122345111531436",
  cookie:{
    maxAge:24*60*60*1000 //24hrs
  }
}))

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({
  usernameField:'email',
  passwordField:'password'
},(username,password,done)=>{
  User.findOne({ where: {email:username}})
  .then(async(user)=>{
    const result=await bcrypt.compare(password,user.password)
    if(result){
      return done(null,user);
    }else{
      return done("Invalid Password");
    }
  }).catch((error)=>{
    return {error}
  })
}));



passport.serializeUser((user, done)=>{
  console.log("Serializing user in session",user.id)
  done(null,user.id)
});

passport.deserializeUser((id,done)=>{
  User.findByPk(id).then(user=>{
    done(null,user)
  })
  .catch(error=>{
    done(error,null)
  })
});

app.set("view engine", "ejs");
app.get("/", async (request, response) => {
  response.render("index", {
    csrfToken:request.csrfToken(),
  });
});

app.get("/todos",connectEnsureLogin.ensureLoggedIn(), async (request,response)=>{
  const loggedInUser=request.user.id;
  const formattedDate = (d) => {
    return d.toISOString().split("T")[0];
  };
  const allTodos = await Todo.getTodos();
  var dateToday = new Date();
  const today = formattedDate(dateToday);
  const overdue = allTodos.filter(todo => {
    const todoDueDate = formattedDate(new Date(todo.dueDate));
    return todoDueDate < today && !todo.completed && todo.userId===loggedInUser;
  });
  const dueToday = allTodos.filter(todo => {
    const todoDueDate = formattedDate(new Date(todo.dueDate));
    return todoDueDate === today && !todo.completed && todo.userId===loggedInUser;
  });
  const dueLater = allTodos.filter(todo => {
    const todoDueDate = formattedDate(new Date(todo.dueDate));
    return todoDueDate > today && !todo.completed && todo.userId===loggedInUser;
  });

  const completetodos = allTodos.filter(todo => todo.completed === true && todo.userId===loggedInUser);

  if (request.accepts("html")) {
    response.render("todo", {
      allTodos,overdue,dueToday,dueLater,completetodos,
      csrfToken:request.csrfToken(),
    });
  } else {
    response.json({ allTodos,overdue,dueToday,dueLater,completetodos });
  }
});

app.get("/signup",(request,response)=>{
  response.render("signup",{csrfToken:request.csrfToken()})
})

app.post("/users",async(request,response)=>{
  const hashedPwd=await bcrypt.hash(request.body.password,saltRounds)
  console.log(hashedPwd)
  try{
    const user=await User.create({
      firstName:request.body.firstName,
      lastName:request.body.lastName,
      email:request.body.email,
      password:hashedPwd
    });
    request.login(user,(err)=>{
      if(err){
        console.log(err)
      }
      response.redirect("/todos");
    })
  }catch(error){
    console.log(error);
  }
  
})

app.get("/login",(request,response)=>{
  response.render("login",{csrfToken:request.csrfToken()});
})

app.post("/session",passport.authenticate('local',{failureRedirect :"/login"}), (request,response)=>{
  console.log(request.user);
  // const redirectTo = "/todos" + "?csrfToken=" + request.csrfToken();
  // response.redirect(redirectTo);
  response.redirect("/todos")
})

app.get("/signout",(request,response)=>{
request.logout((err)=>{
  if(err){
    return next(err);
  }
  response.redirect("/");
})
})

app.get("/todos", async (request, response) => {
  try {
    const todos = await Todo.findAll();
    return response.json(todos);
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/todos",connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  console.log("Creating a todo", request.body);
  try {
    const todo = await Todo.build({
      title: request.body.title,
      dueDate: request.body.dueDate,
      completed: false,
      userId: request.user.id
    }).save();
    response.redirect("/todos")
  } catch (error) {
    console.log(error);
    console.log("Validation error:", error);
    return response.status(427).json(error);
  }
});

// PUT http://mytodoapp.com/todos/123/markAsCompleted
app.put("/todos/:id",connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  console.log("We have to update a todo with ID:", request.params.id);
  const todo = await Todo.findByPk(request.params.id);
  try {
    const updatedTodo = await todo.setCompletionStatus(!todo.completed);
    return response.json(updatedTodo);
  } catch (error) {
    console.log(error);
    return response.status(427).json(error);
  }
});
// eslint-disable-next-line no-unused-vars
app.delete("/todos/:id",connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  console.log("Delete a todo by ID: ", request.params.id);
  try {
    await Todo.remove(request.params.id,request.user.id);
    return response.json({success :true});
  } catch (error) {
    return response.status(422).json({ error: "Internal Server Error" });
  }
});
module.exports = app;
