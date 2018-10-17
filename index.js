var express = require('express');
var app = express();
var router = express.Router();
var port = process.env.PORT || 1234;
var DATABASE_URL ="postgres://fgziyaczpjyghf:8bfdee6ef8f68d48dc35abaa5ea2ab738f816ee60bf3ff1e3a5193cafb5826ba@ec2-174-129-32-37.compute-1.amazonaws.com:5432/d549295uh1harg";
var bodyParser = require ('body-parser');
const path = require('path');
const { Pool } = require('pg'); 
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: true 
});
//
var http = require('http');
var Session = require('express-session');
var {google} = require('googleapis');
var GoogleAuth = require('google-auth-library');
var plus = google.plus('v1');
var OAuth2 = google.auth.OAuth2;
const ClientId = "432466061710-a5nv0o9ndkh8627lmobnign489v6fptj.apps.googleusercontent.com";
const ClientSecret = "kq0ZQ4lFgbMKbKkc_Y6n0F3a";
const RedirectionUrl = "http://localhost:1234/oauthCallback/";



//invoke functions on a service hosted in a different location
// Add headers
app.use(function (req, res, next) {
// Website you wish to allow to connect res.setHeader('Access-Control-Allow-Origin', '*')
res.setHeader('Access-Control-Allow-Origin', '*');
// Request methods you wish to allow
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
// Request headers you wish to allow ,
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow- Headers');
// Pass to next layer of middleware
next(); 
});
//
app
  .use (express.static(path.join(__dirname + '/public/front_end')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
app.use(bodyParser.json());

const crypto = require('crypto');

var server = http.createServer(app);
app.get('/', (req, res) => res.render('pages/index'));
	// .listen(port, () => console.log('Listening on Heroku Server'))
server.listen(port);
server.on('listening', function () {
      console.log('listening to ${port}');
});
app.use(Session({
    secret: 'raysources-secret-19890913007',
    resave: true,
    saveUninitialized: true
}));

function getOAuthClient () {
    return new OAuth2(ClientId , ClientSecret, RedirectionUrl);
}

function getAuthUrl () {
    var oauth2Client = getOAuthClient();
    // generate a url that asks permissions for Google+ and Google Calendar scopes
    var scopes = [
      'https://www.googleapis.com/auth/plus.me'
    ];

    var url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes // If you only need one scope you can pass it as string
    });

    return url;
}

app.use("/oauthCallback", function (req, res) {
    var oauth2Client = getOAuthClient();
    var session = req.session;
    var code = req.query.code;
    oauth2Client.getToken(code, function(err, tokens) {
      // Now tokens contains an access_token and an optional refresh_token. Save them.
      if(!err) {
        oauth2Client.setCredentials(tokens);
        session["tokens"]=tokens;
        res.send('<h3>Login successful!</h3><a href="/details">Go to details page</a>');
      }
      else{
        res.send('<h3>Login failed!</h3>');
      }
    });
});

app.use("/details", function (req, res) {
  var oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(req.session["tokens"]);
  
  var p = new Promise(function (resolve, reject) {
      plus.people.get({ userId: 'me', auth: oauth2Client }, function(err, response) {
        console.log(response)
          resolve(response || err);
      });
  }).then(function (response) {
    data = response.data;
      res.send('<h3>Hello ' + data.name.givenName +'_'+data.name.familyName + '</h3>');
      // res.send('<h4>'+displayName+'</h4>');
      // res.send('<h5>'+displayName+'</h5>');
  })
});

app.use("/login_google", function (req, res) {
  console.log("1111111");
  var url = getAuthUrl();
  // res.send('<h1>Authentication using google oAuth</h1><a href='
  //   + url +
  //   '>Login</a>')
  // res.send(url);
  res.redirect(url);  
});

