// this file is used to create tables in postgresql db, this file can be handy when you create a new db remotely.

import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import cors from "cors";

const app = express();
const port = 4000;


app.use(bodyParser.json());
app.use(express.static("public"));
app.use(cors());

const db = new pg.Client({
    // this is external url for posgtre database hosted on render.com, for more info https://docs.render.com/databases#connect-to-your-database
    connectionString : "postgres://splitwise_zvtj_user:wX4CDbAlbBl7DYSnxn5xtPjBQJamdQyn@dpg-codtgeol5elc73fu8q60-a.singapore-postgres.render.com/splitwise_zvtj",
    port : 5432,
    ssl: {
        rejectUnauthorized: false // Only if your PostgreSQL instance uses self-signed SSL certificates
      },
  });
  db.connect();

  db.query("delete  from owe");
  db.query("delete  from split");
  db.query("delete  from \"group\"");
  db.query("delete from account");
//db.query("delete from account where user_name=${user}",(err,result)=>{if(err) console.log(err); else console.log(result)});

// db.query("ALTER TABLE owe DROP CONSTRAINT owe_split_id_key",(err,result)=>{if(err) console.log(err); else console.log(result)});

//   db.query("create table \"owe\"( \
//     owe_id serial primary key,\
//     split_id int unique not null, \
//     receiver varchar not null, \
//     money  float not null )",(err,result)=>{if(err){console.log(err);}else{console.log("sucess");}});


//     db.query("create table \"group\"( \
//         group_id serial primary key, \
//            group_name varchar not null, \
//            group_members varchar not null, \
//            group_creator varchar not null)",(err,result)=>{if(err){console.log(err);}else{console.log("sucess");}});

        
//   db.query("create table \"account\" ( \
//     acc_id serial primary key, \
//       user_name varchar not null, \
//       acc_password varchar not null)",(err,result)=>{if(err){console.log(err);}else{console.log("sucess");}});

// db.query("",(err,result)=>{if(err){console.log(err);}else{console.log("sucess");}});
app.listen(port,()=>{
    console.log(`Backend server running in the port ${port}`);
});