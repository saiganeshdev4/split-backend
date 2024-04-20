import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import format from "pg-format";
import axios from "axios";
import cors from "cors";

const app = express();
const port = 4000;
/*
6) // not returing correct time, debug later
*/

const url_for_this_backend="https://split-backend-k1db.onrender.com";

app.use(bodyParser.json());
app.use(express.static("public"));
app.use(cors());

const db = new pg.Client({
    connectionString : "postgres://splitwise_zvtj_user:wX4CDbAlbBl7DYSnxn5xtPjBQJamdQyn@dpg-codtgeol5elc73fu8q60-a.singapore-postgres.render.com/splitwise_zvtj",
    port : 5432,
    ssl: {
        rejectUnauthorized: false // Only if your PostgreSQL instance uses self-signed SSL certificates
      },
  });
  db.connect();

app.listen(port,()=>{
    console.log(`Backend server running in the port ${port}`);
});


app.get("/",(req,res)=>{
    res.json({msg: "hello"});
});

// returns the hashed password for the given user_name
// password check happens in front end :)
// pass user_name as query parameter
app.get("/credentials",async(req,res)=>{

    var user_name= req.query.user_name;
    try{
       const result = await db.query("select acc_password from account where user_name=$1",[user_name]);
       console.log(result.rows);
       if(result.rows.length >0)
       {
        res.json({password:result.rows[0].acc_password});
       }
       else
       {
        res.json({error:"Invalid credentials"}); //user_name is wrong, there is no account with this user_name
       }
    }
    catch(err)
    {
        console.log(err);
    }

});

// updates the password for a particular user
// pass user_name and acc_password in body in json
app.put("/updatePassword",async(req,res)=>{

    var user_name= req.body.user_name;
    var password = req.body.acc_password;
    try{
    const result = await db.query("update account set acc_password=$1 where user_name=$2",[password,user_name]);
    res.json({msg:"password updated sucessfully"});
    }
    catch(err)
    {
        console.log(err);
    }
});

// adds users to the account table
// pass user_name and acc_password in body in json
app.post("/add/user", async (req,res)=>{

    var user_name= req.body.user_name;
    var password = req.body.acc_password;
    try   // check if user_name is already present
    {
       const check= await db.query("select * from account where user_name=$1",[user_name]);
        if(check.rows.length) {
            res.json({msg:"User Already exist"});
        }
        else {   // if user doesn't exist, add the user
            try{
            const result = await db.query("insert into account (user_name,acc_password) values ($1,$2) returning *",[user_name,password]);
            console.log(result.rows);
            res.json(result.rows);
            }
            catch(err)
            {
                console.log(err);
            }
        }
   }
   catch (err)
   {
    console.log(err);
   }
});


// returns all the users with their user_name in the form of List
app.get("/AllUsers", async (req,res)=>{
    try{
    const result = await db.query("select user_name from account");
    var list_of_users=[];
    result.rows.forEach(ele=>{list_of_users.push(ele.user_name)});
    res.json(list_of_users);
    }
    catch(err)
    {
        console.log(err);
    }
    
});

// Returns list of users not present in the group
//pass groupName as path parameter

app.get("/listOfUsersNotPresentInGroup/:groupName",async(req,res)=>{
   try{
          var group_name= req.params.groupName;
          const allUsers = await axios.get(url_for_this_backend+"/AllUsers");
          const existingUsers = await axios.get(url_for_this_backend+`/group/${group_name}`);
          var list_of_users_not_in_grp= allUsers.data.filter(ele => !existingUsers.data.group_members.includes(ele));

          res.json(list_of_users_not_in_grp);
   }
   catch(err)
   {
    console.log(err);
   }
});

// adds a new group
// this assumes that all the users present in group_members are existing users, in the front-end you should show only existing user while creating a group. 
// needs currentUser as path parameter
app.post("/add/group/:currentUser", async(req,res)=>{
    var group_name = req.body.group_name;
    var current_user= req.params.currentUser;
    var group_members = req.body.group_members;  // string which contains user_name (not acc_id) separated by ','  this string doesn't contain currentUser user who created the group
    group_members += ","+current_user;
    
    
    try{
        const check =await db.query("select * from \"group\" where group_name=$1",[group_name]);

        if(check.rows.length)
        {
            res.status(404).json({msg:"Group name already exist"});
        }
        else
        {
            try{
                const result= await db.query("insert into \"group\" (group_name,group_members,group_creator) values ($1,$2,$3) returning *",[group_name,group_members,current_user]);
                res.json(result.rows);
            }
            catch(err)
            {
                console.log(err);
            }
        }
    }
    catch(err)
    {
        console.log(err);
    }
});

