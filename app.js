const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));


mongoose.connect('mongodb://127.0.0.1:27017/survey-tool', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Connected to MongoDB');
  
    mongoose.connection.db.collection('surveys').drop()
        .then(() => console.log('Surveys collection dropped'))
        .catch(err => {
            if (err.code === 26) {
                console.log('Surveys collection does not exist');
            } else {
                console.error('Error dropping surveys collection:', err);
            }
        });
})
.catch(err => console.error('MongoDB connection error:', err));


function generateShareableLink() {
    return crypto.randomBytes(6).toString('hex');
}


const surveySchema = new mongoose.Schema({
    title: String,
    description: String,
    questions: [{
        questionText: String,
        questionType: String,
        options: [String]
    }],
    shareableLink: {
        type: String,
        unique: true,
        default: generateShareableLink
    },
    createdAt: { type: Date, default: Date.now }
});

const SurveyModel = mongoose.model('Survey', surveySchema);


const responseSchema = new mongoose.Schema({
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey' },
    responses: { 
        type: Map, 
        of: mongoose.Schema.Types.Mixed 
    },
    submittedAt: { type: Date, default: Date.now }
});

const ResponseModel = mongoose.model('Response', responseSchema);


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/survey', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'survey.html'));
});

app.get('/responses', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'responses.html'));
});


class Model {
    constructor(data) {
        this.createdAt = new Date();
        Object.assign(this, data);
    }

    validate() {
        throw new Error('validate() must be implemented by child class');
    }

    async save() {
        this.validate();
        throw new Error('save() must be implemented by child class');
    }
}

class Survey extends Model {
    constructor(data) {
        super(data);
        this.shareableLink = generateShareableLink();
    }

    validate() {
        if (!this.title) throw new Error('Survey title is required');
        if (!this.questions || !Array.isArray(this.questions)) {
            throw new Error('Questions must be an array');
        }
        return true;
    }

    async save() {
        this.validate();
        const survey = new SurveyModel(this);
        return await survey.save();
    }

    static async findById(id) {
        return await SurveyModel.findById(id);
    }

    static async findByLink(link) {
        return await SurveyModel.findOne({ shareableLink: link });
    }
}

class SurveyResponse extends Model {
    constructor(surveyId, responses) {
        super({ surveyId, responses });
    }

    validate() {
        if (!this.surveyId) throw new Error('Survey ID is required');
        if (!this.responses) throw new Error('Responses are required');
        return true;
    }

    async save() {
        this.validate();
        const response = new ResponseModel(this);
        return await response.save();
    }

    static async findBySurveyId(surveyId) {
        return await ResponseModel.find({ surveyId });
    }
}


app.post('/api/surveys', async (req, res) => {
    try {
        const survey = new Survey(req.body);
        const savedSurvey = await survey.save();
        res.json(savedSurvey);
    } catch (error) {
        console.error('Error creating survey:', error);
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/surveys', async (req, res) => {
    try {
        const surveys = await SurveyModel.find();
        res.json(surveys);
    } catch (error) {
        console.error('Error fetching surveys:', error);
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/surveys/:id', async (req, res) => {
    try {
        const survey = await SurveyModel.findById(req.params.id);
        if (!survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }
        res.json(survey);
    } catch (error) {
        console.error('Error fetching survey:', error);
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/surveys/link/:link', async (req, res) => {
    try {
        const survey = await SurveyModel.findOne({ shareableLink: req.params.link });
        if (!survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }
        res.json(survey);
    } catch (error) {
        console.error('Error fetching survey:', error);
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/surveys/:surveyId/responses', async (req, res) => {
    try {
        const { surveyId } = req.params;
        const { responses } = req.body;
        
        const survey = await Survey.findById(surveyId);
        if (!survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }
        
        const surveyResponse = new SurveyResponse(surveyId, responses);
        const savedResponse = await surveyResponse.save();
        
        res.status(201).json(savedResponse);
    } catch (error) {
        console.error('Error submitting response:', error);
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/surveys/:surveyId/responses', async (req, res) => {
    try {
        const { surveyId } = req.params;
        const responses = await ResponseModel.find({ surveyId });
        res.json(responses);
    } catch (error) {
        console.error('Error fetching responses:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 