app.post('/register', async (req, res) => {
  console.log("register js called");
  // alert("register js called");
  var salt =crypto.randomBytes(128).toString('hex');
  try {
    const client = await pool.connect();
    
    var firstname= req.body.fname;
    var lastname =req.body.lname;
    var pwd= req.body.pword;
    var email=req.body.emailadd;
    var hash_pwd=crypto.pbkdf2Sync(pwd, salt, 100000, 128, 'sha512').toString('hex');
    // console.log("all username:"+username);
    var query_state="insert into account_table (fname,lname,email,pwd,salt) values"+"('"+firstname+"','"+lastname+"','"+email+"','"+hash_pwd+"','"+salt+"')";
    console.log(query_state);
    // alert(query_state);
    var result = await client.query(query_state);   
   
    if (!result) {
      return res.send('No data found');
      }else{
      return res.send(result.rows);
    }

  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.post('/login_account', async (req, res) => {
  console.log("login back-end called");
  
  try {
    const client = await pool.connect();    
    var email=req.body.emailadd;
    var pwd= req.body.pword;
    // console.log("all username:"+username);
    var query_state="SELECT * FROM account_table where email='"+email+"'";
    console.log(query_state);
    // alert(query_state);
    var result = await client.query(query_state); 
    var salt;
    var real_pwd;
    var success=false;
    if(result){
      result.rows.forEach(account=>{
        // console.log("hahaha");
        salt=account.salt;
        real_pwd =account.pwd;
        console.log(account.fname,account.lname);
      });
        var try_pwd = crypto.pbkdf2Sync(pwd, salt, 100000, 128, 'sha512').toString('hex');
        success=(try_pwd==real_pwd);
        console.log("if success:"+success);
    }
    
    if (!result||!success) {

      return res.send('invalid information, please try again');
      }else{
      return res.send(result.rows);
    }

  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.put('/reset_pwd', async (req, res) => {
  console.log("reset js called");
  var new_salt =crypto.randomBytes(128).toString('hex');
  try {
    const client = await pool.connect();    
    var email=req.body.emailadd;
    var old_pwd= req.body.old_pword;
    var new_pwd= req.body.new_pword;
    // console.log("all username:"+username);
    var query_state="SELECT * FROM account_table where email='"+email+"'";
    console.log(query_state);
    // alert(query_state);
    var result = await client.query(query_state); 
    var old_salt;
    var real_oldpwd;
    var success=false;

    if(result){
      result.rows.forEach(account=>{
        // console.log("hahaha");
        old_salt=account.salt;
        real_oldpwd =account.pwd;
        // console.log(account.fname,account.lname);
      });

        var try_oldpwd_hash = crypto.pbkdf2Sync(old_pwd, old_salt, 100000, 128, 'sha512').toString('hex');
        var success=(try_oldpwd_hash==real_oldpwd);
        if(success){
          console.log("!!!!!!!!!!!!!!!!!ahhahahahahaha")
          var new_pwd_hash= crypto.pbkdf2Sync(new_pwd, new_salt, 100000, 128, 'sha512').toString('hex');
          query_state="UPDATE account_table SET pwd='"+new_pwd_hash+"',salt='"+new_salt+"' where email='"+email+"'";
          result = await client.query(query_state); 
          console.log("reset password successfully");
        }
        
    }
    
    if (!result||!success) {
      return res.send('invalid information, please try again');
    }
    else{
      return res.send(result.rows);
    }

  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});


// var queryCmd = "UPDATE tasks_table SET ifcompleted='"+ifcompleted+"' where nametask='"+taskname+"' and username='"+username+"'";

// All existing tasks on database will be shown on the corresponding position at webpage, once webpage was refreshed. 

// app.get('/db', async (req, res) => {
//   console.log("get called");
  
//   try {
//     const client = await pool.connect()
//     var result = await client.query('SELECT * FROM tasks_table');   
   
//     if (!result) {
//       return res.send('No data found');
//       }else{
      
//       return res.send(result.rows);
      
//     }
//   } catch (err) {
//     console.error(err);
//     res.send("Error " + err);
//   }
  
// });


// // Click add button in webpage to add a new task, then all information will be passed POST function, 
// //used the information to insert a task in the database by using sql command.
// app.post('/addnew', async (req, res) => {
//   console.log("add new called........");
 
//   try {
//     const client = await pool.connect();
//     console.log("body: "+req.body);
//     var taskname= req.body.nametask;
//     var username =req.body.username;
//     var ifcompleted=req.body.ifcompleted;
//     console.log("all username:"+username);
//     var result = await client.query("insert into tasks_table (nametask,username,ifcompleted) values"+"('"+taskname+"','"+username+"','"+ifcompleted+"')");   
   
//     if (!result) {
//       return res.send('No data found');
//       }else{
//       return res.send(result.rows);
//     }

//   } catch (err) {
//     console.error(err);
//     res.send("Error " + err);
//   }
// });


// // This function is used to change "ifcompleted" attributed to corresponding value("N"/"Y"). There are three cases. 
// // Firstly, if User click complete button on a task at to do list, then the task will be moved down to complete task list. 
// // Secondly, user drag a completed task to to do list. Thirdly, user drag a to-do task to complete task list. 
// // PUT function will change "ifcompleted" attribute of corresponding record on the database at server part. 

// app.put('/move_task', async (req, res) => {
  
//   console.log("move task server part called........");
//   try {
//     const client = await pool.connect();
//     var taskname =req.body.nametask;
//     var username=req.body.username;
//     var ifcompleted=req.body.ifcompleted;
//     console.log("first ifcompleted:"+ifcompleted);
//     if(ifcompleted=='N'){
//       ifcompleted='Y';
//     }else{
//       ifcompleted='N';
//     }
//     console.log(queryCmd);
//     var queryCmd = "UPDATE tasks_table SET ifcompleted='"+ifcompleted+"' where nametask='"+taskname+"' and username='"+username+"'";
//     console.log(queryCmd)
//     var result = await client.query(queryCmd);   
   
//     if (!result) {
//       return res.send('No data found');
//     }else{
//       return res.send(result.rows);
//     }

//   } catch (err) {
//     console.error(err);
//     res.send("Error " + err);
//   }
// });

// // When the user clicked delete button, the corresponding record on database will be deleted. 
// app.delete('/delete_task', async (req, res) => {
  
//   console.log("delete task server part called........");
//   try {
//     const client = await pool.connect();
//     var taskname =req.body.nametask;
//     var username=req.body.username;
//     var queryCmd = "delete from tasks_table where nametask='"+taskname+"' and username='"+username+"'";
//     console.log(queryCmd)
//     var result = await client.query(queryCmd);   
   
//     if (!result) {
//       return res.send('No data found');
//     }else{
//       return res.send(result.rows);
//     }

//   } catch (err) {
//     console.error(err);
//     res.send("Error " + err);
//   }
// });

// // when user click edit button, then the new taskname and username of the task on database will be updated.
// app.put('/edit_task', async (req, res) => {
//   //
//   console.log("Edit task server part called........");
//   try {
//     const client = await pool.connect();
//     var taskname =req.body.nametask;
//     var username=req.body.username;
//     var newname= req.body.new_nametask;
//     var newuser= req.body.new_username;
//     var queryCmd = "UPDATE tasks_table SET nametask='"+newname+"',username='"+newuser+"' where nametask='"+taskname+"' and username='"+username+"'";
//     console.log(queryCmd)
//     var result = await client.query(queryCmd);   
   
//     if (!result) {
//       return res.send('No data found');
//     }else{
//       return res.send(result.rows);
//     }

//   } catch (err) {
//     console.error(err);
//     res.send("Error " + err);
//   }
// }); 