// adds new members to the existing group
// pass groupName as path paramter 
app.put("/addMembers/:groupName", async(req,res)=>{
    var group_name=req.params.groupName;
    var users_to_be_added= req.body.group_members;
    try{
         const result1 = await db.query("select group_members from \"group\" where group_name=$1",[group_name]);
         var string_with_grp_member= result1.rows[0].group_members;
         string_with_grp_member+=','+users_to_be_added;

         const result2 = await db.query("update \"group\" set group_members=$1 where group_name=$2",[string_with_grp_member,group_name]);

         res.status(200).json({msg:"Updated sucessfully"});
    }
    catch(err)
    {
        console.log(err);
    }

});

// removes currentUser from the group "groupName"
// IMPORTANT: assumes that currentUser is settled up in the group "groupName" and also assumes that currentUser is present in the group "groupName"
// pass groupName as path parameter, currentUser as query parameter
app.delete("/removeMember/:groupName",async (req,res)=>{
    
    var group_name = req.params.groupName;
    var current_user = req.query.currentUser;
    try{
         var result = await db.query("select * from \"group\" where group_name=$1",[group_name]);
         var list_of_users= result.rows[0].group_members.split(",");

         var list_without_current_user = list_of_users.filter((ele)=>ele!==current_user);
         
         if(list_without_current_user.length){
            var string_with_grp_member =list_without_current_user[0];
            list_without_current_user.forEach((ele,ind)=>{
                if(ind>0)
                string_with_grp_member+=","+ele;
            })
             console.log(string_with_grp_member);
            result = await db.query("update \"group\" set group_members=$1 where group_name=$2",[string_with_grp_member,group_name]);

           
         }
         else
         { // if length of list_without_current_user is 0 means, no one is in the group, now delete the group along with the splits involved in the group.
            

            // deleting in group table
            var result = await db.query("delete from \"group\" where group_name=$1",[group_name]);

            
             // we need split_id involved in group to delete in split,owe tables
             result = await db.query("select split_id from split where group_name=$1",[group_name]);

             var split_ids_to_be_deleted= result.rows.map((ele)=> ele.split_id);

             if(split_ids_to_be_deleted.length)
             {
                // delete in split table
                result = await db.query(format("delete from split where split_id in (%L)",split_ids_to_be_deleted));
                //delete in owe table
                result= await db.query(format("delete from owe where split_id in (%L)",split_ids_to_be_deleted));
             }

         }
         res.status(200).json({msg:"User has been deleted from the group"});
         
    }
    catch(err)
    {
        console.log(err);
    }
});

//returns list of all groups in which current_user is present
// pass current_user as path parameter
app.get("/listOfGroups/:currentUser", async (req,res)=>{

    var current_user= req.params.currentUser;
  var result = await db.query("select group_name,group_members from \"group\" order by group_name asc");

  var list_of_groups=[];
  result.rows.forEach(ele =>{
    ele.group_members.split(",").includes(current_user) && list_of_groups.push(ele.group_name);
  });

  res.json(list_of_groups);

});

// returns All group_name, (How much you owe overall or how much others you owe overall) in that group
// Also returns the groups in which currentUser is present but no splits are added.
// should pass currentUser as path parameter
app.get("/groups/:currentUser",async(req,res)=>{
    try{
        var current_user=req.params.currentUser;
        var result = await axios.get(url_for_this_backend+`/listOfGroups/${current_user}`);

          var groups_info=
          await Promise.all(
            result.data.map(async(group_name) =>{   
                    var {owe_list,money} = await func(current_user,group_name);
                    
                    return {
                    groupName:group_name,
                    msg: owe_list.length ? ((money>0 ? "You are owed " : "You owe ")+Math.abs(money)+" overall") : "You are all settled in this group",
                    owe_list: owe_list.slice(0, Math.min(3,owe_list.length))
                    }
                })
           );
              //sorting by groupName ascending order
         groups_info.sort((a,b)=>{
            if(a.groupName<b.groupName) return -1;
            else if(a.groupName>b.groupName) return 1;
            return 0;
         });

           res.json(groups_info);
    }
    catch(err)
    {
        console.log(err);
    }
});

