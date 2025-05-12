const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/survey-tool',
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/survey-tool', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Connected to MongoDB');
})
.catch(err => console.error('MongoDB connection error:', err));

// Routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// View routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('login');
});

app.get('/signup', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('signup');
});

app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('dashboard'); // You'll need to create this view
});

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
        console.log('Received survey creation request:', JSON.stringify(req.body, null, 2));
        
        // Validate required fields
        if (!req.body.title) {
            console.error('Survey title is missing');
            return res.status(400).json({ error: 'Survey title is required' });
        }
        if (!req.body.questions || !Array.isArray(req.body.questions)) {
            console.error('Questions array is missing or invalid');
            return res.status(400).json({ error: 'Questions must be an array' });
        }
        
        // Validate each question
        req.body.questions.forEach((question, index) => {
            console.log(`Validating question ${index + 1}:`, question);
            if (!question.questionText) {
                throw new Error(`Question ${index + 1} is missing text`);
            }
            if (!question.questionType) {
                throw new Error(`Question ${index + 1} is missing type`);
            }
            if (question.questionType !== 'text' && (!question.options || !Array.isArray(question.options))) {
                throw new Error(`Question ${index + 1} of type ${question.questionType} is missing options array`);
            }
        });
        
        const survey = new Survey(req.body);
        console.log('Created survey object:', JSON.stringify(survey, null, 2));
        
        const savedSurvey = await survey.save();
        console.log('Survey saved successfully:', JSON.stringify(savedSurvey, null, 2));
        
        res.json(savedSurvey);
    } catch (error) {
        console.error('Error creating survey:', error);
        // Send more detailed error message
        res.status(500).json({ 
            error: error.message,
            details: error.stack,
            receivedData: req.body
        });
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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
}); 