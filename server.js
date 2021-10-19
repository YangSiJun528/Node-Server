const express = require('express');
const app = express();
app.use(express.urlencoded({extended: true})) 
const MongoClient = require('mongodb').MongoClient;
app.set('view engine', 'ejs');
app.use('/public', express.static('public'))
const methodOverride = require('method-override')
app.use(methodOverride('_method'))

const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session()); 

let db;

require('dotenv').config()

MongoClient.connect(process.env.DB_URL, function(에러, client){
  if (에러) return console.log(에러);

  db = client.db('todoapp');

  app.listen(process.env.PORT, function() {
    console.log(`listening on ${process.env.PORT}`)
  });
})

app.get('/list', function(요청, 응답) { 
  db.collection('post').find().toArray((에러,결과)=>{
    console.log(결과);
    응답.render('list.ejs',{ posts : 결과 });
  });
  
});

app.get('/write', function(요청, 응답) { 
  응답.render('write.ejs');
});





app.get('/detail/:id', function(요청, 응답){
  db.collection('post').findOne({ _id : parseInt(요청.params.id) }, function(에러, 결과){
    응답.render('detail.ejs', { data : 결과 })
  })
});

app.get('/edit/:id', function(요청, 응답){
  db.collection('post').findOne({ _id : parseInt(요청.params.id) }, function(에러, 결과){
    console.log(결과)
    응답.render('edit.ejs', { post : 결과 })
  })
});

app.put('/edit', function(요청, 응답){
  db.collection('post').updateOne({ _id : parseInt(요청.body.id) }, {$set : { title : 요청.body.title, details : 요청.body.details, }}, function(에러, 결과){
    console.log(결과)
  })
  응답.redirect('/');
});

app.get('/login', function(요청, 응답){
  응답.render('login.ejs')
});

app.post('/login', passport.authenticate('local', {failureRedirect : '/fail'}), function(요청, 응답){
  응답.redirect('/')
});

// deserializeUser에서 보낸 값은 HTTPrequest로 보내져 res.user에서 찾을 수 있음
app.get('/mypage', 로그인했니, function (요청, 응답) {
  console.log(요청.user);
  응답.render('mypage.ejs', { 사용자: 요청.user })
})

function 로그인했니(요청, 응답, next) {
  if (요청.user) {
    next()
  } else {
    응답.send('로그인안하셨는데요?')
  }
}

app.get('/logout', function(요청, 응답) { 
  요청.logout();
  응답.redirect('/');
});

app.get('/search', (요청, 응답)=>{
  let 검색조건 = [
    {
      $search: {
        index: 'titleSearch',
        text: {
          query: 요청.query.value,
          path: 'title'  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        }
      }
    },
    { $sort : { _id : 1 } },
//    { $text : { $search: 요청.query.value }}
//    { $limit : 10 },
//    { $project : { title : 1, _id : 0 } }
  ] 
  console.log(요청.query);
  db.collection('post').aggregate(검색조건).toArray((에러,결과)=>{
    console.log(결과)
    응답.render('search.ejs',{ posts: 결과 });
  })
})







passport.use(new LocalStrategy({
  usernameField: 'id',
  passwordField: 'pw',
  session: true,
  passReqToCallback: false,
}, function (입력한아이디, 입력한비번, done) {
  //console.log(입력한아이디, 입력한비번);
  db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
    if (에러) return done(에러)

    if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
    if (입력한비번 == 결과.password) {
      return done(null, 결과)
    } else {
      return done(null, false, { message: '비번틀렸어요' })
    }
  })
}));


// 위의 결과를 받아서 id 값으로 세션을 만들고 쿠키로 웹에 전송
passport.serializeUser(function (user, done) {
  done(null, user.id)
});

// 세션이 생긴 이후 사이트가 이동 할때 마다 실행되는데 세션 정보에 포함된 id 값으로 DB에 있는 유저의 정보를 보냄
passport.deserializeUser(function (아이디, done) {
  db.collection('login').findOne({ id : 아이디 },( 에러,결과 ) => {
    done(null,결과)
  })
  
}); 

app.post('/add', function(요청, 응답) { 
  db.collection('counter').findOne({name : '게시물갯수'},(에러,결과)=>{
    console.log(결과.totalPost)
    let 개시물갯수 = 결과.totalPost
    let post = {_id: 개시물갯수+1, title : 요청.body.todo, details: 요청.body.details, date : Date.now(), author : 요청.user._id}
    db.collection('post').insertOne(  post, function(에러, 결과){
      db.collection('counter').updateOne({name : '게시물갯수'},{ $inc : { totalPost : 1 }},(에러,결과)=>{})
    });
  })
  응답.redirect('/');
});

app.delete('/delete', function(요청, 응답){
  요청.body._id = parseInt(요청.body._id)
  console.log(요청.body)
  console.log(`유저 ${요청.user._id}}`)
  db.collection('post').deleteOne({_id : 요청.body._id, 작성자 : 요청.user._id }, function(에러, 결과){
    console.log('삭제완료')
  })
  응답.send('삭제완료')
});

app.post('/register', function (요청, 응답) {
  db.collection('login').insertOne({ id: 요청.body.id, pw: 요청.body.pw }, function (에러, 결과) {
    응답.redirect('/')
  })
})

app.get('/', function(요청, 응답) { 
  응답.render('index.ejs');
});