async function func(current_user,group_name)
{
    var result = await axios.get(url_for_this_backend+`/friends/${current_user}?group=${group_name}`);

    var owe_list = [];
    var money=0;
    result.data.forEach((ele)=>{
        if(ele.money>0)
        {
            owe_list.push(ele.user+" owes you "+ele.money);
            
        }
        else if(ele.money<0)
        {
            owe_list.push("You owe "+ele.user+" "+Math.abs(ele.money));
        }
        money+=parseFloat(ele.money);
    });
    return {owe_list:owe_list,money:money};
}

// return all the splits related to group
// pass group name as path param and current_user as query paramter
app.get("/group/split/:group_name", async(req,res)=>{
    var group_name=req.params.group_name; 
    var current_user = req.query.current_user;
    
    var {owe_list:part_one,money}= await func(current_user,group_name);
    var part_two=[];
    if(part_one.length===0)
    {
        part_one.push("You are all settled up in this group");
    }

    try{
        var result = await db.query("select split_id,split_name,split_time,sender,total_money,money_sender_gets from split where group_name=$1",[group_name]);
        
        var result_map = new Map();
        var split_id_row= result.rows.map((ele)=>(parseInt(ele.split_id)));
        
        if(split_id_row.length)
        {
                result.rows.forEach((ele)=>{
                result_map.set(ele.split_id,{
                    split_name:ele.split_name,
                    split_time:ele.split_time,
                    paid:(ele.sender===current_user ? "You":ele.sender)+" paid "+ele.total_money,
                    msg: (ele.sender===current_user ? "you lent "+ele.money_sender_gets : "")
                })
                });
                result = await db.query(format(`select split_id,receiver,money from owe where receiver='${current_user}' and split_id in (%L)`,split_id_row));
                result.rows.forEach(ele=>{
                
                result_map.set(ele.split_id,
                    {
                    ...result_map.get(ele.split_id),
                    msg:"you owe "+ele.money
                    });  
                });
                var part_two=Array.from(result_map,([split_id,obj])=>{ 
                    return {
                        split_id:split_id,
                        split_time:obj.split_time,
                        split_name:obj.split_name,
                        paid:obj.paid,
                        msg: (obj.msg ? obj.msg : "not involved")
                    }

                });
            part_two.sort((a,b)=>{
                // return +ve, order of a,b will be changed
                // return -ve, order of a,b will be unchanged
                if(a.split_time>b.split_time) return -1;
                else if( a.split_id< b.split_time) return 1;
                return 0; 
            });
        }    
        res.json({
            group_name:group_name,
            part_one: split_id_row.length ? part_one : ["No expenses in this group"],
            part_two:part_two   // if split_id_row.length is 0 then part_two remains [] by default
        })
        
    }
    catch(err)
    {
        console.log(err);
    }
    
});


// return a specific group info
app.get("/group/:group_name",async(req,res)=>{
     try{  // check if the group exists with the given group_id and return group if exists.
           var  group_name = req.params.group_name;
        const result = await db.query("select * from \"group\" where group_name=$1",[group_name]);

             if(result.rows.length)
             {
                res.json({
                group_members: result.rows[0].group_members.split(','),
                group_creator: result.rows[0].group_creator
                }
                );

             }
             else
             {
                res.status(404).json({msg:`group doesn't exist with given id ${group_name}`});
             }
     }
     catch(err)
     {
        console.log(err);
     }
});

// not returing correct time, debug later
function getTime()
{
    var today = new Date();
    return today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate()+' '+today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
}

// edits split for given split_id
// pass split_id as path parameter
app.put("/edit/split/:id", async(req,res)=>{
    var split_id = req.params.id;
    var users_who_involved= req.body.usersList; // string contains user_name seperated by ; SHOULD NOT CONTAIN SENDER
    var money_users_owe= req.body.moneyList;  // string contains money users owe seperated by ; SHOULD NOT CONTAIN MONEY SPEND BY SENDER ON HIMSELF
    var split_name = req.body.split_name;  // string contains the description
    var total_money = req.body.total_money; 

    try{
        // update split table
        
        var MoneyList = money_users_owe.split(';');
        var money_user_gets = MoneyList.reduce((a,b)=> parseFloat(a)+parseFloat(b), 0);
        var UsersList = users_who_involved.split(';');        
        const result = await db.query("update split set split_name=$1,split_time=$2,total_money=$3,money_sender_gets=$4 where split_id=$5",[split_name,getTime(),total_money,money_user_gets,split_id]);

        // delete rows related to split_id in owe table
        await db.query("delete from owe where split_id=$1",[split_id]);
        
        // add entries in owe table
        var rows = UsersList.map((ele,ind)=>{
            var tempList=[];
            tempList.push(split_id);
            tempList.push(ele);
            tempList.push(MoneyList[ind]);
            return tempList;
        });
        
         try{  
             const result = await db.query(format("insert into owe (split_id,receiver,money) values %L returning *",rows));
             res.json(result.rows);
         }
         catch(err)
         {
            console.log(err);
         }
    }
    catch(err)
    {
        console.log(err);
    }

});

