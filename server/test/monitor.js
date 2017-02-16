//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

//Require the dev-dependencies
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server');
let should = chai.should();

var Browser = require('zombie');

chai.use(chaiHttp);
//Our parent block
describe('monitor', () => {    
    /*
  * Test the /GET route
  */

  describe('Host', function() {
    before(function() {
      this.server = http.createServer(app).listen(3000);
      // initialize the browser using the same port as the test application
      this.browser = new Browser({ site: 'http://localhost' });
    });
    // load the  receiver page
    before(function(done) {
      this.browser.visit('/receiver', done);
    });
    },
  describe('/GET monitors', () => {
    
      it('it should post a new monitors', () => {
         const monitor =  {
            "id": 123,
            "url": "http://localhost/demoPage",
            "displayName": "Display One"
        }
        const controller =  {
            "id": 123,            
            "name": "Controller One",
            "type": "message",
            "msg" : {"message": "ich bin Controller 1"}
        }
        
        chai.request(server)
            .post('/host')
            .query(monitor)
            .end((err, res) => {
                res.should.have.status(200);      
                console.log("Monitor setup")     
                chai.request(server)
                  .post('/join')
                  .query(controller)
                  .end((err, res) => {
                      res.should.have.status(200);      
                      console.log("Controler setup")     
                      pol();
                       
                  });  
              //done();
            });      
        function pol()  {
          chai.request(server)
            .get('/getMail').query({id: 123, limit: 10}).end((err, res) => {
              if(err){
                pol();
              }
              else if(res.status != 200)
              {
                return;
              }
              else{
                pol();
                console.log(res.body);
              }
            });
          };
          //done();
          
      });
      it("End Test", (done) => {
         // done() // if you wanna keep the server running, just don't call done();
      });
  });

});