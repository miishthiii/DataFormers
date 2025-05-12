let questionCount = 0;

function addQuestion() {
    const questionsContainer = document.getElementById('questionsContainer');
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';
    questionDiv.innerHTML = `
        <div class="question-header">
            <label>Question ${questionCount + 1}:</label>
            <button type="button" class="delete-btn" onclick="deleteQuestion(this)" title="Delete Question">×</button>
        </div>
        <div class="form-group">
            <input type="text" class="question-text" required>
        </div>
        <div class="form-group">
            <label>Question Type:</label>
            <select class="question-type" onchange="handleQuestionTypeChange(this)">
                <option value="text">Text</option>
                <option value="single">Single Choice</option>
                <option value="multiple">Multiple Choice</option>
            </select>
        </div>
        <div class="options-container" style="display: none;">
            <div class="options-header">
                <label>Options:</label>
                <button type="button" class="add-option-btn" onclick="addOption(this)" title="Add Option">+ Add Option</button>
            </div>
            <div class="options-list">
                <div class="option-item">
                    <input type="text" class="option-text">
                    <button type="button" class="delete-btn" onclick="deleteOption(this)" title="Delete Option">×</button>
                </div>
            </div>
        </div>
    `;
    questionsContainer.appendChild(questionDiv);
    questionCount++;
}

function deleteQuestion(button) {
    const questionDiv = button.closest('.question');
    questionDiv.remove();
    // Update question numbers
    document.querySelectorAll('.question').forEach((q, index) => {
        q.querySelector('.question-header label').textContent = `Question ${index + 1}:`;
    });
    questionCount--;
}

function addOption(button) {
    const optionsList = button.closest('.options-container').querySelector('.options-list');
    const questionType = button.closest('.question').querySelector('.question-type').value;
    const optionItem = document.createElement('div');
    optionItem.className = 'option-item';
    optionItem.innerHTML = `
        <input type="text" class="option-text" ${questionType !== 'text' ? 'required' : ''}>
        <button type="button" class="delete-btn" onclick="deleteOption(this)" title="Delete Option">×</button>
    `;
    optionsList.appendChild(optionItem);
}

function deleteOption(button) {
    const optionsList = button.closest('.options-list');
    const optionItem = button.closest('.option-item');
    // Don't delete if it's the last option
    if (optionsList.children.length > 1) {
        optionItem.remove();
    } else {
        alert('A question must have at least one option');
    }
}

function handleQuestionTypeChange(select) {
    const optionsContainer = select.parentElement.nextElementSibling;
    const optionInputs = optionsContainer.querySelectorAll('.option-text');
    
    if (select.value === 'multiple' || select.value === 'single') {
        optionsContainer.style.display = 'block';
        // Add required attribute to option inputs for multiple/single choice
        optionInputs.forEach(input => {
            input.setAttribute('required', '');
        });
    } else {
        optionsContainer.style.display = 'none';
        // Remove required attribute from option inputs for text questions
        optionInputs.forEach(input => {
            input.removeAttribute('required');
        });
    }
}

function takeSurvey(surveyId) {
    window.location.href = `/survey.html?id=${surveyId}`;
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
    
    console.log('Starting survey creation...');
    console.log('Title:', title);
    console.log('Description:', description);
    
    // Check if there are any questions
    const questionElements = document.querySelectorAll('.question');
    console.log('Number of questions found:', questionElements.length);
    
    if (questionElements.length === 0) {
        alert('Please add at least one question to the survey');
        return;
    }
    
    questionElements.forEach((questionDiv, index) => {
        const questionText = questionDiv.querySelector('.question-text').value;
        const questionType = questionDiv.querySelector('.question-type').value;
        
        // Specific logging for text questions
        if (questionType === 'text') {
            console.log('Found text question:', {
                index: index + 1,
                text: questionText,
                type: questionType,
                element: questionDiv.outerHTML
            });
        }
        
        console.log(`Processing question ${index + 1}:`, {
            questionText,
            questionType,
            element: questionDiv
        });
        
        // For text questions, ensure we're not trying to get options
        let options = [];
        if (questionType === 'multiple' || questionType === 'single') {
            options = Array.from(questionDiv.querySelectorAll('.option-text'))
                .map(input => input.value.trim())
                .filter(opt => opt);
        }
        
        console.log(`Question ${index + 1} options:`, options);
        
        const question = {
            questionText,
            questionType,
            options
        };
        console.log(`Final question ${index + 1} object:`, question);
        
        questions.push(question);
    });
    
    const survey = {
        title,
        description,
        questions
    };
    
    console.log('Final survey object to submit:', JSON.stringify(survey, null, 2));
    
    try {
        console.log('Sending survey to server...');
        const response = await fetch('/api/surveys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(survey)
        });
        
        console.log('Server response status:', response.status);
        const responseData = await response.json();
        console.log('Server response data:', responseData);
        
        if (response.ok) {
            alert('Survey created successfully!');
            document.getElementById('surveyForm').reset();
            document.getElementById('questionsContainer').innerHTML = '';
            questionCount = 0;
            loadSurveys();
        } else {
            console.error('Server returned error:', responseData);
            alert('Error creating survey: ' + (responseData.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error creating survey:', error);
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

// Add some CSS styles
const style = document.createElement('style');
style.textContent = `
    .question {
        border: 1px solid #ddd;
        padding: 15px;
        margin-bottom: 15px;
        border-radius: 4px;
        background: #f9f9f9;
    }
    .question-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    .delete-btn {
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
    }
    .delete-btn:hover {
        background: #cc0000;
    }
    .options-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    .add-option-btn {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
    }
    .add-option-btn:hover {
        background: #45a049;
    }
    .option-item {
        display: flex;
        gap: 10px;
        margin-bottom: 5px;
    }
    .option-item input {
        flex: 1;
    }
`;
document.head.appendChild(style); 