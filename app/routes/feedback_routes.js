module.exports = function (app, db) {
    const ObjectId = require('mongodb').ObjectID;
    var moment = require('moment');
    var ntlm = require('express-ntlm');
    var userAlias;
    var ldap = require('ldapjs');
    var parseDN = require('ldapjs').parseDN;
    var userName;
    var managerAlias;
    var managerMembers;
    var managerFullName;
    var aliasManager;
    var pass = '1DAp4C;1x';
    var ldapOptions = {
        url: 'ldap://hqgc.eur.ad.sag',
        port: '3268'
    };
    var managerNameAndAlias = {
        displayName: '',
        alias: ''
    }
    var managerNameAndAliasArray = [];

    app.all('/user', ntlm());
    app.get('/user', function (request, response) {

        userAlias = request.ntlm.UserName;
        // managerFullName = searchLDAPManager(userAlias, function(result){
        //     returnResult(result);
        // });
        response.redirect('http://10.60.98.212:4200/all');
    });

   app.get('/admin', function (request, response) {
       response.redirect('http://10.60.98.212:4200/admin_dashboard');
   });


    const bodyParser = require('body-parser');
    let dbResult = {};

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

        next();
    });




    app.post('/feedback', (req, res) => {

        console.log("HELOOOOOOO" + req.body.type);

        var currentTime = moment().format('YYYY MM DD');
        db.collection('communication').update({ _id: ObjectId(req.body.id) }, { $push: { answer: { user: req.body.user, option: req.body.option, timestamp: currentTime } } }, (err, results) => {
            if (err) {
                res.send('An error has occured');
            } else {
                res.send(results);
            }
        });
    });

    app.post('/submit', (req, res) => {
        var currentTime = moment().format('YYYY MM DD');
        for (let i = 0; i < req.body.givenFeedback.length; i++) {
            db.collection('questions').updateMany({ _id: ObjectId(req.body.givenFeedback[i].userQuestionID) }, { $push: { answer: { user: req.body.givenFeedback[i].userID, answer: req.body.givenFeedback[i].userAnswerID, timestamp: currentTime } } }, (err, results) => {
                if (err) {
                    res.send('An error has occured');
                } else {
                    if (i == req.body.givenFeedback.length - 1) {
                        res.send(results);
                    }

                }
            });
        }

    });

    app.get('/all', (req, res) => {
        db.collection('questions').find({}).toArray(function (err, result) {
            finalResult = {};
            finalResult.question = result;
            if(userAlias) {
                searchLDAP(userAlias, function (data) {
                    finalResult.userInfo = data.personFullName;
                    searchLDAPManager(userAlias, function (manAlias) {
                        finalResult.aliasManager = manAlias;
                        searchLDAP(finalResult.aliasManager, function (manFullName) {
                            finalResult.managerName = manFullName.personFullName;
                            res.send(finalResult);
                        });
                    });
                });
            }
            else {
                res.send(finalResult);
            }
           
            db.close;
        })
    });

     /**
     * Getting all the managers from the group - GCS-India-Management-Team
     */
    app.get('/admin_dashboard', (req, res) => {
            console.log("Inside admin dashboard$$$$$$$$$$$$$$$$$$$$");
            getManagersData(function(data) {
                res.send(data);
            });
            
    });


    app.get('/view/:id', (req, res) => {
        const id = new ObjectId(req.params.id);
        console.log("VIEW PAGE" + id);
        db.collection('communication').find({ _id: ObjectId(id) }, { question: 1 }).toArray(function (err, result) {
            console.log(result);
            res.send(result);
            db.close;
        });
    })

    //Get all the reporting managers
     function getManagersData(callback) {
        var tempAlias;
        var managerAliases = [];
        var allManagersFullNames = [];
        var optsManagers = {
            filter: '(&(objectclass=group)(cn=GCS-India-Management-Team*))',
            scope: 'sub',
            attributes: ['member']
        };

        var clientManagers = ldap.createClient(ldapOptions);

        clientManagers.bind('CN=ldapclix,OU=Generic,OU=Germany,DC=eur,DC=ad,DC=sag', '1DAp4C;1x', err => {
            if (err) {
                console.log(err);
            } else {
            }
        });

        clientManagers.search('OU=India,DC=eur,DC=ad,DC=sag', optsManagers, function (err, managerGroupResponse) {
            console.log(err);
            managerGroupResponse.on('searchEntry', function (entryManager) {
                for (var i = 0; i < entryManager.object.member.length; i++) {
                    managerMembers = parseDN(entryManager.object.member[i]);
                    if (managerMembers.rdns[0].attrs.cn.value != 'GCS-India-CoreManagement-Team') {
                        managerAliases.push(managerMembers.rdns[0].attrs.cn.value);
                    }

                }
                for (var j = 0; j < managerAliases.length; j++) {
                    tempAlias = searchLDAP(managerAliases[j], function(data){
                        allManagersFullNames.push(data);
                        if(managerAliases.length === allManagersFullNames.length) {
                           callback(allManagersFullNames);
                        }
                    });
                    
                }
              
            });
            
            
        })

    }

    // search LDAP for full Name
    function searchLDAP(alias, callback) {
        var aliasName;
        var optsManager = {
            filter: '(&(objectCategory=person)(objectClass=person)(|(SamAccountName=' + alias + ')(cn=' + alias + '})))',
            scope: 'sub',
            attributes: ['displayName', 'manager']
        };


        let clientManager = ldap.createClient(ldapOptions);
        clientManager.bind('CN=ldapclix,OU=Generic,OU=Germany,DC=eur,DC=ad,DC=sag', '1DAp4C;1x', err => {
            if (err) {
                console.log(err);
            } else {
                clientManager.search('OU=User,OU=India,DC=eur,DC=ad,DC=sag', optsManager, function (err, resManager) {
                    resManager.on('searchEntry', function (entryManager) {
                        aliasName = entryManager.object.displayName;
                        fullInfo = {
                            personAlias : alias,
                            personFullName : aliasName
                        }
                        callback(fullInfo);
                    });
                });
            }

        });
    }

    function searchLDAPManager(userAlias, callback) {

        var optsUser = {
            filter: '(&(objectCategory=person)(objectClass=person)(|(SamAccountName=' + userAlias + ')(cn=' + userAlias + '})))',
            scope: 'sub',
            attributes: ['displayName', 'manager']
        };

        let client = ldap.createClient(ldapOptions);

        client.bind('CN=ldapclix,OU=Generic,OU=Germany,DC=eur,DC=ad,DC=sag', '1DAp4C;1x', err => {
            if (err) {
                console.log(err);
            } else {
                console.log('hi');
            }
        });


        client.search('OU=User,OU=India,DC=eur,DC=ad,DC=sag', optsUser, function (err, res) {
            console.log(err);
            res.on('searchEntry', function (entry) {
                userName = entry.object.displayName;
                managerAlias = parseDN(entry.object.manager);
                managerResult = managerAlias.rdns[0].attrs.cn.value;
                callback(managerResult);
            });
        });
    }

    function returnResult(aliasName) {
        console.log('inside final callback' + aliasName);
        return aliasName;
    };
}
