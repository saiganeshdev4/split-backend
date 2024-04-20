
--split table
create table "split"(
    split_id serial primary key,
    split_name varchar not null,  -- description
	group_name varchar not null,
    split_time varchar not null,  -- time when the split is added
	sender varchar not null,   -- user who added the split
    total_money float not null,  -- total money paid by user_name
    money_sender_gets float not null,
    is_new boolean not null          -- if Isnew is true, it means it is a new split, if false, this split it added to settle previously existing split
);

create table "owe"(
    owe_id serial primary key,
    split_id int not null,
    receiver varchar not null,
    money  float not null
);

-- group table
create table "group"(
 group_id serial primary key,
	group_name varchar not null,
	group_members varchar not null,  -- string which contains user_name (not acc_id) separated by , 
    group_creator varchar not null
);

-- account table
create table "account" (
acc_id serial primary key,
  user_name varchar not null,
  acc_password varchar not null,
   -- email_id varchar not null
);