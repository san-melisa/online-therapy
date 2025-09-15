const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const ExpertiseSchema = new mongoose.Schema({
    name: { type: String, required: true, unique:true }
    
})

module.exports = mongoose.model('Expertise',ExpertiseSchema)

