//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

//Require the dev-dependencies
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server');
let should = chai.should();


chai.use(chaiHttp);
//Our parent block
describe('monitor', () => {    
    /*
  * Test the /GET route
  */
  describe('/GET monitors', () => {
    const id = 123
      it('it should post a new monitors', (done) => {
         const monitor =  {
            "id": id,
            "url": "http://localhost/demoPage",
            "displayName": "Display One"
        }
        chai.request(server)
            .post('/host')
            .query(monitor)
            .end((err, res) => {
                res.should.have.status(200);      
                console.log("Testcase! Muhaha")     
                pol();  
              //done();
            });      
        function pol()  {
          chai.request(server)
            .get('/getMail').query({id: 123, limit: 10}).end((err, res) => {
              if(res.status != 200){
                done();
              }
              else{
                pol();
              }
            });
          };
          
      });
  });

});