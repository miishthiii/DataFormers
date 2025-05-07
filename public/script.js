let questionCount = 0;

function addQuestion() {
    const questionsContainer = document.getElementById('questionsContainer');
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';
    questionDiv.innerHTML = `
        <div class="form-group">
            <label>Question ${questionCount + 1}:</label>
            <input type="text" class="question-text" required>
        </div>
        <div class="form-group">
            <label>Question Type:</label>
            <select class="question-type" onchange="handleQuestionTypeChange(this)">
                <option value="text">Text</option>
                <option value="multiple">Multiple Choice</option>
            </select>
        </div>
        <div class="options-container" style="display: none;">
            <div class="form-group">
                <label>Options (one per line):</label>
                <textarea class="question-options"></textarea>
            </div>
        </div>
    `;
    questionsContainer.appendChild(questionDiv);
    questionCount++;
}

function handleQuestionTypeChange(select) {
    const optionsContainer = select.parentElement.nextElementSibling;
    optionsContainer.style.display = select.value === 'multiple' ? 'block' : 'none';
}

function takeSurvey(surveyId) {
    window.location.href = `/survey?id=${surveyId}`;
}

function copyShareableLink(link) {
    navigator.clipboard.writeText(`${window.location.origin}/survey?link=${link}`)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Error copying link:', err));
}

document.getElementById('surveyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('surveyTitle').value;
    const description = document.getElementById('surveyDescription').value;
    const questions = [];
    
    document.querySelectorAll('.question').forEach(questionDiv => {
        const questionText = questionDiv.querySelector('.question-text').value;
        const questionType = questionDiv.querySelector('.question-type').value;
        const options = questionDiv.querySelector('.question-options')?.value.split('\n').filter(opt => opt.trim()) || [];
        
        questions.push({
            questionText,
            questionType,
            options
        });
    });
    
    const survey = {
        title,
        description,
        questions
    };
    
    try {
        const response = await fetch('/api/surveys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(survey)
        });
        
        if (response.ok) {
            alert('Survey created successfully!');
            document.getElementById('surveyForm').reset();
            document.getElementById('questionsContainer').innerHTML = '';
            questionCount = 0;
            loadSurveys();
        } else {
            const errorData = await response.json();
            alert('Error creating survey: ' + errorData.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating survey: ' + error.message);
    }
});

async function loadSurveys() {
    try {
        const response = await fetch('/api/surveys');
        const surveys = await response.json();
        
        const surveysList = document.getElementById('surveysList');
        surveysList.innerHTML = '';
        
        surveys.forEach(survey => {
            const surveyCard = document.createElement('div');
            surveyCard.className = 'survey-card';
            surveyCard.innerHTML = `
                <h3>${survey.title}</h3>
                <p>${survey.description}</p>
                <p>Questions: ${survey.questions.length}</p>
                <div class="survey-actions">
                    <button onclick="takeSurvey('${survey._id}')">Take Survey</button>
                    <button onclick="copyShareableLink('${survey.shareableLink}')">Copy Shareable Link</button>
                </div>
            `;
            surveysList.appendChild(surveyCard);
        });
    } catch (error) {
        console.error('Error:', error);
        alert('Error loading surveys: ' + error.message);
    }
}

// Load surveys when the page loads
document.addEventListener('DOMContentLoaded', loadSurveys); 