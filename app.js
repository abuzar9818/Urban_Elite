const express=require('express');
const app=express();
const path=require('path');
const cookieParser=require('cookie-parser');
const db=require('./config/mongoose-connection');
const ownersRouter=require('./routes/ownersRouter');
const usersRouter=require('./routes/usersRouter');
const productsRouter=require('./routes/productsRouter');

app.set("view engine","ejs");
app.use(express.static(path.join(__dirname,'public')));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use('/ownersroute', ownersRouter);
app.use('/usersroute', usersRouter);
app.use('/productsroute', productsRouter);

app.listen(3000);