require('dotenv').config()
const app = require('../server.js')
const mongoose = require('mongoose')
const chai = require('chai')
const chaiHttp = require('chai-http')
const assert = chai.assert

const User = require('../models/user.js')
const Message = require('../models/message.js')

chai.config.includeStack = true

const expect = chai.expect
const should = chai.should()
chai.use(chaiHttp)

/**
 * root level hooks
 */
after((done) => {
  // required because https://github.com/Automattic/mongoose/issues/1251#issuecomment-65793092
  mongoose.models = {}
  mongoose.modelSchemas = {}
  mongoose.connection.close()
  done()
})

const USER_OBJECT_ID = 'abc123abc123'
const MESSAGE_OBJECT_ID = 'aaaaaaaaaaaa'

describe('Message API endpoints', () => {

    // Create 1 user and 1 message
    beforeEach((done) => {
        const sampleUser = new User({
            username: 'testuser1',
            password: 'securepassword1'
        })

        const sampleMessage = new Message({
            title: 'Test Message 1',
            body: 'Test Body 1',
            _id: MESSAGE_OBJECT_ID
        })

        sampleUser.save()
        .then( () => {
            sampleMessage.author = sampleUser
            return sampleMessage.save()
        }).then( () => {
            User.findOneAndUpdate({username: 'testuser1'})
            .then( (user) => {
                user.messages.push(sampleMessage)
                user.save(done)
            })
        })

    })

    afterEach((done) => {
        User.deleteMany( {username: ['testuser1']} )
        .then( () => {
            Message.deleteMany( {title: ['Test Message 1', 'Test Message 2']})
            .then( () => {
                console.log('Users and messages wiped.')
                done()
            }).catch( err => {return 'Error deleting 1 user and 2 messages.'})
        })
    })

    it('should load all messages', (done) => {
        Message.find()
        .then( (messagesBeforeViewing) => {
            chai.request(app)
            .get('/messages')
            .end( (err, res) => {
                if (err) {
                    done(err)
                } else {
                    expect(res).to.have.status(200)
                    expect(res.body.allMessages).to.be.an('array')
                    expect(res.body.allMessages.length).to.be.equal(messagesBeforeViewing.length)
                    done()
                }
            })
        })
    })

    it('should get one specific message', (done) => {
        Message.findOne({title: 'Test Message 1'})
        .then( (message) => {
            chai.request(app)
            .get(`/messages/${message._id}`)
            .end( (err, res) => {
                if (err) {
                    done(err)
                } else {
                    expect(res.body.title).to.be.deep.equal('Test Message 1')
                    expect(res.body.body).to.be.deep.equal('Test Body 1')
                    done()
                }
            })
        }).catch( err => {
            throw err.message
        })
    })

    it('should post a new message', (done) => {
        User.findOne({username: 'testuser1'})
        .then( (user) => {
            chai.request(app)
            .post(`/messages`)
            .send({
                title: 'Test Message 2',
                body: 'Test Body 2',
                author: user
            })
            .end( (err, res) => {
                if (err) {
                    done(err)
                } else {
                    expect(res.body.title).to.be.deep.equal('Test Message 2')
                    expect(res.body.body).to.be.deep.equal('Test Body 2')
                    expect(res.body.author).to.be.equal(`${user._id}`)

                    Message.findOne({title: 'Test Message 2'})
                    .then( (message) => {
                        expect(message).to.be.an('object')
                        done()
                    })
                }
            })
        }).catch(err => {
            throw err.message
        })

    })

    it('should update a message', (done) => {
        Message.findOne({title: 'Test Message 1'})
        .then( (message) => {
            chai.request(app)
            .put(`/messages/${message._id}`)
            .send({title: 'Test Message 1 Updated'})
            .end( (err, res) => {
                if (err) { done(err) }
                expect(res.body.selectedMessage.title).to.be.deep.equal('Test Message 1 Updated')
                expect(res.body.selectedMessage).to.have.property('title', 'Test Message 1 Updated')
                
                Message.findOne({title: 'Test Message 1 Updated'})
                .then( (message) => {
                    expect(message.title).to.be.deep.equal('Test Message 1 Updated')
                    done()
                })
            })
        })
    })

    it('should delete a message', (done) => {

        Message.findOne({title: 'Test Message 1'})
        .then( (message) => {
            chai.request(app)
            .delete(`/messages/${message._id}`)
            .end( (err, res) => {
                if (err) {done(err)}
                expect(res.body.message).to.be.deep.equal('Message was deleted.')
                expect(res.body).to.have.property('_id')
                done()
            })
        }).catch( err => {
            throw err.message
        })
    })
})
