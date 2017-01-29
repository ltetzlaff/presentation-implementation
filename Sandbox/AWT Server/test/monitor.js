//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

//Require the dev-dependencies
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../app');
let should = chai.should();


chai.use(chaiHttp);
//Our parent block
describe('monitor', () => {    
    /*
  * Test the /GET route
  */
  describe('/GET monitors', () => {
      it('it should GET one monitor', (done) => {
        chai.request(server)
            .get('/api/monitor')
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(1);
              done();
            });
      });
  });

  describe('/Post monitor', () => {
      const id = 111
      it('it should post a new monitors', (done) => {
         const monitor =  {
            "id": id,
            "name": "lobby",
            "used": false
        }
        chai.request(server)
            .post('/api/monitor')
            .send(monitor)
            .end((err, res) => {
                res.should.have.status(200);             
              done();
            });
      });
      it('it should GET two monitors with id 111 and 123', (done) => {
        chai.request(server)
            .get('/api/monitor')
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(2);
                res.body[0].should.be.a('object');
                res.body[0].should.have.property('id').eql(123);         
                res.body[1].should.be.a('object');
                res.body[1].should.have.property('id').eql(id);         
              done();
            });
      });
      it('it delete one monitor', (done) => {
        chai.request(server)
            .del('/api/monitor/' + id)
            .end((err, res) => {
                res.should.have.status(200);                
              done();
            });
      });
      it('it should GET one monitors', (done) => {
        chai.request(server)
            .get('/api/monitor')
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body[0].should.be.a('object');
                res.body[0].should.have.property('id').eql(123);                
                res.body.length.should.be.eql(1);
              done();
            });
      });
  });

});