// Assumes group_name, user_name and usersList are valid. 
// pass status as path parameter, this should be either new or settle - new means adding new split, - settle means this split is added to settle previously existing split
app.post("/add/split/:status",async(req,res)=>{
    var group_name= req.body.group_name;
    var sender= req.body.sender; // user who paid
    var users_who_involved= req.body.usersList; // string contains user_name seperated by ; SHOULD NOT CONTAIN SENDER
    var money_users_owe= req.body.moneyList;  // string contains money users owe seperated by ; SHOULD NOT CONTAIN MONEY SPEND BY SENDER ON HIMSELF
    var split_name = req.body.split_name;  // string contains the description
    var total_money = req.body.total_money; 
    var is_new = req.params.status === "new";

    // add entry in split table
    try{
        var MoneyList = money_users_owe.split(';');
        var money_user_gets = MoneyList.reduce((a,b)=> parseFloat(a)+parseFloat(b), 0);
        var UsersList = users_who_involved.split(';');        
        const result = await db.query("insert into split (split_name,group_name,split_time,sender,total_money,money_sender_gets,is_new) values ($1,$2,$3,$4,$5,$6,$7) returning *",[split_name,group_name,getTime(),sender,total_money,money_user_gets,is_new]);
        
        var split_id = result.rows[0].split_id;
            
        var rows = UsersList.map((ele,ind)=>{
            var tempList=[];
            tempList.push(split_id);
            tempList.push(ele);
            tempList.push(MoneyList[ind]);
            return tempList;
        });
        
         try{  // add entries in owe table
             const result = await db.query(format("insert into owe (split_id,receiver,money) values %L returning *",rows));
             res.json(result.rows);
         }
         catch(err)
         {
            console.log(err);
         }
        
    }
    catch (err)
    {
        console.log(err);
    }
    
});


// deletes split with given id, assumes that given split_id exists
// split id should be passed as path parameter
app.delete("/delete/split/:id",async(req,res)=>{
      var split_id= req.params.id;

      try{
        // deleting in split table
          var result = await db.query("delete from split where split_id=$1",[split_id]);
        // deleting in owe table
        result= await db.query("delete from owe where split_id=$1",[split_id]);
         res.status(200).json({msg:"deleted successfully"});
      }
      catch(err)
      {
        console.log(err);
      }

});

//returns a specific split,  should pass id as path parameter and current_user as query parameter
app.get("/split/:id",async(req,res)=>{
    try{  // check if split exists with given id, if exits return info
         var split_id= req.params.id;
         var currentUser=req.query.current_user;
         // Below query is same (optimised version)as select * from split inner join owe on split.split_id=owe.split_id where split_id=id
         // 
        const result = await db.query("select * from ((select * from split where split_id=$1) as S \
        inner join\
         (select * from owe where split_id=$2) as W\
          on S.split_id=W.split_id) as temp",[split_id,split_id]);

        if(result.rows.length)
        {    const rows=result.rows;
            var sender = rows[0].sender;
            
            var split_id= rows[0].split_id;
            var is_new = rows[0].is_new;
            var split_name= rows[0].split_name;
            var group_name= rows[0].group_name;
            var thirdLine = "Added by "+ (sender===currentUser ? "you" : sender)+" on "+rows[0].split_time;
            var fourthLine = (sender===currentUser ? "You" : sender) +" paid " + rows[0].total_money;
            var restOfSplit=[{payment:(sender===currentUser ? "You owe " : sender+" owes " )+(parseFloat(rows[0].total_money)-parseFloat(rows[0].money_sender_gets))}];
            rows.forEach((ele)=>{
            restOfSplit.push( {payment:(ele.receiver===currentUser ? "You owe " : ele.receiver+" owes " )+ele.money} );
            });
            res.json({split_id,is_new,split_name,group_name,thirdLine,fourthLine,restOfSplit});
        }
        else
        res.status(404).json({msg:`Split doesn't exist with given id ${split_id}`});
    }
    catch(err)
    {
        console.log(err);
    }
});


  // deletes a particular account  -- used by admin - end user can delete only their own account
  // should pass userName as path parameter
  // assumes that account passed is valid account
