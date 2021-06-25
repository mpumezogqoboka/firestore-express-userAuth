const express = require('express');
const app = express();
const path = require('path');
const bodyparser = require('body-parser')
const { body, validationResult } = require('express-validator');
// Firebase configurations
const admin = require('firebase-admin');
const secretKeys = require('./permission.json');
const { allowedNodeEnvironmentFlags } = require('process');

admin.initializeApp({
    credential: admin.credential.cert(secretKeys)
})


// // Firestore and Authentication
const firestore = admin.firestore();
const auth = admin.auth();

app.set('port', process.env.port || 4000) 
app.use(bodyparser.json());


app.get('/', (req, res) => {
    const teamName = "Developed by Tech Express"
    res.send(`<h1>Firebase and Express <br/> ${teamName}<h1>`);
})

//get all users
app.get('/users', (req, res, next) => {
    const response = [];
    firestore.collection('users').get().then(users => {
        users.forEach(user => {
            response.push({ id: user.id, ...user.data() })
        })
        return res.send(response)
    }).catch(error => {
        return res.status(500).send(error.message);
    })
})
//get user by ID
app.get('/users/:id', function(req, res, next){
    const id = req.params.id;
        firestore.collection('users').doc(id).get().then(item => {
                const response ={
                    id: item.id,
                ...item.data()}

                if(response.email){
                    res.status(200).send(response)
                }else{
                    res.status(500).send('user does not exist')
                }
            
        })
})

// Post  method with Custom Claims
// when posting with postman use admin
app.post('/register', (req, res, next) => {
    const user = req.body
    auth.createUser(user).then(userdata => {
        firestore.collection('users').doc(userdata.uid).
        set({name:user.name,
            email:user.email,
            admin:user.admin}).then(()=>{
            if (user.admin){
                auth.setCustomUserClaims(userdata.uid,{admin:true}).then(() => {
                    res.send('Admin is created')
                }).catch(error=>{
                    return res.status(500).send(error.message);})
            }
            else if(user.admin===undefined || !user.admin){
                auth.setCustomUserClaims(userdata.uid, {admin: false}).then(() => {
                    res.send('User is created')})
            }
        }).catch(error=> {
                return res.status(500).send(error.message);})
    }).catch(error => {
        return res.status(500).send(error.message);})
})

//Post users using authentication and validation
const userCreationValidators = [
    body('email').isEmail().withMessage("Email is invalid!"),
    body('password').isLength({min: 5}).withMessage("password should contain more than five characters")
   ];
   app.post("/create", userCreationValidators, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
     return res.status(400).json({ errors: errors.array() });
    }
    const user = req.body
        auth.createUser(user).then(userdata => {
          firestore.collection('Users').doc(userdata.uid).set({name:user.name,email:user.email}).then(()=>{
              res.status(200).send('user is created');
          }).catch(error => {
        return res.status(500).send(error.message);
    })
        }).catch(error => {
            return res.status(500).send(error.message);
        })
    })

// Delete Method
app.delete('/users/:id', function(req, res, next){
    const id = req.params.id;
    if(id===undefined){
        res.status(500).send('User is not defined')
    }
    else{
        auth.deleteUser(id).then(()=>{
            firestore.collection('users').doc(id).delete().then(user=>{
                res.status(200).send('user has been deleted')
            })
        })
        
    }
    
})

//Update users
app.put('/users/:id', function(req, res, next){
    const id = req.params.id;
    const users = req.body;
    if (id === undefined && users === undefined) {
        res.status(500).send('User is not defined')
    } else {
            firestore.collection('users').doc(id).update(users).then(response => {
                res.status(200).send('Users have been updated')

        })
    }
})
// add new skill to user
// add skills
// updating users with skills
app.put('/skills/:id',(req,res,next)=>{
    const id = req.params.id;
    const skills=req.body;
if (id ===undefined && skills ===undefined){
    res.status(500).send("the id/name of the user entered is incorrect")
}else{
    firestore.collection('skills').doc(id).update(skills).then(response =>{
        res.status(200).send('skill has been updated')
})
}
})

//Delete skill by ID
app.delete('/skills/:id', (req, res, next)=>{
    const id = req.params.id;
    if (id === undefined) {
        res.status(500).send('Skills not defined')
    } else {
        firestore.collection('skills').doc(id).delete().then(response =>{
            res.status(200).send('Skill has been deleted');
        })
    }
})

// 
app.listen(app.get('port'), server =>{
    console.info(`Server listen on port ${app.get('port')}`);
})