app.delete("/delete/account/:userName",async(req,res)=>{
    var user_name = req.params.userName;
    try{
            await db.query("delete from account where user_name=$1",[user_name]);
            res.status(200).json({msg:"Account has been deleted"});
    }
    catch(err)
    {
        console.log(err);
    }
});

// returns how much others owe currentUser , -ve value indicates currentUser owes them.
// pass current_user as path param from front end , group is optional query parameter, if given it will return the above data specific group.
app.get("/friends/:current_user",async (req,res)=>{
        var currentUser= req.params.current_user;
        var add_condition = req.query.group ? "and group_name='"+req.query.group+"'" : "";
        var result = await db.query(`select receiver, sum(money)\
         from split inner join owe on split.split_id=owe.split_id\
          where sender=$1 ${add_condition}\
           group by receiver`,[currentUser]);
    
        var money_others_owe_to_current_user = new Map();
        result.rows.forEach(element => {
            money_others_owe_to_current_user.set(element.receiver,parseFloat(element.sum));
        });

        result = await db.query(`select sender, sum(money)\
         from split inner join owe on split.split_id=owe.split_id\
          where receiver=$1 ${add_condition}\
           group by sender`,[currentUser]);
        
        result.rows.forEach(ele => {
         money_others_owe_to_current_user.set(ele.sender,parseFloat(money_others_owe_to_current_user.get(ele.sender) ? money_others_owe_to_current_user.get(ele.sender) : 0) - parseFloat(ele.sum));
        });

        res.json(Array.from(money_others_owe_to_current_user, ([user, money]) => ({ user, money })));
    });

// returns all the transactions between the current user and friend
// pass current_user and friend as query parameters
app.get("/filterByFriend", async(req,res)=>{
    var currentUser = req.query.current_user;
    var friend = req.query.friend;
    
    var result = await db.query("select split.split_id, sender,receiver,money,total_money,group_name,split_name,split_time\
                                from split inner join owe on split.split_id= owe.split_id \
                                where ((sender=$1 and receiver =$2) or (sender=$2 and receiver=$1)) \
                                order by split_time desc",
                                [currentUser,friend]);

    var modified_result = result.rows.map((ele)=>{
        return {
            split_id : ele.split_id,
            split_name : ele.split_name,
            split_time: ele.split_time,
            firstLine: (ele.sender === currentUser ? "You" : ele.sender) +" paid "+ele.total_money+" in "+ele.group_name ,
            secondLine: "you "+ (ele.sender===currentUser ? "lent ": "borrowed ")+ ele.money

        };
    });
    res.json(modified_result);
});


// returns splits in which user is involved (either as sender or as receiver)
// pass current_user as path paramater
app.get("/activity/:current_user", async(req,res)=>{
    var currentUser= req.params.current_user;
    try{

    // the below query involves 2 queries,
    // 1st for the data where currentUser is receiver
    // 2nd for the data where currentUser is Sender
      var result= await db.query("select * from \
      ( \
        select sender,money,split_name,split.split_id as split_id,split_time,group_name,is_new \
                                 from split inner join owe on split.split_id=owe.split_id where receiver=$1\
        union\
        select sender,money_sender_gets as money,split_name,split_id,split_time,group_name,is_new\
                                     from split \
                                     where sender=$2 \
      )as temp\
      order by split_time desc",[currentUser,currentUser]);
      var activity=result.rows.map((ele)=>{
        var secondLine="";
        if(ele.is_new)
        {
           if(ele.sender===currentUser)
           secondLine="You get back";
           else
           secondLine="You owe";
        }
        else
        {   
            if(ele.sender===currentUser)
            secondLine="You paid";
            else
            secondLine="You received";

        }
        secondLine+=" "+ele.money;
        var firstLine= (ele.sender===currentUser ? "You" : ele.sender)+" added '"+ele.split_name+"' in '"+ele.group_name+"'";
        var split_id=ele.split_id;
        var split_time =ele.split_time;
        return {split_id,firstLine,secondLine,split_time};
      });

      res.json(activity);
    }
    catch(err)
    {   res.sendStatus(500).json({error:"Server side error"});
        console.log(err);
    }
    
});

